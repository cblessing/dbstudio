import {
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
} from '../types/database';

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
  dual: [{ dummy: 'X' }],
  inventory_logs: [
    { log_id: 1, product_id: 1, change_qty: 150, reason: 'Initial batch warehouse receipt', logged_by: 'SYSTEM_SVC', log_time: '2026-04-01 08:00:00' },
    { log_id: 2, product_id: 2, change_qty: 45, reason: 'Vendor shipment PO-9811', logged_by: 'JMILLER_AZURE', log_time: '2026-04-05 10:15:00' },
    { log_id: 3, product_id: 3, change_qty: -2, reason: 'Damaged item written off', logged_by: 'ACHEN_ADMIN', log_time: '2026-04-10 14:22:00' },
    { log_id: 4, product_id: 4, change_qty: 60, reason: 'Restock batch #440', logged_by: 'SYSTEM_SVC', log_time: '2026-04-15 09:30:00' },
    { log_id: 5, product_id: 5, change_qty: -15, reason: 'Order fulfillment batch', logged_by: 'WAREHOUSE_JOB', log_time: '2026-04-18 16:45:00' },
    { log_id: 6, product_id: 7, change_qty: 80, reason: 'Seasonal restock', logged_by: 'SVASQUEZ_AZURE', log_time: '2026-04-20 11:00:00' },
  ],
};

export const INITIAL_ECOMMERCE_VIEWS: ViewDefinition[] = [
  {
    name: 'vw_customer_orders',
    schema: 'public',
    columns: [
      { name: 'customer_id', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'first_name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'last_name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'email', type: 'VARCHAR(100)', nullable: false, primaryKey: false },
      { name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'order_date', type: 'TIMESTAMP', nullable: false, primaryKey: false },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, primaryKey: false },
      { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
    ],
    definition: `CREATE VIEW vw_customer_orders AS
SELECT
  c.id AS customer_id,
  c.first_name,
  c.last_name,
  c.email,
  o.id AS order_id,
  o.order_date,
  o.status,
  o.total_amount
FROM customers c
JOIN orders o ON c.id = o.customer_id;`,
  },
  {
    name: 'vw_product_sales',
    schema: 'public',
    columns: [
      { name: 'product_id', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'sku', type: 'VARCHAR(30)', nullable: false, primaryKey: false },
      { name: 'title', type: 'VARCHAR(150)', nullable: false, primaryKey: false },
      { name: 'category_name', type: 'VARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
      { name: 'total_sold', type: 'INTEGER', nullable: true, primaryKey: false },
      { name: 'total_revenue', type: 'DECIMAL(10,2)', nullable: true, primaryKey: false },
    ],
    definition: `CREATE VIEW vw_product_sales AS
SELECT
  p.id AS product_id,
  p.sku,
  p.title,
  cat.name AS category_name,
  p.price,
  COALESCE(SUM(oi.quantity), 0) AS total_sold,
  ROUND(COALESCE(SUM(oi.subtotal), 0), 2) AS total_revenue
FROM products p
JOIN categories cat ON p.category_id = cat.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.sku, p.title, cat.name, p.price;`,
  },
  {
    name: 'vw_active_products',
    schema: 'public',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: false },
      { name: 'sku', type: 'VARCHAR(30)', nullable: false, primaryKey: false },
      { name: 'title', type: 'VARCHAR(150)', nullable: false, primaryKey: false },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false },
      { name: 'stock_quantity', type: 'INTEGER', nullable: false, primaryKey: false },
    ],
    definition: `CREATE VIEW vw_active_products AS
SELECT id, sku, title, price, stock_quantity, rating
FROM products
WHERE stock_quantity > 0;`,
  },
];

export const INITIAL_ECOMMERCE_PROCEDURES: ProcedureDefinition[] = [
  {
    name: 'sp_get_customer_orders',
    schema: 'public',
    parameters: '@customer_id INT = NULL',
    definition: `CREATE PROCEDURE sp_get_customer_orders (@customer_id INT = NULL)
AS
BEGIN
  SELECT c.id AS customer_id, c.first_name, c.last_name, o.id AS order_id, o.order_date, o.status, o.total_amount
  FROM customers c
  JOIN orders o ON c.id = o.customer_id
  WHERE @customer_id IS NULL OR c.id = @customer_id
  ORDER BY o.order_date DESC;
END;`,
  },
  {
    name: 'sp_sales_by_category',
    schema: 'public',
    parameters: '',
    definition: `CREATE PROCEDURE sp_sales_by_category
AS
BEGIN
  SELECT cat.name AS category, COUNT(DISTINCT p.id) AS product_count, ROUND(COALESCE(SUM(oi.subtotal), 0), 2) AS total_revenue
  FROM categories cat
  LEFT JOIN products p ON cat.id = p.category_id
  LEFT JOIN order_items oi ON p.id = oi.product_id
  GROUP BY cat.id, cat.name
  ORDER BY total_revenue DESC;
END;`,
  },
  {
    name: 'sp_restock_product',
    schema: 'public',
    parameters: '@product_id INT, @quantity INT',
    definition: `CREATE PROCEDURE sp_restock_product (@product_id INT, @quantity INT)
AS
BEGIN
  UPDATE products SET stock_quantity = stock_quantity + @quantity WHERE id = @product_id;
END;`,
  },
];
