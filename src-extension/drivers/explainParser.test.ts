import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isExplainableSql,
  parsePostgresExplainJson,
  parseMysqlExplainRows,
  parseClickHouseExplainRows,
  parseTextExplainLines,
} from './explainParser';

test('isExplainableSql allows DML/SELECT queries and skips EXPLAIN or DDL', () => {
  assert.equal(isExplainableSql('SELECT * FROM customers;'), true);
  assert.equal(isExplainableSql('-- comment\nWITH cte AS (SELECT 1) SELECT * FROM cte'), true);
  assert.equal(isExplainableSql('EXPLAIN SELECT * FROM customers'), false);
  assert.equal(isExplainableSql('CREATE TABLE foo (id INT)'), false);
  assert.equal(isExplainableSql('   '), false);
});

test('parsePostgresExplainJson converts nested Postgres JSON plans into steps', () => {
  const sample = [
    {
      Plan: {
        'Node Type': 'Hash Join',
        'Join Type': 'Inner',
        'Startup Cost': 1.15,
        'Total Cost': 25.4,
        'Plan Rows': 42,
        'Hash Cond': '(o.customer_id = c.id)',
        Plans: [
          {
            'Node Type': 'Seq Scan',
            'Relation Name': 'orders',
            Schema: 'public',
            'Startup Cost': 0,
            'Total Cost': 12.5,
            'Plan Rows': 100,
          },
          {
            'Node Type': 'Index Scan',
            'Relation Name': 'customers',
            'Index Name': 'customers_pkey',
            'Startup Cost': 0.15,
            'Total Cost': 8.2,
            'Plan Rows': 10,
          },
        ],
      },
    },
  ];

  const steps = parsePostgresExplainJson(sample);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].operation, 'Hash Join');
  assert.equal(steps[0].cost, '1.15..25.40');
  assert.equal(steps[0].rowsEstimate, 42);
  assert.match(steps[0].details, /Hash Cond: \(o\.customer_id = c\.id\)/);
  assert.equal(steps[0].children?.length, 2);
  assert.equal(steps[0].children?.[0].target, 'public.orders');
  assert.equal(steps[0].children?.[1].operation, 'Index Scan');
});

test('parseMysqlExplainRows maps MySQL EXPLAIN rows to execution plan steps', () => {
  const steps = parseMysqlExplainRows([
    { select_type: 'SIMPLE', table: 'customers', type: 'const', key: 'PRIMARY', rows: 1, Extra: 'Using index' },
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].operation, 'INDEX CONST');
  assert.equal(steps[0].target, 'customers');
  assert.equal(steps[0].rowsEstimate, 1);
  assert.match(steps[0].details, /Key: PRIMARY/);
});

test('parseClickHouseExplainRows and parseTextExplainLines map text lines cleanly', () => {
  const chSteps = parseClickHouseExplainRows([{ explain: 'Expression (Projection)' }, { explain: 'ReadFromMergeTree' }]);
  assert.equal(chSteps.length, 2);
  assert.equal(chSteps[0].operation, 'PIPELINE STEP');
  assert.equal(chSteps[1].details, 'ReadFromMergeTree');

  const textSteps = parseTextExplainLines(['', 'Plan hash value: 1234', '   ']);
  assert.equal(textSteps.length, 1);
  assert.equal(textSteps[0].details, 'Plan hash value: 1234');
});
