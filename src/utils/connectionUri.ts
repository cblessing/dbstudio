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

function decodeOptional(val: string): string | undefined {
  return val ? decodeURIComponent(val) : undefined;
}

function resolvePort(portStr: string, defaultPort?: number): number | undefined {
  const num = portStr ? Number(portStr) : defaultPort;
  return typeof num === 'number' && Number.isInteger(num) && num > 0 ? num : undefined;
}

export function parseConnectionUri(
  rawUri: string
): { ok: true; value: ParsedConnectionUri } | { ok: false; error: string } {
  const trimmed = rawUri.trim();
  if (!trimmed) return { ok: false, error: 'Paste a connection URI first.' };

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
      username: decodeOptional(parsed.username),
      password: decodeOptional(parsed.password),
      ...parseTlsFromParams(parsed.searchParams, protoInfo?.tls),
    },
  };
}
