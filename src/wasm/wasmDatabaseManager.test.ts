import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_DEMO_DATA,
  ORACLE_HR_TABLES,
  SQLSERVER_DBO_TABLES,
} from './sqlEngineCore';
import { preprocessDialectQuery } from './dialectPreprocessor';

test('sql.js can initialize in-memory SQLite and execute queries', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables for all datasets
  const allTables = [
    ...INITIAL_ECOMMERCE_TABLES,
    ...ORACLE_HR_TABLES,
    ...SQLSERVER_DBO_TABLES,
  ];
  const created = new Set<string>();

  for (const table of allTables) {
    if (created.has(table.name)) continue;
    created.add(table.name);
    if (table.ddl) {
      db.run(table.ddl);
    }
  }

  // Insert data
  for (const [tableName, rows] of Object.entries(INITIAL_DEMO_DATA)) {
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

    for (const row of rows) {
      const values = columns.map((col) => row[col]);
      db.run(sql, values);
    }
  }

  // Execute query on customers
  const res = db.exec('SELECT * FROM customers;');
  assert.equal(res.length, 1);
  assert.equal(res[0].values.length, 8);
  assert.equal(res[0].columns[1], 'first_name');

  // Execute query on Oracle employees
  const empRes = db.exec('SELECT * FROM employees;');
  assert.equal(empRes.length, 1);
  assert.equal(empRes[0].values.length, 8);

  // Execute query on Oracle dual table
  const dualRes = db.exec('SELECT dummy FROM dual;');
  assert.equal(dualRes.length, 1);
  assert.equal(dualRes[0].values[0][0], 'X');

  // Execute query on SQL Server inventory_logs
  const logRes = db.exec('SELECT * FROM inventory_logs;');
  assert.equal(logRes.length, 1);
  assert.equal(logRes[0].values.length, 6);
});

test('preprocessDialectQuery handles T-SQL @@VERSION and @@SERVERNAME', () => {
  const ver = preprocessDialectQuery('SELECT @@VERSION');
  assert.ok(ver.syntheticResult);
  assert.equal(ver.syntheticResult.columns[0], '@@VERSION');
  assert.ok(ver.syntheticResult.rows[0]['@@VERSION'].includes('Microsoft SQL Server 2022'));

  const srv = preprocessDialectQuery('SELECT @@SERVERNAME');
  assert.ok(srv.syntheticResult);
  assert.equal(srv.syntheticResult.rows[0]['@@SERVERNAME'], 'MSSQL-PROD-AZURE-01');
});

test('preprocessDialectQuery normalizes T-SQL brackets and TOP N clause', () => {
  const topQuery = preprocessDialectQuery('SELECT TOP 5 [o].[id], [o].[total_amount] FROM [dbo].[orders] [o]');
  assert.ok(topQuery.translatedQuery.includes('LIMIT 5'));
  assert.ok(!topQuery.translatedQuery.includes('[dbo]'));
});

test('preprocessDialectQuery normalizes Oracle DUAL and SYSDATE', () => {
  const oraQuery = preprocessDialectQuery('SELECT SYSDATE FROM "HR"."DUAL"');
  assert.ok(oraQuery.translatedQuery.includes('CURRENT_TIMESTAMP'));
  assert.ok(oraQuery.translatedQuery.includes('DUAL') || oraQuery.translatedQuery.includes('dual'));
});
