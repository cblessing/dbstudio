import {
  DatabaseConnection,
  DatabaseType,
  SchemaDefinition,
  TableDefinition,
} from '../types/database';
import { DATABASE_DRIVERS } from '../engine/sqlEngineCore';
import {
  introspectLiveSchema,
  isNetworkDatabaseType,
  saveLiveConnection,
} from './liveBridge';

const NOSQL_TYPES: ReadonlySet<DatabaseType> = new Set<DatabaseType>(['mongodb', 'redis']);
const VALID_TYPES: ReadonlySet<string> = new Set(DATABASE_DRIVERS.map((d) => d.id));

export function isNoSqlDatabaseType(type: DatabaseType): boolean {
  return NOSQL_TYPES.has(type);
}

export function supportsErDiagram(type: DatabaseType): boolean {
  return !NOSQL_TYPES.has(type);
}

export function getConsoleActionLabel(type: DatabaseType): string {
  return isNoSqlDatabaseType(type) ? 'Command Console' : 'SQL Console';
}

export interface ExportedConnectionProfile {
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  rejectUnauthorized: boolean;
  colorBadge: string;
}

export function exportConnectionProfiles(connections: DatabaseConnection[]): string {
  const profiles: ExportedConnectionProfile[] = connections.map((c) => ({
    name: c.name,
    type: c.type,
    host: c.host,
    port: c.port,
    database: c.database,
    username: c.username,
    ssl: c.ssl,
    rejectUnauthorized: c.rejectUnauthorized !== false,
    colorBadge: c.colorBadge,
  }));
  return JSON.stringify({ version: 1, connections: profiles }, null, 2);
}

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val.trim() : fallback;
}

function resolveImportedPort(rawPort: unknown, defaultPort: number): number {
  const num = typeof rawPort === 'number' ? rawPort : Number(rawPort);
  return Number.isInteger(num) && num >= 0 && num <= 65535 ? num : defaultPort;
}

function defaultSchemaName(type: DatabaseType): string {
  return type === 'postgres' ? 'public' : 'main';
}

function toImportedConnection(raw: unknown, index: number): DatabaseConnection | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== 'string' || !VALID_TYPES.has(obj.type)) return null;

  const type = obj.type as DatabaseType;
  const driver = DATABASE_DRIVERS.find((d) => d.id === type);
  const driverName = driver ? driver.name : type;
  const driverColor = driver ? driver.color : '#007acc';

  return {
    id: `conn_import_${Date.now()}_${index}_${type}`,
    name: asString(obj.name, `${driverName} Connection`),
    type,
    host: asString(obj.host, 'localhost'),
    port: resolveImportedPort(obj.port, driver ? driver.defaultPort : 0),
    database: asString(obj.database, type),
    username: asString(obj.username, ''),
    ssl: obj.ssl === true,
    rejectUnauthorized: obj.rejectUnauthorized !== false,
    colorBadge: asString(obj.colorBadge, driverColor),
    status: 'disconnected',
    version: driverName,
    schemas: [{ name: defaultSchemaName(type), tables: [], views: [], procedures: [] }],
  };
}

export function parseImportedConnectionProfiles(rawJson: string): DatabaseConnection[] {
  const parsed: unknown = JSON.parse(rawJson);
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).connections)
    ? ((parsed as Record<string, unknown>).connections as unknown[])
    : null;

  if (!items) {
    throw new Error('Invalid connections file. Expected a JSON array or { "connections": [...] }.');
  }

  return items
    .map((item, idx) => toImportedConnection(item, idx))
    .filter((conn): conn is DatabaseConnection => conn !== null);
}

export function groupTablesIntoSchemas(
  tables: TableDefinition[],
  fallbackSchemaName: string,
  existingSchemas?: SchemaDefinition[]
): SchemaDefinition[] {
  if (tables.length === 0) {
    return [{ name: fallbackSchemaName, tables: [], views: [], procedures: [] }];
  }

  const bySchema = new Map<string, TableDefinition[]>();
  for (const tbl of tables) {
    const name = tbl.schema?.trim() || fallbackSchemaName;
    const list = bySchema.get(name) ?? [];
    list.push(tbl);
    bySchema.set(name, list);
  }

  const existingByName = new Map((existingSchemas ?? []).map((s) => [s.name, s]));
  const sortedNames = Array.from(bySchema.keys()).sort((a, b) => {
    if (a === fallbackSchemaName) return -1;
    if (b === fallbackSchemaName) return 1;
    return a.localeCompare(b);
  });

  return sortedNames.map((name) => {
    const prev = existingByName.get(name);
    return {
      name,
      tables: bySchema.get(name) ?? [],
      views: prev?.views ?? [],
      procedures: prev?.procedures ?? [],
    };
  });
}

export async function refreshLiveConnectionSchema(
  conn: DatabaseConnection
): Promise<DatabaseConnection | null> {
  if (!isNetworkDatabaseType(conn.type)) return null;
  const liveTables = await introspectLiveSchema(conn.id).catch(() => null);
  if (!liveTables) return null;
  const fallbackName = conn.schemas[0]?.name ?? defaultSchemaName(conn.type);
  return {
    ...conn,
    status: 'connected',
    schemas: groupTablesIntoSchemas(liveTables, fallbackName, conn.schemas),
  };
}

export async function registerImportedLiveConnections(
  imported: DatabaseConnection[]
): Promise<void> {
  for (const conn of imported) {
    if (!isNetworkDatabaseType(conn.type)) continue;
    await saveLiveConnection(
      {
        id: conn.id,
        type: conn.type,
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        ssl: conn.ssl,
        rejectUnauthorized: conn.rejectUnauthorized !== false,
      },
      ''
    ).catch(() => {});
  }
}
