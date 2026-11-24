import * as https from 'https';
import {
  LiveConnectionConfig,
  LiveDatabaseDriver,
  LiveQueryResult,
  LiveSchemaTable,
  LiveTestResult,
  buildRowsQueryResult,
  loadOptionalDriver,
  sanitizeErrorMessage,
} from './types';

function groupSchemaRows(
  rows: Array<{ table_name: string; column_name: string; data_type: string; is_nullable?: string }>,
  schemaName?: string
): LiveSchemaTable[] {
  const byTable = new Map<string, LiveSchemaTable>();
  for (const r of rows) {
    const tableName = String(r.table_name ?? '');
    if (!tableName) continue;
    let tbl = byTable.get(tableName);
    if (!tbl) {
      tbl = { name: tableName, schema: schemaName, rowCount: 0, columns: [] };
      byTable.set(tableName, tbl);
    }
    tbl.columns.push({
      name: String(r.column_name ?? ''),
      type: String(r.data_type ?? 'TEXT'),
      nullable: String(r.is_nullable ?? 'YES').toUpperCase() !== 'NO',
      primaryKey: false,
    });
  }
  return Array.from(byTable.values());
}

function buildTlsOption(config: LiveConnectionConfig): { rejectUnauthorized: boolean } | undefined {
  return config.ssl ? { rejectUnauthorized: config.rejectUnauthorized } : undefined;
}

async function withPgClient<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (client: any) => Promise<T>
): Promise<T> {
  const { Client } = loadOptionalDriver('pg');
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database || 'postgres',
    user: config.username || 'postgres',
    password,
    ssl: buildTlsOption(config),
    connectionTimeoutMillis: config.timeoutMs ?? 10000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export const postgresDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const version = await withPgClient(config, password, async (client) => {
      const res = await client.query('SELECT version() AS version');
      return String(res.rows?.[0]?.version ?? 'PostgreSQL');
    });
    const latencyMs = +(performance.now() - start).toFixed(1);
    return { success: true, latencyMs, version, message: `Connected to PostgreSQL (${latencyMs}ms).` };
  },

  async executeQuery(config, password, query, options): Promise<LiveQueryResult> {
    const start = performance.now();
    return withPgClient(config, password, async (client) => {
      const res = await client.query(query, options?.params);
      const columns = (res.fields ?? []).map((f: any) => String(f.name));
      const rows = Array.isArray(res.rows) ? res.rows : [];
      return buildRowsQueryResult(query, columns, rows, start, res.rowCount ?? undefined);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withPgClient(config, password, async (client) => {
      const res = await client.query(
        `SELECT table_name, column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name, ordinal_position`
      );
      return groupSchemaRows(res.rows ?? [], 'public');
    });
  },
};

async function withMysqlConn<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (conn: any) => Promise<T>
): Promise<T> {
  const mysql = loadOptionalDriver('mysql2/promise');
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database || undefined,
    user: config.username || 'root',
    password,
    ssl: buildTlsOption(config),
    connectTimeout: config.timeoutMs ?? 10000,
  });
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => {});
  }
}

export const mysqlDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const version = await withMysqlConn(config, password, async (conn) => {
      const [rows] = await conn.query('SELECT VERSION() AS version');
      return String(rows?.[0]?.version ?? config.type);
    });
    const latencyMs = +(performance.now() - start).toFixed(1);
    return { success: true, latencyMs, version, message: `Connected to ${config.type} (${latencyMs}ms).` };
  },

  async executeQuery(config, password, query, options): Promise<LiveQueryResult> {
    const start = performance.now();
    return withMysqlConn(config, password, async (conn) => {
      const [result, fields] = await conn.execute(query, options?.params ?? []);
      if (Array.isArray(result)) {
        const columns = Array.isArray(fields) ? fields.map((f: any) => String(f.name)) : [];
        return buildRowsQueryResult(query, columns, result, start);
      }
      const affected = Number(result?.affectedRows ?? 0);
      return buildRowsQueryResult(query, ['status', 'affectedRows'], [{ status: 'OK', affectedRows: affected }], start, affected);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withMysqlConn(config, password, async (conn) => {
      const [rows] = await conn.execute(
        `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable
         FROM information_schema.columns
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME, ORDINAL_POSITION`
      );
      return groupSchemaRows(Array.isArray(rows) ? rows : [], config.database || 'main');
    });
  },
};

async function withSqlServerPool<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (pool: any) => Promise<T>
): Promise<T> {
  const mssql = loadOptionalDriver('mssql');
  const pool = new mssql.ConnectionPool({
    server: config.host,
    port: config.port,
    database: config.database || 'master',
    user: config.username || 'sa',
    password,
    connectionTimeout: config.timeoutMs ?? 10000,
    options: {
      encrypt: config.ssl,
      trustServerCertificate: !config.rejectUnauthorized,
    },
  });
  await pool.connect();
  try {
    return await fn(pool);
  } finally {
    await pool.close().catch(() => {});
  }
}

export const sqlServerDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const version = await withSqlServerPool(config, password, async (pool) => {
      const res = await pool.request().query('SELECT @@VERSION AS version');
      return String(res.recordset?.[0]?.version ?? 'SQL Server').split('\n')[0];
    });
    const latencyMs = +(performance.now() - start).toFixed(1);
    return { success: true, latencyMs, version, message: `Connected to SQL Server (${latencyMs}ms).` };
  },

  async executeQuery(config, password, query): Promise<LiveQueryResult> {
    const start = performance.now();
    return withSqlServerPool(config, password, async (pool) => {
      const res = await pool.request().query(query);
      const rows = Array.isArray(res.recordset) ? res.recordset : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const affected = Array.isArray(res.rowsAffected) ? res.rowsAffected[0] : undefined;
      return buildRowsQueryResult(query, columns, rows, start, affected);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withSqlServerPool(config, password, async (pool) => {
      const res = await pool.request().query(
        `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = 'dbo'
         ORDER BY TABLE_NAME, ORDINAL_POSITION`
      );
      return groupSchemaRows(res.recordset ?? [], 'dbo');
    });
  },
};

async function withOracleConn<T>(
  config: LiveConnectionConfig,
  password: string,
  fn: (conn: any, oracledb: any) => Promise<T>
): Promise<T> {
  const oracledb = loadOptionalDriver('oracledb');
  const serviceName = config.database || 'FREEPDB1';
  const conn = await oracledb.getConnection({
    user: config.username || 'system',
    password,
    connectString: `${config.host}:${config.port}/${serviceName}`,
  });
  try {
    return await fn(conn, oracledb);
  } finally {
    await conn.close().catch(() => {});
  }
}

export const oracleDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const version = await withOracleConn(config, password, async (conn, oracledb) => {
      const res = await conn.execute(
        'SELECT banner AS version FROM v$version WHERE ROWNUM = 1',
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return String(res.rows?.[0]?.VERSION ?? 'Oracle Database');
    });
    const latencyMs = +(performance.now() - start).toFixed(1);
    return { success: true, latencyMs, version, message: `Connected to Oracle (${latencyMs}ms).` };
  },

  async executeQuery(config, password, query, options): Promise<LiveQueryResult> {
    const start = performance.now();
    return withOracleConn(config, password, async (conn, oracledb) => {
      const res = await conn.execute(query.replace(/;\s*$/, ''), options?.params ?? [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });
      const columns = (res.metaData ?? []).map((m: any) => String(m.name));
      const rows = Array.isArray(res.rows) ? res.rows : [];
      return buildRowsQueryResult(query, columns, rows, start, res.rowsAffected);
    });
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    return withOracleConn(config, password, async (conn, oracledb) => {
      const res = await conn.execute(
        `SELECT table_name, column_name, data_type, nullable AS is_nullable
         FROM user_tab_columns
         ORDER BY table_name, column_id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const normalized = (res.rows ?? []).map((r: any) => ({
        table_name: r.TABLE_NAME,
        column_name: r.COLUMN_NAME,
        data_type: r.DATA_TYPE,
        is_nullable: r.IS_NULLABLE === 'N' ? 'NO' : 'YES',
      }));
      return groupSchemaRows(normalized, config.username.toUpperCase() || 'USER');
    });
  },
};

function createClickHouseClient(config: LiveConnectionConfig, password: string): any {
  const { createClient } = loadOptionalDriver('@clickhouse/client');
  const protocol = config.ssl ? 'https' : 'http';
  return createClient({
    url: `${protocol}://${config.host}:${config.port}`,
    username: config.username || 'default',
    password,
    database: config.database || 'default',
    request_timeout: config.timeoutMs ?? 10000,
    http_agent:
      config.ssl && !config.rejectUnauthorized
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
  });
}

export const clickhouseDriver: LiveDatabaseDriver = {
  async testConnection(config, password): Promise<LiveTestResult> {
    const start = performance.now();
    const client = createClickHouseClient(config, password);
    try {
      const rs = await client.query({ query: 'SELECT version() AS version', format: 'JSONEachRow' });
      const rows = await rs.json();
      const version = String(rows?.[0]?.version ?? 'ClickHouse');
      const latencyMs = +(performance.now() - start).toFixed(1);
      return { success: true, latencyMs, version, message: `Connected to ClickHouse (${latencyMs}ms).` };
    } finally {
      await client.close().catch(() => {});
    }
  },

  async executeQuery(config, password, query): Promise<LiveQueryResult> {
    const start = performance.now();
    const client = createClickHouseClient(config, password);
    try {
      const isSelect = /^\s*(?:SELECT|SHOW|DESCRIBE|WITH)\b/i.test(query);
      if (!isSelect) {
        await client.command({ query });
        return buildRowsQueryResult(query, ['status'], [{ status: 'OK' }], start, 0);
      }
      const rs = await client.query({ query, format: 'JSONEachRow' });
      const rows = (await rs.json()) as Record<string, unknown>[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return buildRowsQueryResult(query, columns, rows, start);
    } finally {
      await client.close().catch(() => {});
    }
  },

  async introspectSchema(config, password): Promise<LiveSchemaTable[]> {
    const client = createClickHouseClient(config, password);
    try {
      const dbName = (config.database || 'default').replace(/'/g, "''");
      const rs = await client.query({
        query: `SELECT table AS table_name, name AS column_name, type AS data_type FROM system.columns WHERE database = '${dbName}' ORDER BY table, position`,
        format: 'JSONEachRow',
      });
      const rows = await rs.json();
      return groupSchemaRows(Array.isArray(rows) ? rows : [], config.database || 'default');
    } catch (err) {
      throw new Error(sanitizeErrorMessage(err), { cause: err });
    } finally {
      await client.close().catch(() => {});
    }
  },
};
