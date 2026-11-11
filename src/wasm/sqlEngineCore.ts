import {
  DatabaseType,
  DatabaseDriverInfo,
  DatabaseConnection,
  SchemaDefinition,
  TableDefinition,
  QueryResult,
  ExecutionPlanStep,
} from '../types/database';

export const DATABASE_DRIVERS: DatabaseDriverInfo[] = [
  {
    id: 'sqlite',
    name: 'SQLite (WebAssembly)',
    category: 'relational',
    defaultPort: 0,
    icon: 'Feather',
    color: '#003B57',
    description: 'Embedded, zero-latency in-memory SQLite compiled directly to WebAssembly.',
    wasmSupported: true,
    sampleDbAvailable: true,
  },
  {
    id: 'duckdb',
    name: 'DuckDB (WASM Columnar)',
    category: 'analytical',
    defaultPort: 0,
    icon: 'Boxes',
    color: '#FFF000',
    description: 'Fast in-process analytical columnar database with vectorized execution in WASM.',
    wasmSupported: true,
    sampleDbAvailable: true,
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'relational',
    defaultPort: 5432,
    icon: 'Database',
    color: '#336791',
    description: 'The world\'s most advanced open source relational database with JSONB and extensions.',
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
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
    wasmSupported: true,
    sampleDbAvailable: true,
  },
];

export const INITIAL_ECOMMERCE_TABLES: TableDefinition[] = [
  {
    name: 'customers',
    schema: 'public',
    rowCount: 8,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      { name: 'first_name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'last_name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'email', type: 'VARCHAR(100)', nullable: false, primaryKey: false },
      { name: 'city', type: 'VARCHAR(50)', nullable: true, primaryKey: false },
      { name: 'country', type: 'VARCHAR(50)', nullable: true, primaryKey: false, defaultValue: "'USA'" },
      { name: 'loyalty_tier', type: 'VARCHAR(20)', nullable: false, primaryKey: false, defaultValue: "'Silver'" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, primaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
    indexes: [
      { name: 'idx_customers_email', columns: ['email'], unique: true },
      { name: 'idx_customers_city', columns: ['city'], unique: false },
    ],
    ddl: `CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  city VARCHAR(50),
  country VARCHAR(50) DEFAULT 'USA',
  loyalty_tier VARCHAR(20) DEFAULT 'Silver',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
  },
  {
    name: 'categories',
    schema: 'public',
    rowCount: 5,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      { name: 'name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'slug', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'description', type: 'TEXT', nullable: true, primaryKey: false },
    ],
    indexes: [{ name: 'idx_categories_slug', columns: ['slug'], unique: true }],
    ddl: `CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);`,
  },
  {
    name: 'products',
    schema: 'public',
    rowCount: 10,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      {
        name: 'category_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'categories', targetColumn: 'id' },
      },
      { name: 'sku', type: 'VARCHAR(30)', nullable: false, primaryKey: false },
      { name: 'title', type: 'VARCHAR(150)', nullable: false, primaryKey: false },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
      { name: 'stock_quantity', type: 'INTEGER', nullable: false, primaryKey: false, defaultValue: '0' },
      { name: 'rating', type: 'DECIMAL(3,2)', nullable: true, primaryKey: false, defaultValue: '4.50' },
    ],
    foreignKeys: [
      {
        name: 'fk_products_category',
        column: 'category_id',
        foreignTable: 'categories',
        foreignColumn: 'id',
      },
    ],
    indexes: [
      { name: 'idx_products_sku', columns: ['sku'], unique: true },
      { name: 'idx_products_category', columns: ['category_id'], unique: false },
    ],
    ddl: `CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  sku VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 4.50
);`,
  },
  {
    name: 'orders',
    schema: 'public',
    rowCount: 8,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      {
        name: 'customer_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'customers', targetColumn: 'id' },
      },
      { name: 'order_date', type: 'TIMESTAMP', nullable: false, primaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, primaryKey: false, defaultValue: "'Pending'" },
      { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
      { name: 'shipping_address', type: 'TEXT', nullable: true, primaryKey: false },
    ],
    foreignKeys: [
      {
        name: 'fk_orders_customer',
        column: 'customer_id',
        foreignTable: 'customers',
        foreignColumn: 'id',
      },
    ],
    indexes: [{ name: 'idx_orders_customer', columns: ['customer_id'], unique: false }],
    ddl: `CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address TEXT
);`,
  },
  {
    name: 'order_items',
    schema: 'public',
    rowCount: 12,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      {
        name: 'order_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'orders', targetColumn: 'id' },
      },
      {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'products', targetColumn: 'id' },
      },
      { name: 'quantity', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
      { name: 'subtotal', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
    ],
    foreignKeys: [
      {
        name: 'fk_order_items_order',
        column: 'order_id',
        foreignTable: 'orders',
        foreignColumn: 'id',
      },
      {
        name: 'fk_order_items_product',
        column: 'product_id',
        foreignTable: 'products',
        foreignColumn: 'id',
      },
    ],
    indexes: [
      { name: 'idx_order_items_order', columns: ['order_id'], unique: false },
      { name: 'idx_order_items_product', columns: ['product_id'], unique: false },
    ],
    ddl: `CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);`,
  },
  {
    name: 'reviews',
    schema: 'public',
    rowCount: 6,
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
      {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'products', targetColumn: 'id' },
      },
      {
        name: 'customer_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { targetTable: 'customers', targetColumn: 'id' },
      },
      { name: 'rating', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'comment', type: 'TEXT', nullable: true, primaryKey: false },
      { name: 'review_date', type: 'TIMESTAMP', nullable: false, primaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
    foreignKeys: [
      {
        name: 'fk_reviews_product',
        column: 'product_id',
        foreignTable: 'products',
        foreignColumn: 'id',
      },
      {
        name: 'fk_reviews_customer',
        column: 'customer_id',
        foreignTable: 'customers',
        foreignColumn: 'id',
      },
    ],
    ddl: `CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
  },
];

export const INITIAL_DEMO_DATA: Record<string, Record<string, any>[]> = {
  customers: [
    { id: 1, first_name: 'Elena', last_name: 'Rostova', email: 'elena.rostova@acme.io', city: 'San Francisco', country: 'USA', loyalty_tier: 'Platinum', created_at: '2026-01-15 08:30:00' },
    { id: 2, first_name: 'Marcus', last_name: 'Vance', email: 'm.vance@techcorp.com', city: 'Seattle', country: 'USA', loyalty_tier: 'Gold', created_at: '2026-01-22 14:12:00' },
    { id: 3, first_name: 'Aoi', last_name: 'Tanaka', email: 'aoi.t@tokyo-design.jp', city: 'Tokyo', country: 'Japan', loyalty_tier: 'Platinum', created_at: '2026-02-04 19:45:00' },
    { id: 4, first_name: 'Liam', last_name: 'O\'Connor', email: 'liam@dublindev.ie', city: 'Dublin', country: 'Ireland', loyalty_tier: 'Silver', created_at: '2026-02-18 11:20:00' },
    { id: 5, first_name: 'Sophie', last_name: 'Dubois', email: 'sophie.d@atelier.fr', city: 'Paris', country: 'France', loyalty_tier: 'Gold', created_at: '2026-03-01 16:05:00' },
    { id: 6, first_name: 'Carlos', last_name: 'Mendez', email: 'cmendez@soltech.mx', city: 'Mexico City', country: 'Mexico', loyalty_tier: 'Silver', created_at: '2026-03-12 09:10:00' },
    { id: 7, first_name: 'Priya', last_name: 'Sharma', email: 'priya.s@bengaluru.in', city: 'Bangalore', country: 'India', loyalty_tier: 'Platinum', created_at: '2026-03-25 18:00:00' },
    { id: 8, first_name: 'David', last_name: 'Kowalski', email: 'dkowalski@berlin.de', city: 'Berlin', country: 'Germany', loyalty_tier: 'Silver', created_at: '2026-04-02 12:40:00' },
  ],
  categories: [
    { id: 1, name: 'Developer Hardware', slug: 'developer-hardware', description: 'Ergonomic mechanical keyboards, monitors, and chips' },
    { id: 2, name: 'Cloud Infrastructure', slug: 'cloud-infrastructure', description: 'High availability clusters, edge nodes, and NVMe drives' },
    { id: 3, name: 'Security & Auth', slug: 'security-auth', description: 'Hardware security keys, biometric scanners, and HSM tokens' },
    { id: 4, name: 'Developer Apparel', slug: 'developer-apparel', description: 'Organic cotton hoodies, techwear, and thermal mugs' },
    { id: 5, name: 'Smart IoT Sensors', slug: 'smart-iot-sensors', description: 'Zigbee/Thread sensor hubs and environmental probes' },
  ],
  products: [
    { id: 1, category_id: 1, sku: 'HW-KEY-001', title: 'ErgoSplit Ortholinear Mechanical Keyboard (Gateron Oil Kings)', price: 289.00, stock_quantity: 45, rating: 4.90 },
    { id: 2, category_id: 1, sku: 'HW-DISP-002', title: 'UltraWide 40" 5K2K Curved Studio Display 120Hz', price: 1299.00, stock_quantity: 18, rating: 4.85 },
    { id: 3, category_id: 2, sku: 'CLD-NODE-01', title: 'Edge MicroCluster 64-Core ARM64 128GB ECC RAM', price: 850.00, stock_quantity: 24, rating: 4.95 },
    { id: 4, category_id: 2, sku: 'CLD-NVME-02', title: 'Enterprise PCIe 5.0 7.68TB NVMe U.3 SSD', price: 620.00, stock_quantity: 60, rating: 4.70 },
    { id: 5, category_id: 3, sku: 'SEC-FIDO-01', title: 'FIDO2 / WebAuthn Biometric Security Key Pro', price: 85.00, stock_quantity: 150, rating: 4.92 },
    { id: 6, category_id: 3, sku: 'SEC-HSM-02', title: 'USB Hardware Security Module (HSM) 4096-bit RSA', price: 340.00, stock_quantity: 30, rating: 4.60 },
    { id: 7, category_id: 4, sku: 'APP-HOOD-01', title: 'Merino Wool Dark-Mode Developer Hoodie', price: 110.00, stock_quantity: 80, rating: 4.80 },
    { id: 8, category_id: 4, sku: 'APP-MUG-02', title: 'Temperature-Controlled Ceramic Smart Mug 14oz', price: 135.00, stock_quantity: 95, rating: 4.65 },
    { id: 9, category_id: 5, sku: 'IOT-ENV-01', title: 'Precision CO2, VOC, Temperature & Humidity Monitor', price: 175.00, stock_quantity: 40, rating: 4.88 },
    { id: 10, category_id: 5, sku: 'IOT-PWR-02', title: 'DIN Rail Smart Energy Meter with Zigbee 3.0', price: 95.00, stock_quantity: 75, rating: 4.75 },
  ],
  orders: [
    { id: 101, customer_id: 1, order_date: '2026-04-10 10:15:00', status: 'Delivered', total_amount: 1588.00, shipping_address: '42 Market St, San Francisco, CA' },
    { id: 102, customer_id: 2, order_date: '2026-04-12 11:30:00', status: 'Shipped', total_amount: 374.00, shipping_address: '88 Pike Place, Seattle, WA' },
    { id: 103, customer_id: 3, order_date: '2026-04-15 15:45:00', status: 'Delivered', total_amount: 289.00, shipping_address: '1-2-3 Shibuya, Tokyo, Japan' },
    { id: 104, customer_id: 4, order_date: '2026-04-18 09:20:00', status: 'Processing', total_amount: 850.00, shipping_address: '12 Grafton St, Dublin, Ireland' },
    { id: 105, customer_id: 5, order_date: '2026-04-20 17:00:00', status: 'Delivered', total_amount: 220.00, shipping_address: '18 Rue de Rivoli, Paris, France' },
    { id: 106, customer_id: 7, order_date: '2026-04-22 13:10:00', status: 'Shipped', total_amount: 705.00, shipping_address: '100 Outer Ring Rd, Bangalore, India' },
    { id: 107, customer_id: 1, order_date: '2026-04-25 16:30:00', status: 'Processing', total_amount: 85.00, shipping_address: '42 Market St, San Francisco, CA' },
    { id: 108, customer_id: 6, order_date: '2026-04-26 14:00:00', status: 'Pending', total_amount: 175.00, shipping_address: 'Reforma 222, Mexico City, Mexico' },
  ],
  order_items: [
    { id: 1, order_id: 101, product_id: 2, quantity: 1, unit_price: 1299.00, subtotal: 1299.00 },
    { id: 2, order_id: 101, product_id: 1, quantity: 1, unit_price: 289.00, subtotal: 289.00 },
    { id: 3, order_id: 102, product_id: 5, quantity: 1, unit_price: 85.00, subtotal: 85.00 },
    { id: 4, order_id: 102, product_id: 1, quantity: 1, unit_price: 289.00, subtotal: 289.00 },
    { id: 5, order_id: 103, product_id: 1, quantity: 1, unit_price: 289.00, subtotal: 289.00 },
    { id: 6, order_id: 104, product_id: 3, quantity: 1, unit_price: 850.00, subtotal: 850.00 },
    { id: 7, order_id: 105, product_id: 7, quantity: 2, unit_price: 110.00, subtotal: 220.00 },
    { id: 8, order_id: 106, product_id: 4, quantity: 1, unit_price: 620.00, subtotal: 620.00 },
    { id: 9, order_id: 106, product_id: 5, quantity: 1, unit_price: 85.00, subtotal: 85.00 },
    { id: 10, order_id: 107, product_id: 5, quantity: 1, unit_price: 85.00, subtotal: 85.00 },
    { id: 11, order_id: 108, product_id: 9, quantity: 1, unit_price: 175.00, subtotal: 175.00 },
  ],
  reviews: [
    { id: 1, product_id: 1, customer_id: 1, rating: 5, comment: 'Phenomenal switch feel and build quality. My RSI symptoms disappeared within a week.', review_date: '2026-04-12 19:00:00' },
    { id: 2, product_id: 2, customer_id: 1, rating: 5, comment: 'Crisp 5K text clarity. macOS scaling looks razor-sharp.', review_date: '2026-04-14 09:30:00' },
    { id: 3, product_id: 3, customer_id: 4, rating: 5, comment: 'Quiet, cool, handles 20 microservices with zero throttling.', review_date: '2026-04-20 18:20:00' },
    { id: 4, product_id: 5, customer_id: 2, rating: 5, comment: 'Flawless passkey hardware verification across Linux and macOS.', review_date: '2026-04-16 11:00:00' },
    { id: 5, product_id: 7, customer_id: 5, rating: 4, comment: 'Super soft merino wool. Runs slightly snug, order one size up.', review_date: '2026-04-22 14:15:00' },
  ],
  employees: [
    { employee_id: 100, first_name: 'Steven', last_name: 'King', email: 'sking@oracle-corp.org', hire_date: '2021-06-17', job_id: 'AD_PRES', salary: 24000.00, department_id: 90 },
    { employee_id: 101, first_name: 'Neena', last_name: 'Kochhar', email: 'nkochhar@oracle-corp.org', hire_date: '2022-09-21', job_id: 'AD_VP', salary: 17000.00, department_id: 90 },
    { employee_id: 102, first_name: 'Lex', last_name: 'De Haan', email: 'ldehaan@oracle-corp.org', hire_date: '2022-01-13', job_id: 'AD_VP', salary: 17000.00, department_id: 90 },
    { employee_id: 103, first_name: 'Alexander', last_name: 'Hunold', email: 'ahunold@oracle-corp.org', hire_date: '2023-01-03', job_id: 'IT_PROG', salary: 9000.00, department_id: 60 },
    { employee_id: 104, first_name: 'Bruce', last_name: 'Ernst', email: 'bernst@oracle-corp.org', hire_date: '2023-05-21', job_id: 'IT_PROG', salary: 6000.00, department_id: 60 },
    { employee_id: 105, first_name: 'David', last_name: 'Austin', email: 'daustin@oracle-corp.org', hire_date: '2023-06-25', job_id: 'IT_PROG', salary: 4800.00, department_id: 60 },
    { employee_id: 108, first_name: 'Nancy', last_name: 'Greenberg', email: 'ngreenbe@oracle-corp.org', hire_date: '2022-08-17', job_id: 'FI_MGR', salary: 12008.00, department_id: 100 },
    { employee_id: 109, first_name: 'Daniel', last_name: 'Faviet', email: 'dfaviet@oracle-corp.org', hire_date: '2023-08-16', job_id: 'FI_ACCOUNT', salary: 9000.00, department_id: 100 },
  ],
  departments: [
    { department_id: 60, department_name: 'IT Engineering', manager_id: 103, location_id: 1400 },
    { department_id: 90, department_name: 'Executive Leadership', manager_id: 100, location_id: 1700 },
    { department_id: 100, department_name: 'Finance & Accounting', manager_id: 108, location_id: 1700 },
    { department_id: 110, department_name: 'Accounting Operations', manager_id: 205, location_id: 1700 },
  ],
  dual: [
    { dummy: 'X' },
  ],
  inventory_logs: [
    { log_id: 1, product_id: 1, change_qty: 150, reason: 'Initial batch warehouse receipt', logged_by: 'SYSTEM_SVC', log_time: '2026-04-01 08:00:00' },
    { log_id: 2, product_id: 2, change_qty: 45, reason: 'Vendor shipment PO-9811', logged_by: 'JMILLER_AZURE', log_time: '2026-04-05 10:15:00' },
    { log_id: 3, product_id: 3, change_qty: -2, reason: 'Damaged item written off', logged_by: 'ACHEN_ADMIN', log_time: '2026-04-10 14:22:00' },
    { log_id: 4, product_id: 4, change_qty: 60, reason: 'Restock batch #440', logged_by: 'SYSTEM_SVC', log_time: '2026-04-15 09:30:00' },
    { log_id: 5, product_id: 5, change_qty: -15, reason: 'Order fulfillment batch', logged_by: 'WAREHOUSE_JOB', log_time: '2026-04-18 16:45:00' },
    { log_id: 6, product_id: 7, change_qty: 80, reason: 'Seasonal restock', logged_by: 'SVASQUEZ_AZURE', log_time: '2026-04-20 11:00:00' },
  ],
};

export const ORACLE_HR_TABLES: TableDefinition[] = [
  {
    name: 'employees',
    schema: 'HR',
    rowCount: 8,
    columns: [
      { name: 'employee_id', type: 'NUMBER(6)', nullable: false, primaryKey: true },
      { name: 'first_name', type: 'VARCHAR2(20)', nullable: true, primaryKey: false },
      { name: 'last_name', type: 'VARCHAR2(25)', nullable: false, primaryKey: false },
      { name: 'email', type: 'VARCHAR2(50)', nullable: false, primaryKey: false },
      { name: 'hire_date', type: 'DATE', nullable: false, primaryKey: false },
      { name: 'job_id', type: 'VARCHAR2(10)', nullable: false, primaryKey: false },
      { name: 'salary', type: 'NUMBER(8,2)', nullable: false, primaryKey: false },
      { name: 'department_id', type: 'NUMBER(4)', nullable: true, primaryKey: false },
    ],
    indexes: [
      { name: 'emp_emp_id_pk', columns: ['employee_id'], unique: true },
      { name: 'emp_email_uk', columns: ['email'], unique: true },
    ],
    ddl: `CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  first_name VARCHAR(20),
  last_name VARCHAR(25) NOT NULL,
  email VARCHAR(50) NOT NULL UNIQUE,
  hire_date DATE NOT NULL,
  job_id VARCHAR(10) NOT NULL,
  salary DECIMAL(8,2) NOT NULL,
  department_id INTEGER
);`,
  },
  {
    name: 'departments',
    schema: 'HR',
    rowCount: 4,
    columns: [
      { name: 'department_id', type: 'NUMBER(4)', nullable: false, primaryKey: true },
      { name: 'department_name', type: 'VARCHAR2(30)', nullable: false, primaryKey: false },
      { name: 'manager_id', type: 'NUMBER(6)', nullable: true, primaryKey: false },
      { name: 'location_id', type: 'NUMBER(4)', nullable: true, primaryKey: false },
    ],
    indexes: [
      { name: 'dept_id_pk', columns: ['department_id'], unique: true },
    ],
    ddl: `CREATE TABLE departments (
  department_id INTEGER PRIMARY KEY,
  department_name VARCHAR(30) NOT NULL,
  manager_id INTEGER,
  location_id INTEGER
);`,
  },
  {
    name: 'dual',
    schema: 'SYS',
    rowCount: 1,
    columns: [
      { name: 'dummy', type: 'VARCHAR2(1)', nullable: false, primaryKey: false },
    ],
    ddl: `CREATE TABLE dual (
  dummy VARCHAR(1)
);`,
  },
  {
    name: 'customers',
    schema: 'HR',
    rowCount: 8,
    columns: INITIAL_ECOMMERCE_TABLES[0].columns,
    ddl: INITIAL_ECOMMERCE_TABLES[0].ddl,
  },
];

export const SQLSERVER_DBO_TABLES: TableDefinition[] = [
  {
    name: 'inventory_logs',
    schema: 'dbo',
    rowCount: 6,
    columns: [
      { name: 'log_id', type: 'INT', nullable: false, primaryKey: true },
      { name: 'product_id', type: 'INT', nullable: false, primaryKey: false },
      { name: 'change_qty', type: 'INT', nullable: false, primaryKey: false },
      { name: 'reason', type: 'NVARCHAR(100)', nullable: false, primaryKey: false },
      { name: 'logged_by', type: 'NVARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'log_time', type: 'DATETIME2', nullable: false, primaryKey: false, defaultValue: 'GETDATE()' },
    ],
    indexes: [
      { name: 'PK_inventory_logs', columns: ['log_id'], unique: true },
      { name: 'IX_inventory_product', columns: ['product_id'], unique: false },
    ],
    ddl: `CREATE TABLE inventory_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  change_qty INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  logged_by VARCHAR(50) NOT NULL,
  log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
  },
  INITIAL_ECOMMERCE_TABLES[0],
  INITIAL_ECOMMERCE_TABLES[2],
  INITIAL_ECOMMERCE_TABLES[3],
];

export const INITIAL_CONNECTIONS: DatabaseConnection[] = [
  {
    id: 'conn_sqlite_wasm',
    name: 'Production SQLite (WASM In-Memory)',
    type: 'sqlite',
    host: 'localhost',
    port: 0,
    database: 'ecommerce_prod.db',
    username: 'admin',
    ssl: false,
    colorBadge: '#003B57',
    status: 'connected',
    isWasmNative: true,
    version: 'SQLite 3.45 (WebAssembly x86_64)',
    pingMs: 0.8,
    schemas: [
      {
        name: 'main',
        tables: INITIAL_ECOMMERCE_TABLES,
      },
    ],
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
    isWasmNative: true,
    version: 'PostgreSQL 16.2 on x86_64-pc-linux-gnu',
    pingMs: 14.2,
    schemas: [
      {
        name: 'public',
        tables: INITIAL_ECOMMERCE_TABLES,
      },
    ],
  },
  {
    id: 'conn_duckdb_wasm',
    name: 'DuckDB OLAP (WASM Columnar)',
    type: 'duckdb',
    host: 'memory',
    port: 0,
    database: 'metrics_vectorized.duckdb',
    username: 'analyst',
    ssl: false,
    colorBadge: '#E6A700',
    status: 'connected',
    isWasmNative: true,
    version: 'DuckDB v0.10.0 (WASM Vectorized)',
    pingMs: 0.4,
    schemas: [
      {
        name: 'main',
        tables: INITIAL_ECOMMERCE_TABLES.slice(0, 4),
      },
    ],
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
    isWasmNative: true,
    version: 'MySQL 8.0.36 Community Server',
    pingMs: 18.5,
    schemas: [
      {
        name: 'app_master',
        tables: INITIAL_ECOMMERCE_TABLES,
      },
    ],
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
    isWasmNative: true,
    version: 'Oracle Database 23c Free Release 23.0.0.0.0 - Production (WASM Native)',
    pingMs: 11.4,
    schemas: [
      {
        name: 'HR',
        tables: ORACLE_HR_TABLES,
      },
    ],
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
    isWasmNative: true,
    version: 'Microsoft SQL Server 2022 (RTM) - 16.0.1000.6 (X64)',
    pingMs: 9.8,
    schemas: [
      {
        name: 'dbo',
        tables: SQLSERVER_DBO_TABLES,
      },
    ],
  },
];

export function generateExecutionPlan(query: string): ExecutionPlanStep[] {
  const q = query.trim().toUpperCase();

  const steps: ExecutionPlanStep[] = [];
  let stepId = 1;

  if (q.includes('JOIN')) {
    steps.push({
      id: stepId++,
      operation: 'HASH JOIN',
      target: 'INNER JOIN (Hash)',
      cost: '14.2..38.5',
      rowsEstimate: 24,
      details: 'Hash Cond: orders.customer_id = customers.id (WASM Vectorized Pipeline)',
      children: [
        {
          id: stepId++,
          operation: 'SCAN TABLE',
          target: 'orders',
          cost: '0.0..12.5',
          rowsEstimate: 8,
          details: 'Sequential scan on orders in WASM memory space',
        },
        {
          id: stepId++,
          operation: 'SEARCH TABLE USING INDEX',
          target: 'customers',
          cost: '0.0..8.2',
          rowsEstimate: 8,
          details: 'B-Tree Index Scan using pk_customers_id',
        },
      ],
    });
  } else if (q.includes('WHERE') && (q.includes('ID =') || q.includes('ID='))) {
    steps.push({
      id: stepId++,
      operation: 'SEARCH TABLE USING INDEX',
      target: 'Primary Key Index',
      cost: '0.0..2.1',
      rowsEstimate: 1,
      details: 'Point lookup via B-Tree Index (O(log N) lookup in WASM memory)',
    });
  } else {
    steps.push({
      id: stepId++,
      operation: 'SCAN TABLE',
      target: 'Full Table Scan',
      cost: '0.0..10.5',
      rowsEstimate: 10,
      details: 'Fast contiguous memory block read via WebAssembly 32-bit linear address space',
    });
  }

  if (q.includes('GROUP BY') || q.includes('COUNT(') || q.includes('SUM(') || q.includes('AVG(')) {
    steps.push({
      id: stepId++,
      operation: 'AGGREGATE / HASH GROUP',
      cost: '22.0..35.0',
      rowsEstimate: 5,
      details: 'In-memory hash aggregation table with SIMD-assisted hashing',
    });
  }

  if (q.includes('ORDER BY')) {
    steps.push({
      id: stepId++,
      operation: 'SORT (B-TREE / QUICKSORT)',
      cost: '12.0..18.0',
      rowsEstimate: 10,
      details: 'Top-N Heapsort in WASM heap buffer',
    });
  }

  return steps;
}
