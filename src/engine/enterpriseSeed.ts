import {
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
} from '../types/database';
import {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_ECOMMERCE_VIEWS,
  INITIAL_ECOMMERCE_PROCEDURES,
} from './ecommerceSeed';

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
    indexes: [{ name: 'dept_id_pk', columns: ['department_id'], unique: true }],
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
    columns: [{ name: 'dummy', type: 'VARCHAR2(1)', nullable: false, primaryKey: false }],
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

export const ORACLE_HR_VIEWS: ViewDefinition[] = [
  {
    name: 'emp_details_view',
    schema: 'HR',
    columns: [
      { name: 'employee_id', type: 'NUMBER(6)', nullable: false, primaryKey: false },
      { name: 'first_name', type: 'VARCHAR2(20)', nullable: true, primaryKey: false },
      { name: 'last_name', type: 'VARCHAR2(25)', nullable: false, primaryKey: false },
      { name: 'email', type: 'VARCHAR2(50)', nullable: false, primaryKey: false },
      { name: 'job_id', type: 'VARCHAR2(10)', nullable: false, primaryKey: false },
      { name: 'salary', type: 'NUMBER(8,2)', nullable: false, primaryKey: false },
      { name: 'department_id', type: 'NUMBER(4)', nullable: true, primaryKey: false },
      { name: 'department_name', type: 'VARCHAR2(30)', nullable: false, primaryKey: false },
      { name: 'location_id', type: 'NUMBER(4)', nullable: true, primaryKey: false },
    ],
    definition: `CREATE VIEW emp_details_view AS
SELECT
  e.employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.job_id,
  e.salary,
  e.department_id,
  d.department_name,
  d.location_id
FROM employees e
JOIN departments d ON e.department_id = d.department_id;`,
  },
  {
    name: 'vw_department_headcount',
    schema: 'HR',
    columns: [
      { name: 'department_id', type: 'NUMBER(4)', nullable: false, primaryKey: false },
      { name: 'department_name', type: 'VARCHAR2(30)', nullable: false, primaryKey: false },
      { name: 'employee_count', type: 'NUMBER', nullable: false, primaryKey: false },
      { name: 'avg_salary', type: 'NUMBER(8,2)', nullable: true, primaryKey: false },
    ],
    definition: `CREATE VIEW vw_department_headcount AS
SELECT
  d.department_id,
  d.department_name,
  COUNT(e.employee_id) AS employee_count,
  ROUND(COALESCE(AVG(e.salary), 0), 2) AS avg_salary
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name;`,
  },
];

export const ORACLE_HR_PROCEDURES: ProcedureDefinition[] = [
  {
    name: 'prc_get_dept_employees',
    schema: 'HR',
    parameters: 'p_dept_id IN NUMBER',
    definition: `CREATE OR REPLACE PROCEDURE prc_get_dept_employees (p_dept_id IN NUMBER) AS
BEGIN
  SELECT employee_id, first_name, last_name, job_id, salary, department_id
  FROM employees
  WHERE department_id = p_dept_id;
END;`,
  },
  {
    name: 'prc_give_raise',
    schema: 'HR',
    parameters: 'p_emp_id IN NUMBER, p_pct IN NUMBER',
    definition: `CREATE OR REPLACE PROCEDURE prc_give_raise (p_emp_id IN NUMBER, p_pct IN NUMBER) AS
BEGIN
  UPDATE employees SET salary = salary * (1 + p_pct / 100) WHERE employee_id = p_emp_id;
END;`,
  },
];

export const SQLSERVER_DBO_VIEWS: ViewDefinition[] = [
  {
    name: 'vw_inventory_activity',
    schema: 'dbo',
    columns: [
      { name: 'log_id', type: 'INT', nullable: false, primaryKey: false },
      { name: 'product_id', type: 'INT', nullable: false, primaryKey: false },
      { name: 'sku', type: 'VARCHAR(30)', nullable: false, primaryKey: false },
      { name: 'product_title', type: 'VARCHAR(150)', nullable: false, primaryKey: false },
      { name: 'change_qty', type: 'INT', nullable: false, primaryKey: false },
      { name: 'reason', type: 'NVARCHAR(100)', nullable: false, primaryKey: false },
      { name: 'logged_by', type: 'NVARCHAR(50)', nullable: false, primaryKey: false },
      { name: 'log_time', type: 'DATETIME2', nullable: false, primaryKey: false },
    ],
    definition: `CREATE VIEW vw_inventory_activity AS
SELECT
  il.log_id,
  il.product_id,
  p.sku,
  p.title AS product_title,
  il.change_qty,
  il.reason,
  il.logged_by,
  il.log_time
FROM inventory_logs il
JOIN products p ON il.product_id = p.id;`,
  },
  ...INITIAL_ECOMMERCE_VIEWS.map((v) => ({ ...v, schema: 'dbo' })),
];

export const SQLSERVER_DBO_PROCEDURES: ProcedureDefinition[] = [
  {
    name: 'sp_get_inventory_logs',
    schema: 'dbo',
    parameters: '@product_id INT = NULL',
    definition: `CREATE PROCEDURE dbo.sp_get_inventory_logs
  @product_id INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT il.log_id, il.product_id, p.sku, p.title, il.change_qty, il.reason, il.logged_by, il.log_time
  FROM inventory_logs il
  JOIN products p ON il.product_id = p.id
  WHERE @product_id IS NULL OR il.product_id = @product_id
  ORDER BY il.log_time DESC;
END;`,
  },
  ...INITIAL_ECOMMERCE_PROCEDURES.map((p) => ({ ...p, schema: 'dbo' })),
];
