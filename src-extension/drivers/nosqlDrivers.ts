import {
  LiveConnectionConfig,
  LiveDatabaseDriver,
  LiveQueryResult,
  LiveSchemaTable,
  LiveTestResult,
  buildRowsQueryResult,
  loadOptionalDriver,
} from './types';

function buildMongoUri(config: LiveConnectionConfig, password: string): string {
  const auth = config.username
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(password)}@`
    : '';
  const dbPath = encodeURIComponent(config.database || 'admin');
  return `mongodb://${auth}${config.host}:${config.port}/${dbPath}`;
}

async function withMongoClient<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (db: any) => Promise<T>
): Promise<T> {
  const { MongoClient } = loadOptionalDriver('mongodb');
  const client = new MongoClient(buildMongoUri(config, password), {
    serverSelectionTimeoutMS: config.timeoutMs ?? 10000,
    tls: config.ssl,
    tlsAllowInvalidCertificates: config.ssl && !config.rejectUnauthorized,
  });
  await client.connect();
  try {
    return await fn(client.db(config.database || 'admin'));
  } finally {
    await client.close().catch(() => {});
  }
}

export const mongodbDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const version = await withMongoClient(config, password, async (db) => {
      const info = await db.command({ buildInfo: 1 });
      return `MongoDB ${String(info?.version ?? '')}`.trim();
    });
    const latencyMs = +(performance.now() - start).toFixed(1);
    return { success: true, latencyMs, version, message: `Connected to ${version} (${latencyMs}ms).` };
  },

  async executeQuery(config, password, query): Promise<LiveQueryResult> {
    const start = performance.now();
    return withMongoClient(config, password, async (db) => {
      const trimmed = query.trim();
      const commandObj = trimmed.startsWith('{') ? JSON.parse(trimmed) : { ping: 1 };
      const res = await db.command(commandObj);
      const rows = [res as Record<string, unknown>];
      return buildRowsQueryResult(query, Object.keys(res), rows, start);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withMongoClient(config, password, async (db) => {
      const collections = await db.listCollections().toArray();
      return collections.map((col: any) => ({
        name: String(col.name),
        schema: config.database || 'admin',
        rowCount: 0,
        columns: [{ name: '_id', type: 'ObjectId', nullable: false, primaryKey: true }],
      }));
    });
  },
};

async function withRedisClient<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (client: any) => Promise<T>
): Promise<T> {
  const Redis = loadOptionalDriver('ioredis');
  const client = new Redis({
    host: config.host,
    port: config.port,
    username: config.username || undefined,
    password: password || undefined,
    tls: config.ssl ? { rejectUnauthorized: config.rejectUnauthorized } : undefined,
    connectTimeout: config.timeoutMs ?? 10000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.quit().catch(() => client.disconnect());
  }
}

export const redisDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const pong = await withRedisClient(config, password, (client) => client.ping());
    const latencyMs = +(performance.now() - start).toFixed(1);
    return {
      success: true,
      latencyMs,
      version: `Redis (${String(pong)})`,
      message: `Connected to Redis (${latencyMs}ms).`,
    };
  },

  async executeQuery(config, password, query): Promise<LiveQueryResult> {
    const start = performance.now();
    return withRedisClient(config, password, async (client) => {
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      const [cmd, ...args] = tokens.length > 0 ? tokens : ['PING'];
      const result = await client.call(cmd, ...args);
      const rows = Array.isArray(result)
        ? result.map((val, idx) => ({ index: idx, value: val }))
        : [{ result }];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : ['result'];
      return buildRowsQueryResult(query, columns, rows, start);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withRedisClient(config, password, async (client) => {
      const dbSize = Number(await client.dbsize());
      return [
        {
          name: 'keyspace',
          schema: 'db0',
          rowCount: dbSize,
          columns: [
            { name: 'key', type: 'STRING', nullable: false, primaryKey: true },
            { name: 'value', type: 'ANY', nullable: true, primaryKey: false },
          ],
        },
      ];
    });
  },
};
