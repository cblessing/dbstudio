import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSql } from './sqlFormatter';

test('formatSql capitalizes keywords and introduces clean line breaks', () => {
  const raw = 'select id, name from users where age > 21 order by name asc limit 10';
  const formatted = formatSql(raw);

  assert.ok(formatted.includes('SELECT'));
  assert.ok(formatted.includes('FROM users'));
  assert.ok(formatted.includes('WHERE age > 21'));
  assert.ok(formatted.includes('ORDER BY name ASC'));
  assert.ok(formatted.includes('LIMIT 10;'));
});

test('formatSql preserves string literals intact', () => {
  const raw = "select * from employees where title = 'Senior select engineer'";
  const formatted = formatSql(raw);

  assert.ok(formatted.includes("'Senior select engineer'"));
});

test('formatSql handles JOIN clauses with indentation', () => {
  const raw = 'select o.id, c.name from orders o inner join customers c on o.cust_id = c.id';
  const formatted = formatSql(raw);

  assert.ok(formatted.includes('  INNER JOIN customers c ON o.cust_id = c.id'));
});
