import { DatabaseType } from '../types/database';

export interface ParsedConnectionUri {
  type?: DatabaseType;
  host: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  allowSelfSigned?: boolean;
}

export interface BuildUriInput {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  allowSelfSigned: boolean;
  hasSavedPassword?: boolean;
}

const MASK_TOKEN = '******';

const PROTOCOL_TO_TYPE: Record<string, { type: DatabaseType; defaultPort: number; tls?: boolean }> = {
  'postgres:': { type: 'postgres', defaultPort: 5432 },
  'postgresql:': { type: 'postgres', defaultPort: 5432 },
  'mysql:': { type: 'mysql', defaultPort: 3306 },
  'mariadb:': { type: 'mariadb', defaultPort: 3306 },
  'mssql:': { type: 'sqlserver', defaultPort: 1433 },
  'sqlserver:': { type: 'sqlserver', defaultPort: 1433 },
  'oracle:': { type: 'oracle', defaultPort: 1521 },
  'clickhouse:': { type: 'clickhouse', defaultPort: 8123 },
  'mongodb:': { type: 'mongodb', defaultPort: 27017 },
  'mongodb+srv:': { type: 'mongodb', defaultPort: 27017, tls: true },
  'redis:': { type: 'redis', defaultPort: 6379 },
  'rediss:': { type: 'redis', defaultPort: 6379, tls: true },
};

const TYPE_TO_SCHEME: Partial<Record<DatabaseType, string>> = {
  postgres: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlserver: 'sqlserver',
  oracle: 'oracle',
  clickhouse: 'clickhouse',
  mongodb: 'mongodb',
  redis: 'redis',
  sqlite: 'sqlite',
  duckdb: 'duckdb',
};

const DISABLED_SSL_VALUES = new Set(['disable', 'false', '0']);
const ENABLED_SSL_VALUES = new Set(['require', 'true', '1', 'verify-full', 'verify-ca']);

function hasAllowSelfSignedFlag(params: URLSearchParams): boolean {
  return (
    params.get('rejectUnauthorized') === 'false' ||
    params.get('tlsAllowInvalidCertificates') === 'true' ||
    params.get('trustServerCertificate') === 'true'
  );
}

function parseTlsFromParams(
  params: URLSearchParams,
  protocolTls?: boolean
): { ssl?: boolean; allowSelfSigned?: boolean } {
  const raw = params.get('sslmode') ?? params.get('ssl') ?? params.get('tls') ?? '';
  const sslMode = raw.toLowerCase();
  if (DISABLED_SSL_VALUES.has(sslMode)) return { ssl: false };
  if (ENABLED_SSL_VALUES.has(sslMode)) {
    return { ssl: true, allowSelfSigned: hasAllowSelfSignedFlag(params) };
  }
  return protocolTls ? { ssl: true } : {};
}

function decodeCredential(val: string): string | undefined {
  if (!val) return undefined;
  const decoded = decodeURIComponent(val);
  return decoded === MASK_TOKEN ? undefined : decoded;
}

function decodeOptional(val: string): string | undefined {
  return val ? decodeURIComponent(val) : undefined;
}

function resolvePort(portStr: string, defaultPort?: number): number | undefined {
  const num = portStr ? Number(portStr) : defaultPort;
  return typeof num === 'number' && Number.isInteger(num) && num > 0 ? num : undefined;
}

function buildCredentialsSegment(input: BuildUriInput, masked: boolean): string {
  const hasUser = Boolean(input.username.trim());
  const hasPwd = Boolean(input.password) || Boolean(input.hasSavedPassword);
  if (!hasUser && !hasPwd) return '';
  if (masked) return `${MASK_TOKEN}:${MASK_TOKEN}@`;
  const userPart = encodeURIComponent(input.username.trim());
  const pwdPart = encodeURIComponent(input.password);
  return `${userPart}:${pwdPart}@`;
}

function buildTlsQuery(input: BuildUriInput): string {
  if (!input.ssl) return '';
  const params = new URLSearchParams();
  if (input.type !== 'redis') params.set('sslmode', 'require');
  if (input.allowSelfSigned) params.set('rejectUnauthorized', 'false');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function buildConnectionUri(input: BuildUriInput, masked: boolean): string {
  const baseScheme = TYPE_TO_SCHEME[input.type] ?? input.type;
  const scheme = input.type === 'redis' && input.ssl ? 'rediss' : baseScheme;
  const host = input.host.trim() || 'localhost';
  const portPart = input.port > 0 ? `:${input.port}` : '';
  const dbPart = input.database.trim() ? `/${encodeURIComponent(input.database.trim())}` : '';
  const creds = buildCredentialsSegment(input, masked);
  const query = buildTlsQuery(input);
  return `${scheme}://${creds}${host}${portPart}${dbPart}${query}`;
}

export function parseConnectionUri(
  rawUri: string
): { ok: true; value: ParsedConnectionUri } | { ok: false; error: string } {
  const trimmed = rawUri.trim();
  if (!trimmed) return { ok: false, error: 'Enter a connection URI.' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URI format. Expected e.g. postgresql://user:pass@host:5432/db' };
  }
  if (!parsed.hostname) return { ok: false, error: 'Connection URI must include a hostname.' };

  const protoInfo = PROTOCOL_TO_TYPE[parsed.protocol.toLowerCase()];
  return {
    ok: true,
    value: {
      type: protoInfo?.type,
      host: parsed.hostname,
      port: resolvePort(parsed.port, protoInfo?.defaultPort),
      database: decodeOptional(parsed.pathname.replace(/^\/+/, '')),
      username: decodeCredential(parsed.username),
      password: decodeCredential(parsed.password),
      ...parseTlsFromParams(parsed.searchParams, protoInfo?.tls),
    },
  };
}
