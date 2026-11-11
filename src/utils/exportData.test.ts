import test from 'node:test';
import assert from 'node:assert/strict';
import { exportToCsv, exportToJson, exportToSqlInsert, exportToMarkdown } from './exportData';

const sampleCols = ['id', 'name', 'price', 'description'];
const sampleRows = [
  { id: 1, name: 'Gadget', price: 29.99, description: 'Cool, fast gadget' },
  { id: 2, name: 'Widget', price: 9.99, description: 'Standard "classic" widget' },
];

test('exportToCsv escapes quotes and commas correctly', () => {
  const csv = exportToCsv(sampleCols, sampleRows);
  const lines = csv.split('\n');

  assert.equal(lines[0], 'id,name,price,description');
  assert.ok(lines[1].includes('"Cool, fast gadget"'));
  assert.ok(lines[2].includes('""classic""'));
});

test('exportToJson serializes array properly', () => {
  const json = exportToJson(sampleRows);
  const parsed = JSON.parse(json);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Gadget');
});

test('exportToSqlInsert generates valid INSERT queries', () => {
  const sql = exportToSqlInsert('products', sampleCols, sampleRows);
  const statements = sql.split('\n');

  assert.equal(statements.length, 2);
  assert.ok(statements[0].startsWith('INSERT INTO `products` (`id`, `name`, `price`, `description`) VALUES (1, \'Gadget\', 29.99, \'Cool, fast gadget\');'));
});

test('exportToMarkdown creates markdown tables with header and pipes', () => {
  const md = exportToMarkdown(sampleCols, sampleRows);

  assert.ok(md.includes('| id | name | price | description |'));
  assert.ok(md.includes('| --- | --- | --- | --- |'));
  assert.ok(md.includes('| 1 | Gadget | 29.99 | Cool, fast gadget |'));
});
