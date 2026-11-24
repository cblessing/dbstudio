import test from 'node:test';
import assert from 'node:assert/strict';
import { getSqlCompletions } from './sqlCompletion';
import { buildDefaultSchemaForType } from '../engine/sqlEngineCore';
import { DatabaseConnection } from '../types/database';

const sqliteConn: DatabaseConnection = {
  id: 'conn_sqlite_test',
  name: 'SQLite Test',
  type: 'sqlite',
  host: 'localhost',
  port: 0,
  database: 'ecommerce_prod.db',
  username: 'admin',
  ssl: false,
  colorBadge: '#003B57',
  status: 'connected',
  schemas: [buildDefaultSchemaForType('sqlite', 'main')],
};
const sqlServerConn: DatabaseConnection = {
  id: 'conn_sqlserver_test',
  name: 'SQL Server Test',
  type: 'sqlserver',
  host: '127.0.0.1',
  port: 1433,
  database: 'master',
  username: 'sa',
  ssl: true,
  colorBadge: '#CC292B',
  status: 'connected',
  schemas: [buildDefaultSchemaForType('sqlserver', 'dbo')],
};

test('getSqlCompletions waits when typing "select * from " until user starts typing an object name', () => {
  const query = 'select * from ';
  const res = getSqlCompletions(query, query.length, sqliteConn);
  assert.equal(res.items.length, 0);
});

test('getSqlCompletions suggests tables, views, and procedures once user types after FROM', () => {
  const query = 'select * from c';
  const res = getSqlCompletions(query, query.length, sqliteConn);

  assert.ok(res.items.length > 0);
  assert.equal(res.replaceStart, 14);
  assert.equal(res.replaceEnd, 15);
  assert.equal(res.prefix, 'c');

  // Prefix matches ('customers', 'categories') appear first
  assert.equal(res.items[0].name, 'customers');
  assert.equal(res.items[0].kind, 'table');
  assert.equal(res.items[1].name, 'categories');
  assert.equal(res.items[1].kind, 'table');

  // Views and procedures containing 'c' are also included
  assert.ok(res.items.some((i) => i.kind === 'view' && i.name === 'vw_customer_orders'));
  assert.ok(res.items.some((i) => i.kind === 'procedure' && i.name === 'sp_get_customer_orders'));
});

test('getSqlCompletions suggests views when typing view prefix', () => {
  const query = 'select * from vw_';
  const res = getSqlCompletions(query, query.length, sqlServerConn);

  assert.ok(res.items.length >= 3);
  assert.ok(res.items.every((i) => i.name.startsWith('vw_')));
  assert.ok(res.items.some((i) => i.kind === 'view' && i.name === 'vw_inventory_activity'));
  assert.ok(res.items.some((i) => i.kind === 'view' && i.name === 'vw_customer_orders'));
});

test('getSqlCompletions prioritizes procedures after EXEC / CALL', () => {
  const query = 'EXEC sp_';
  const res = getSqlCompletions(query, query.length, sqlServerConn);

  assert.ok(res.items.length >= 3);
  assert.equal(res.items[0].kind, 'procedure');
  assert.ok(res.items.some((i) => i.name === 'sp_get_inventory_logs'));
  assert.ok(res.items.some((i) => i.name === 'sp_get_customer_orders'));
});

test('getSqlCompletions suggests table columns when qualified with table name or alias', () => {
  const query = 'SELECT c.fi FROM customers c';
  const cursor = 'SELECT c.fi'.length;
  const res = getSqlCompletions(query, cursor, sqliteConn);

  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].name, 'first_name');
  assert.equal(res.items[0].kind, 'column');
  assert.equal(res.replaceStart, 'SELECT c.'.length);
  assert.equal(res.replaceEnd, cursor);
});
