import {
  DatabaseType,
  DatabaseDriverInfo,
  DatabaseConnection,
  SchemaDefinition,
  ExecutionPlanStep,
} from '../types/database';
import {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_ECOMMERCE_VIEWS,
  INITIAL_ECOMMERCE_PROCEDURES,
  INITIAL_DEMO_DATA,
} from './ecommerceSeed';
import {
  ORACLE_HR_TABLES,
  ORACLE_HR_VIEWS,
  ORACLE_HR_PROCEDURES,
  SQLSERVER_DBO_TABLES,
  SQLSERVER_DBO_VIEWS,
  SQLSERVER_DBO_PROCEDURES,
} from './enterpriseSeed';

export {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_ECOMMERCE_VIEWS,
  INITIAL_ECOMMERCE_PROCEDURES,
  INITIAL_DEMO_DATA,
  ORACLE_HR_TABLES,
  ORACLE_HR_VIEWS,
  ORACLE_HR_PROCEDURES,
  SQLSERVER_DBO_TABLES,
  SQLSERVER_DBO_VIEWS,
  SQLSERVER_DBO_PROCEDURES,
};

export const DATABASE_DRIVERS: DatabaseDriverInfo[] = [
  {
    id: 'sqlite',
    name: 'SQLite',
    category: 'relational',
    defaultPort: 0,
    icon: 'Feather',
    color: '#003B57',
    description: 'Lightweight, file-based and in-memory relational database engine.',
    sampleDbAvailable: true,
  },
  {
    id: 'duckdb',
    name: 'DuckDB',
    category: 'analytical',
    defaultPort: 0,
    icon: 'Boxes',
    color: '#FFF000',
    description: 'Fast in-process analytical columnar database with vectorized execution.',
    sampleDbAvailable: true,
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'relational',
    defaultPort: 5432,
    icon: 'Database',
    color: '#336791',
    description: "The world's most advanced open source relational database with JSONB and extensions.",
    sampleDbAvailable: true,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'relational',
    defaultPort: 3306,
    icon: 'Cpu',
    color: '#00758F',
    description: 'Fast, reliable web database powering millions of enterprise and web applications.',
    sampleDbAvailable: true,
  },
  {
    id: 'mariadb',
    name: 'MariaDB',
    category: 'relational',
    defaultPort: 3306,
    icon: 'Server',
    color: '#C0715D',
    description: 'Community-developed, high-performance fork of MySQL with columnar engines.',
    sampleDbAvailable: true,
  },
  {
    id: 'oracle',
    name: 'Oracle Database',
    category: 'relational',
    defaultPort: 1521,
    icon: 'Layers',
    color: '#F80000',
    description: 'Mission-critical enterprise RDBMS with multi-tenant architectures and PL/SQL.',
    sampleDbAvailable: true,
  },
  {
    id: 'sqlserver',
    name: 'Microsoft SQL Server',
    category: 'relational',
    defaultPort: 1433,
    icon: 'Grid',
    color: '#CC292B',
    description: 'Enterprise relational database with T-SQL, columnstore indexes, and In-Memory OLTP.',
    sampleDbAvailable: true,
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse OLAP',
    category: 'analytical',
    defaultPort: 8123,
    icon: 'BarChart2',
    color: '#FAFF00',
    description: 'Ultra-fast open-source column-oriented database for real-time analytical reporting.',
    sampleDbAvailable: true,
  },
  {
    id: 'snowflake',
    name: 'Snowflake Data Cloud',
    category: 'analytical',
    defaultPort: 443,
    icon: 'Snowflake',
    color: '#29B5E8',
    description: 'Cloud data warehouse with decoupled storage/compute and zero-copy cloning.',
    sampleDbAvailable: true,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'nosql',
    defaultPort: 27017,
    icon: 'FileCode',
    color: '#13AA52',
    description: 'Flexible document database with dynamic schemas, aggregations, and BSON.',
    sampleDbAvailable: true,
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'nosql',
    defaultPort: 6379,
    icon: 'Zap',
    color: '#D82C20',
    description: 'In-memory data structure store used as a database, cache, and message broker.',
    sampleDbAvailable: true,
  },
];

export function buildDefaultSchemaForType(
  type: DatabaseType,
  customSchemaName?: string,
  tableLimit?: number
): SchemaDefinition {
  if (type === 'oracle') {
    return {
      name: customSchemaName || 'HR',
      tables: tableLimit ? ORACLE_HR_TABLES.slice(0, tableLimit) : ORACLE_HR_TABLES,
      views: ORACLE_HR_VIEWS,
      procedures: ORACLE_HR_PROCEDURES,
    };
  }

  if (type === 'sqlserver') {
    return {
      name: customSchemaName || 'dbo',
      tables: tableLimit ? SQLSERVER_DBO_TABLES.slice(0, tableLimit) : SQLSERVER_DBO_TABLES,
      views: SQLSERVER_DBO_VIEWS,
      procedures: SQLSERVER_DBO_PROCEDURES,
    };
  }

  const defaultName = customSchemaName || (type === 'postgres' ? 'public' : 'main');
  return {
    name: defaultName,
    tables: tableLimit ? INITIAL_ECOMMERCE_TABLES.slice(0, tableLimit) : INITIAL_ECOMMERCE_TABLES,
    views: INITIAL_ECOMMERCE_VIEWS,
    procedures: INITIAL_ECOMMERCE_PROCEDURES,
  };
}

export const INITIAL_CONNECTIONS: DatabaseConnection[] = [
  {
    id: 'conn_sqlite_local',
    name: 'SQLite - Local',
    type: 'sqlite',
    host: 'localhost',
    port: 0,
    database: 'ecommerce_prod.db',
    username: 'admin',
    ssl: false,
    colorBadge: '#003B57',
    status: 'connected',
    version: 'SQLite 3.45',
    pingMs: 0.8,
    schemas: [buildDefaultSchemaForType('sqlite', 'main')],
  },
  {
    id: 'conn_postgres_cloud',
    name: 'PostgreSQL - Analytics Cluster',
    type: 'postgres',
    host: 'db.prod.us-east.aws.neon.tech',
    port: 5432,
    database: 'telemetry_warehouse',
    username: 'postgres_admin',
    ssl: true,
    colorBadge: '#336791',
    status: 'connected',
    version: 'PostgreSQL 16.2 on x86_64-pc-linux-gnu',
    pingMs: 14.2,
    schemas: [buildDefaultSchemaForType('postgres', 'public')],
  },
  {
    id: 'conn_duckdb_analytics',
    name: 'DuckDB - Analytics',
    type: 'duckdb',
    host: 'memory',
    port: 0,
    database: 'metrics_vectorized.duckdb',
    username: 'analyst',
    ssl: false,
    colorBadge: '#E6A700',
    status: 'connected',
    version: 'DuckDB v0.10.0',
    pingMs: 0.4,
    schemas: [buildDefaultSchemaForType('duckdb', 'main', 4)],
  },
  {
    id: 'conn_mysql_replica',
    name: 'MySQL 8.0 - Master Cluster',
    type: 'mysql',
    host: 'mysql-cluster.internal.net',
    port: 3306,
    database: 'app_master',
    username: 'db_root',
    ssl: true,
    colorBadge: '#00758F',
    status: 'connected',
    version: 'MySQL 8.0.36 Community Server',
    pingMs: 18.5,
    schemas: [buildDefaultSchemaForType('mysql', 'app_master')],
  },
  {
    id: 'conn_oracle_enterprise',
    name: 'Oracle Database 23c Free (HR)',
    type: 'oracle',
    host: 'oracle-db.corp.internal',
    port: 1521,
    database: 'FREEPDB1',
    username: 'hr_admin',
    ssl: true,
    colorBadge: '#F80000',
    status: 'connected',
    version: 'Oracle Database 23c Free Release 23.0.0.0.0 - Production',
    pingMs: 11.4,
    schemas: [buildDefaultSchemaForType('oracle', 'HR')],
  },
  {
    id: 'conn_sqlserver_azure',
    name: 'MS SQL Server 2022 (Azure)',
    type: 'sqlserver',
    host: 'sql-prod-eastus.database.windows.net',
    port: 1433,
    database: 'EnterpriseDB',
    username: 'sa_cloud',
    ssl: true,
    colorBadge: '#CC292B',
    status: 'connected',
    version: 'Microsoft SQL Server 2022 (RTM) - 16.0.1000.6 (X64)',
    pingMs: 9.8,
    schemas: [buildDefaultSchemaForType('sqlserver', 'dbo')],
  },
];

function buildPrimaryAccessStep(q: string): { step: ExecutionPlanStep; nextId: number } {
  if (q.includes('JOIN')) {
    return {
      nextId: 4,
      step: {
        id: 1,
        operation: 'HASH JOIN',
        target: 'INNER JOIN (Hash)',
        cost: '14.2..38.5',
        rowsEstimate: 24,
        details: 'Hash Cond: orders.customer_id = customers.id',
        children: [
          {
            id: 2,
            operation: 'SCAN TABLE',
            target: 'orders',
            cost: '0.0..12.5',
            rowsEstimate: 8,
            details: 'Sequential table scan on orders',
          },
          {
            id: 3,
            operation: 'SEARCH TABLE USING INDEX',
            target: 'customers',
            cost: '0.0..8.2',
            rowsEstimate: 8,
            details: 'B-Tree Index Scan using pk_customers_id',
          },
        ],
      },
    };
  }

  if (/\bWHERE\b[\s\S]*\bID\s*=/i.test(q)) {
    return {
      nextId: 2,
      step: {
        id: 1,
        operation: 'SEARCH TABLE USING INDEX',
        target: 'Primary Key Index',
        cost: '0.0..2.1',
        rowsEstimate: 1,
        details: 'Point lookup via B-Tree Index (O(log N) lookup)',
      },
    };
  }

  return {
    nextId: 2,
    step: {
      id: 1,
      operation: 'SCAN TABLE',
      target: 'Full Table Scan',
      cost: '0.0..10.5',
      rowsEstimate: 10,
      details: 'Sequential scan across table pages',
    },
  };
}

export function generateExecutionPlan(query: string): ExecutionPlanStep[] {
  const q = query.trim().toUpperCase();
  const { step: accessStep, nextId } = buildPrimaryAccessStep(q);
  const steps: ExecutionPlanStep[] = [accessStep];
  let stepId = nextId;

  if (/\bGROUP\s+BY\b|\b(?:COUNT|SUM|AVG)\s*\(/.test(q)) {
    steps.push({
      id: stepId++,
      operation: 'AGGREGATE / HASH GROUP',
      cost: '22.0..35.0',
      rowsEstimate: 5,
      details: 'In-memory hash aggregation table',
    });
  }

  if (q.includes('ORDER BY')) {
    steps.push({
      id: stepId,
      operation: 'SORT (B-TREE / QUICKSORT)',
      cost: '12.0..18.0',
      rowsEstimate: 10,
      details: 'Top-N in-memory sort',
    });
  }

  return steps;
}
