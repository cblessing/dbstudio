import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CjsModule = require('node:module');
const origLoad = CjsModule._load;
CjsModule._load = (req: string, parent: unknown, isMain: boolean) =>
  req === 'vscode' ? {} : origLoad.call(CjsModule, req, parent, isMain);
const { LiveConnectionService } = require('../out/extension.js');
CjsModule._load = origLoad;

function loadPassword(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  const match = fs.readFileSync(envPath, 'utf8').match(/^DB_DEV_PASSWORD=(.+)$/m);
  if (!match?.[1]) throw new Error('Missing DB_DEV_PASSWORD in .env');
  return match[1].trim();
}

const PG_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    city VARCHAR(100)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    product_id INT NOT NULL REFERENCES products(id),
    status VARCHAR(40) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL
  )`,
  `INSERT INTO customers (id, first_name, last_name, email, city) VALUES
    (1, 'Ada', 'Lovelace', 'ada@example.com', 'London'),
    (2, 'Grace', 'Hopper', 'grace@example.com', 'Arlington'),
    (3, 'Alan', 'Turing', 'alan@example.com', 'Manchester')
   ON CONFLICT (id) DO NOTHING`,
  `INSERT INTO products (id, sku, title, price, stock_quantity) VALUES
    (101, 'SKU-KB-01', 'Mechanical Keyboard', 149.99, 42),
    (102, 'SKU-MS-02', 'Ergonomic Mouse', 79.50, 85),
    (103, 'SKU-MN-03', '4K USB-C Monitor', 499.00, 18)
   ON CONFLICT (id) DO NOTHING`,
  `INSERT INTO orders (id, customer_id, product_id, status, total_amount) VALUES
    (1001, 1, 101, 'shipped', 149.99),
    (1002, 2, 103, 'delivered', 499.00),
    (1003, 3, 102, 'processing', 79.50)
   ON CONFLICT (id) DO NOTHING`,
];

const MYSQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    city VARCHAR(100)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    status VARCHAR(40) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL
  )`,
  `INSERT IGNORE INTO customers (id, first_name, last_name, email, city) VALUES
    (1, 'Ada', 'Lovelace', 'ada@example.com', 'London'),
    (2, 'Grace', 'Hopper', 'grace@example.com', 'Arlington'),
    (3, 'Alan', 'Turing', 'alan@example.com', 'Manchester')`,
  `INSERT IGNORE INTO products (id, sku, title, price, stock_quantity) VALUES
    (101, 'SKU-KB-01', 'Mechanical Keyboard', 149.99, 42),
    (102, 'SKU-MS-02', 'Ergonomic Mouse', 79.50, 85),
    (103, 'SKU-MN-03', '4K USB-C Monitor', 499.00, 18)`,
  `INSERT IGNORE INTO orders (id, customer_id, product_id, status, total_amount) VALUES
    (1001, 1, 101, 'shipped', 149.99),
    (1002, 2, 103, 'delivered', 499.00),
    (1003, 3, 102, 'processing', 79.50)`,
];

const MARIADB_LARGE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sales_events (
    id INT PRIMARY KEY,
    event_code VARCHAR(32) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    region VARCHAR(40) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL
  )`,
  `INSERT IGNORE INTO sales_events (id, event_code, customer_name, region, amount, status)
   SELECT
     n,
     CONCAT('EVT-', LPAD(n, 5, '0')),
     CONCAT('Customer ', n),
     ELT((n % 4) + 1, 'North', 'South', 'East', 'West'),
     ROUND(10 + ((n * 37) % 490) + ((n % 99) / 100), 2),
     ELT((n % 3) + 1, 'completed', 'pending', 'shipped')
   FROM (
     SELECT a.d + b.d * 10 + c.d * 100 + d.d * 1000 + 1 AS n
     FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
     CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
     CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
     CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) d
   ) nums
   WHERE n <= 3500`,
];

const MSSQL_STATEMENTS = [
  `IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
   CREATE TABLE dbo.customers (
     id INT PRIMARY KEY,
     first_name NVARCHAR(100) NOT NULL,
     last_name NVARCHAR(100) NOT NULL,
     email NVARCHAR(150) NOT NULL,
     city NVARCHAR(100)
   )`,
  `IF OBJECT_ID(N'dbo.products', N'U') IS NULL
   CREATE TABLE dbo.products (
     id INT PRIMARY KEY,
     sku NVARCHAR(50) NOT NULL,
     title NVARCHAR(150) NOT NULL,
     price DECIMAL(10,2) NOT NULL,
     stock_quantity INT NOT NULL
   )`,
  `IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
   CREATE TABLE dbo.orders (
     id INT PRIMARY KEY,
     customer_id INT NOT NULL,
     product_id INT NOT NULL,
     status NVARCHAR(40) NOT NULL,
     total_amount DECIMAL(10,2) NOT NULL
   )`,
  `IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE id = 1)
   INSERT INTO dbo.customers (id, first_name, last_name, email, city) VALUES
     (1, N'Ada', N'Lovelace', N'ada@example.com', N'London'),
     (2, N'Grace', N'Hopper', N'grace@example.com', N'Arlington'),
     (3, N'Alan', N'Turing', N'alan@example.com', N'Manchester')`,
  `IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = 101)
   INSERT INTO dbo.products (id, sku, title, price, stock_quantity) VALUES
     (101, N'SKU-KB-01', N'Mechanical Keyboard', 149.99, 42),
     (102, N'SKU-MS-02', N'Ergonomic Mouse', 79.50, 85),
     (103, N'SKU-MN-03', N'4K USB-C Monitor', 499.00, 18)`,
  `IF NOT EXISTS (SELECT 1 FROM dbo.orders WHERE id = 1001)
   INSERT INTO dbo.orders (id, customer_id, product_id, status, total_amount) VALUES
     (1001, 1, 101, N'shipped', 149.99),
     (1002, 2, 103, N'delivered', 499.00),
     (1003, 3, 102, N'processing', 79.50)`,
];

const ORACLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS customers (id NUMBER PRIMARY KEY, first_name VARCHAR2(100) NOT NULL, last_name VARCHAR2(100) NOT NULL, email VARCHAR2(150) NOT NULL, city VARCHAR2(100))`,
  `CREATE TABLE IF NOT EXISTS products (id NUMBER PRIMARY KEY, sku VARCHAR2(50) NOT NULL, title VARCHAR2(150) NOT NULL, price NUMBER(10,2) NOT NULL, stock_quantity NUMBER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (id NUMBER PRIMARY KEY, customer_id NUMBER NOT NULL, product_id NUMBER NOT NULL, status VARCHAR2(40) NOT NULL, total_amount NUMBER(10,2) NOT NULL)`,
  `MERGE INTO customers t USING (SELECT 1 id, 'Ada' fn, 'Lovelace' ln, 'ada@example.com' em, 'London' ct FROM dual UNION ALL SELECT 2, 'Grace', 'Hopper', 'grace@example.com', 'Arlington' FROM dual UNION ALL SELECT 3, 'Alan', 'Turing', 'alan@example.com', 'Manchester' FROM dual) s ON (t.id = s.id) WHEN NOT MATCHED THEN INSERT (id, first_name, last_name, email, city) VALUES (s.id, s.fn, s.ln, s.em, s.ct)`,
  `MERGE INTO products t USING (SELECT 101 id, 'SKU-KB-01' sku, 'Mechanical Keyboard' title, 149.99 price, 42 qty FROM dual UNION ALL SELECT 102, 'SKU-MS-02', 'Ergonomic Mouse', 79.50, 85 FROM dual UNION ALL SELECT 103, 'SKU-MN-03', '4K USB-C Monitor', 499.00, 18 FROM dual) s ON (t.id = s.id) WHEN NOT MATCHED THEN INSERT (id, sku, title, price, stock_quantity) VALUES (s.id, s.sku, s.title, s.price, s.qty)`,
  `MERGE INTO orders t USING (SELECT 1001 id, 1 cid, 101 pid, 'shipped' st, 149.99 amt FROM dual UNION ALL SELECT 1002, 2, 103, 'delivered', 499.00 FROM dual UNION ALL SELECT 1003, 3, 102, 'processing', 79.50 FROM dual) s ON (t.id = s.id) WHEN NOT MATCHED THEN INSERT (id, customer_id, product_id, status, total_amount) VALUES (s.id, s.cid, s.pid, s.st, s.amt)`,
];

const CLICKHOUSE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS customers (id UInt32, first_name String, last_name String, email String, city String) ENGINE = ReplacingMergeTree() ORDER BY id`,
  `CREATE TABLE IF NOT EXISTS products (id UInt32, sku String, title String, price Float64, stock_quantity UInt32) ENGINE = ReplacingMergeTree() ORDER BY id`,
  `CREATE TABLE IF NOT EXISTS orders (id UInt32, customer_id UInt32, product_id UInt32, status String, total_amount Float64) ENGINE = ReplacingMergeTree() ORDER BY id`,
  `TRUNCATE TABLE customers`,
  `TRUNCATE TABLE products`,
  `TRUNCATE TABLE orders`,
  `INSERT INTO customers VALUES (1, 'Ada', 'Lovelace', 'ada@example.com', 'London'), (2, 'Grace', 'Hopper', 'grace@example.com', 'Arlington'), (3, 'Alan', 'Turing', 'alan@example.com', 'Manchester')`,
  `INSERT INTO products VALUES (101, 'SKU-KB-01', 'Mechanical Keyboard', 149.99, 42), (102, 'SKU-MS-02', 'Ergonomic Mouse', 79.50, 85), (103, 'SKU-MN-03', '4K USB-C Monitor', 499.00, 18)`,
  `INSERT INTO orders VALUES (1001, 1, 101, 'shipped', 149.99), (1002, 2, 103, 'delivered', 499.00), (1003, 3, 102, 'processing', 79.50)`,
];

const MONGO_STATEMENTS = [
  JSON.stringify({ delete: 'customers', deletes: [{ q: {}, limit: 0 }] }),
  JSON.stringify({
    insert: 'customers',
    documents: [
      { _id: 1, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', city: 'London' },
      { _id: 2, first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com', city: 'Arlington' },
      { _id: 3, first_name: 'Alan', last_name: 'Turing', email: 'alan@example.com', city: 'Manchester' },
    ],
  }),
  JSON.stringify({ delete: 'products', deletes: [{ q: {}, limit: 0 }] }),
  JSON.stringify({
    insert: 'products',
    documents: [
      { _id: 101, sku: 'SKU-KB-01', title: 'Mechanical Keyboard', price: 149.99, stock_quantity: 42 },
      { _id: 102, sku: 'SKU-MS-02', title: 'Ergonomic Mouse', price: 79.5, stock_quantity: 85 },
      { _id: 103, sku: 'SKU-MN-03', title: '4K USB-C Monitor', price: 499.0, stock_quantity: 18 },
    ],
  }),
  JSON.stringify({ delete: 'orders', deletes: [{ q: {}, limit: 0 }] }),
  JSON.stringify({
    insert: 'orders',
    documents: [
      { _id: 1001, customer_id: 1, product_id: 101, status: 'shipped', total_amount: 149.99 },
      { _id: 1002, customer_id: 2, product_id: 103, status: 'delivered', total_amount: 499.0 },
      { _id: 1003, customer_id: 3, product_id: 102, status: 'processing', total_amount: 79.5 },
    ],
  }),
];

const REDIS_STATEMENTS = [
  'SET customer:1 Ada_Lovelace',
  'SET customer:2 Grace_Hopper',
  'SET customer:3 Alan_Turing',
  'SET product:101 Mechanical_Keyboard',
  'SET product:102 Ergonomic_Mouse',
  'SET product:103 4K_USB_C_Monitor',
  'SET order:1001 shipped:149.99',
  'SET order:1002 delivered:499.00',
  'SET order:1003 processing:79.50',
];

function buildSeedTargets(pwd: string) {
  const escapedOraclePwd = pwd.replace(/"/g, '');
  return [
    {
      config: { id: 'seed_pg', type: 'postgres', host: '127.0.0.1', port: 5432, database: 'dbstudio', username: 'postgres', ssl: true, rejectUnauthorized: false },
      statements: PG_STATEMENTS,
    },
    {
      config: { id: 'seed_mysql', type: 'mysql', host: '127.0.0.1', port: 3306, database: 'dbstudio', username: 'root', ssl: true, rejectUnauthorized: false },
      statements: MYSQL_STATEMENTS,
    },
    {
      config: { id: 'seed_mariadb', type: 'mariadb', host: '127.0.0.1', port: 3307, database: 'dbstudio', username: 'root', ssl: true, rejectUnauthorized: false },
      statements: [...MYSQL_STATEMENTS, `CREATE DATABASE IF NOT EXISTS dbstudio_large`],
    },
    {
      config: { id: 'seed_mariadb_large', type: 'mariadb', host: '127.0.0.1', port: 3307, database: 'dbstudio_large', username: 'root', ssl: true, rejectUnauthorized: false },
      statements: MARIADB_LARGE_STATEMENTS,
    },
    {
      config: { id: 'seed_mssql_init', type: 'sqlserver', host: '127.0.0.1', port: 1433, database: 'master', username: 'sa', ssl: true, rejectUnauthorized: false },
      statements: [
        `IF DB_ID(N'dbstudio') IS NULL CREATE DATABASE [dbstudio]`,
        `DROP TABLE IF EXISTS dbo.orders`,
        `DROP TABLE IF EXISTS dbo.products`,
        `DROP TABLE IF EXISTS dbo.customers`,
      ],
    },
    {
      config: { id: 'seed_mssql', type: 'sqlserver', host: '127.0.0.1', port: 1433, database: 'dbstudio', username: 'sa', ssl: true, rejectUnauthorized: false },
      statements: MSSQL_STATEMENTS,
    },
    {
      config: { id: 'seed_oracle_init', type: 'oracle', host: '127.0.0.1', port: 1521, database: 'FREEPDB1', username: 'system', ssl: false, rejectUnauthorized: true },
      statements: [
        `DECLARE v_cnt NUMBER; BEGIN SELECT COUNT(*) INTO v_cnt FROM dba_users WHERE username = 'DBSTUDIO'; IF v_cnt = 0 THEN EXECUTE IMMEDIATE 'CREATE USER dbstudio IDENTIFIED BY "${escapedOraclePwd}"'; END IF; EXECUTE IMMEDIATE 'GRANT UNLIMITED TABLESPACE, CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE PROCEDURE TO dbstudio'; END;`,
        `DROP TABLE IF EXISTS system.orders`,
        `DROP TABLE IF EXISTS system.products`,
        `DROP TABLE IF EXISTS system.customers`,
      ],
    },
    {
      config: { id: 'seed_oracle', type: 'oracle', host: '127.0.0.1', port: 1521, database: 'FREEPDB1', username: 'dbstudio', ssl: false, rejectUnauthorized: true },
      statements: ORACLE_STATEMENTS,
    },
    {
      config: { id: 'seed_ch', type: 'clickhouse', host: '127.0.0.1', port: 8123, database: 'dbstudio', username: 'default', ssl: true, rejectUnauthorized: false },
      statements: CLICKHOUSE_STATEMENTS,
    },
    {
      config: { id: 'seed_mongo_cleanup', type: 'mongodb', host: '127.0.0.1', port: 27017, database: 'admin', username: 'root', ssl: true, rejectUnauthorized: false },
      statements: [
        JSON.stringify({ drop: 'orders' }),
        JSON.stringify({ drop: 'products' }),
        JSON.stringify({ drop: 'customers' }),
      ],
      ignoreErrors: true,
    },
    {
      config: { id: 'seed_mongo', type: 'mongodb', host: '127.0.0.1', port: 27017, database: 'dbstudio', username: 'root', ssl: true, rejectUnauthorized: false },
      statements: MONGO_STATEMENTS,
    },
    {
      config: { id: 'seed_redis', type: 'redis', host: '127.0.0.1', port: 6379, database: '0', username: '', ssl: true, rejectUnauthorized: false },
      statements: REDIS_STATEMENTS,
    },
  ];
}

async function main() {
  const pwd = loadPassword();
  const mem = new Map<string, string>();
  const service = new LiveConnectionService({
    get: async (k: string) => mem.get(k),
    store: async (k: string, v: string) => {
      mem.set(k, v);
    },
    delete: async (k: string) => {
      mem.delete(k);
    },
  });

  for (const target of buildSeedTargets(pwd)) {
    await service.saveConnection(target.config, pwd);
    let failed: string | null = null;
    for (const stmt of target.statements) {
      const res = await service.executeQuery(target.config.id, stmt);
      if (res.error && !target.ignoreErrors) {
        failed = res.error;
        break;
      }
    }
    if (failed) {
      console.log(`[FAIL] ${target.config.type.padEnd(11)} ${failed}`);
      continue;
    }
    const tables = await service.introspectSchema(target.config.id);
    const names = tables.map((t: { name: string }) => t.name).filter((n: string) => /^(?:customers|products|orders|keyspace)$/i.test(n));
    console.log(`[SEEDED] ${target.config.type.padEnd(11)} objects: ${names.join(', ')}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
