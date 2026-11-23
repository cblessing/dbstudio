export type LiveDriverType =
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'sqlserver'
  | 'oracle'
  | 'clickhouse'
  | 'mongodb'
  | 'redis';

export interface LiveConnectionConfig {
  id: string;
  type: LiveDriverType;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  rejectUnauthorized: boolean;
  timeoutMs?: number;
}

export interface LiveQueryOptions {
  params?: unknown[];
  offset?: number;
  batchSize?: number;
}

export interface LiveQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  fetchTimeMs: number;
  rowCount: number;
  affectedRows?: number;
  query: string;
  error?: string;
}

export interface LiveTestResult {
  success: boolean;
  latencyMs: number;
  version?: string;
  message: string;
}

export interface LiveSchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
}

export interface LiveSchemaTable {
  name: string;
  schema?: string;
  rowCount: number;
  columns: LiveSchemaColumn[];
}

export interface LiveDatabaseDriver {
  testConnection(config: LiveConnectionConfig, password: string): Promise<LiveTestResult>;
  executeQuery(
    config: LiveConnectionConfig,
    password: string,
    query: string,
    options?: LiveQueryOptions
  ): Promise<LiveQueryResult>;
  introspectSchema(config: LiveConnectionConfig, password: string): Promise<LiveSchemaTable[]>;
}

const LIVE_DRIVER_TYPES: ReadonlySet<string> = new Set<LiveDriverType>([
  'postgres',
  'mysql',
  'mariadb',
  'sqlserver',
  'oracle',
  'clickhouse',
  'mongodb',
  'redis',
]);

const SAFE_HOST_PATTERN = /^[a-zA-Z0-9._:-]{1,253}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

export function isLiveDriverType(value: unknown): value is LiveDriverType {
  return typeof value === 'string' && LIVE_DRIVER_TYPES.has(value);
}

export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown database error');
  return raw
    .replace(/(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis(?:s)?):\/\/[^\s]+/gi, '[redacted-uri]')
    .replace(/(password|pwd|token|secret)\s*[:=]\s*[^\s;,]+/gi, '$1=[redacted]');
}

function validateHostAndPort(host: unknown, port: unknown): string | null {
  if (typeof host !== 'string' || !SAFE_HOST_PATTERN.test(host.trim())) {
    return 'Invalid host address.';
  }
  const numPort = typeof port === 'number' ? port : Number(port);
  if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
    return 'Port must be an integer between 1 and 65535.';
  }
  return null;
}

function normalizeTimeoutMs(val: unknown): number {
  return typeof val === 'number' ? Math.min(Math.max(val, 1000), 30000) : 10000;
}

function asTrimmedString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

export function validateConnectionConfig(
  raw: unknown
): { valid: true; config: LiveConnectionConfig } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Connection configuration must be an object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!isLiveDriverType(obj.type)) {
    return { valid: false, error: `Unsupported live driver type: ${String(obj.type ?? '')}` };
  }
  if (typeof obj.id !== 'string' || !SAFE_ID_PATTERN.test(obj.id)) {
    return { valid: false, error: 'Invalid connection identifier.' };
  }
  const hostPortError = validateHostAndPort(obj.host, obj.port);
  if (hostPortError) {
    return { valid: false, error: hostPortError };
  }

  return {
    valid: true,
    config: {
      id: obj.id,
      type: obj.type,
      host: String(obj.host).trim(),
      port: Number(obj.port),
      database: asTrimmedString(obj.database),
      username: asTrimmedString(obj.username),
      ssl: obj.ssl === true,
      rejectUnauthorized: obj.rejectUnauthorized !== false,
      timeoutMs: normalizeTimeoutMs(obj.timeoutMs),
    },
  };
}

export function loadOptionalDriver<T = any>(packageName: string): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(packageName) as T;
  } catch {
    throw new Error(`Driver package "${packageName}" is not installed. Run "npm install ${packageName}".`);
  }
}

export function buildRowsQueryResult(
  query: string,
  columns: string[],
  rows: Record<string, unknown>[],
  startTime: number,
  affectedRows?: number
): LiveQueryResult {
  const elapsed = Math.max(0.1, +(performance.now() - startTime).toFixed(2));
  return {
    columns,
    rows,
    executionTimeMs: elapsed,
    fetchTimeMs: 0.1,
    rowCount: affectedRows ?? rows.length,
    affectedRows,
    query,
  };
}
