export type DatabaseType =
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'duckdb'
  | 'mariadb'
  | 'oracle'
  | 'sqlserver'
  | 'clickhouse'
  | 'snowflake'
  | 'bigquery'
  | 'redshift'
  | 'mongodb'
  | 'redis';

export type DatabaseCategory = 'relational' | 'analytical' | 'nosql';

export interface DatabaseDriverInfo {
  id: DatabaseType;
  name: string;
  category: DatabaseCategory;
  defaultPort: number;
  icon: string;
  color: string;
  description: string;
  sampleDbAvailable: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string | null;
  foreignKey?: {
    targetTable: string;
    targetColumn: string;
  };
}

export interface TableDefinition {
  name: string;
  schema?: string;
  rowCount: number;
  columns: ColumnDefinition[];
  indexes?: { name: string; columns: string[]; unique: boolean }[];
  foreignKeys?: {
    name: string;
    column: string;
    foreignTable: string;
    foreignColumn: string;
  }[];
  ddl?: string;
  system?: boolean;
}

export interface ViewDefinition {
  name: string;
  schema?: string;
  columns?: ColumnDefinition[];
  definition: string;
}

export interface ProcedureDefinition {
  name: string;
  schema?: string;
  parameters?: string;
  definition: string;
}

export interface SchemaDefinition {
  name: string;
  tables: TableDefinition[];
  views?: ViewDefinition[];
  procedures?: ProcedureDefinition[];
}

export type SshAuthMethod = 'privateKey' | 'password' | 'agent';

export interface SshTunnelConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authMethod: SshAuthMethod;
  privateKeyPath?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl: boolean;
  rejectUnauthorized?: boolean;
  ssh?: SshTunnelConfig;
  colorBadge: string;
  status: 'connected' | 'disconnected' | 'connecting';
  schemas: SchemaDefinition[];
  pingMs?: number;
  version?: string;
}

export interface QueryResult {
  columns: string[];
  columnTypes?: Record<string, string>;
  rows: Record<string, any>[];
  executionTimeMs: number;
  fetchTimeMs: number;
  rowCount: number;
  affectedRows?: number;
  query: string;
  error?: string;
  explainPlan?: ExecutionPlanStep[];
  hasMore?: boolean;
  nextOffset?: number;
}

export interface ExecutionPlanStep {
  id: number;
  operation: string;
  target?: string;
  cost?: string;
  rowsEstimate?: number;
  details: string;
  children?: ExecutionPlanStep[];
}

export interface EditorTab {
  id: string;
  title: string;
  type: 'query' | 'table' | 'erd' | 'ddl';
  connectionId: string;
  queryContent?: string;
  tableName?: string;
  isDirty?: boolean;
}
