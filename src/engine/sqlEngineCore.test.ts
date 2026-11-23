import test from 'node:test';
import assert from 'node:assert/strict';
import { DATABASE_DRIVERS, generateExecutionPlan, INITIAL_ECOMMERCE_TABLES } from './sqlEngineCore';

test('DATABASE_DRIVERS contains all major relational and analytical database engines', () => {
  const driverIds = DATABASE_DRIVERS.map((d) => d.id);
  assert.ok(driverIds.includes('sqlite'));
  assert.ok(driverIds.includes('postgres'));
  assert.ok(driverIds.includes('mysql'));
  assert.ok(driverIds.includes('duckdb'));
  assert.ok(driverIds.includes('oracle'));
  assert.ok(driverIds.includes('sqlserver'));
  assert.ok(driverIds.includes('clickhouse'));
  assert.ok(driverIds.includes('snowflake'));
  assert.ok(driverIds.includes('mongodb'));
  assert.ok(driverIds.includes('redis'));
});

test('generateExecutionPlan produces HASH JOIN and child scan steps for queries with JOIN', () => {
  const plan = generateExecutionPlan('SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id');
  assert.ok(plan.length > 0);
  const hashJoin = plan.find((step) => step.operation === 'HASH JOIN');
  assert.ok(hashJoin);
  assert.ok(hashJoin.children && hashJoin.children.length === 2);
});

test('INITIAL_ECOMMERCE_TABLES contains foreign key definitions for ER diagrams', () => {
  const products = INITIAL_ECOMMERCE_TABLES.find((t) => t.name === 'products');
  assert.ok(products);
  assert.ok(products.foreignKeys && products.foreignKeys.length > 0);
  assert.equal(products.foreignKeys[0].foreignTable, 'categories');
});
