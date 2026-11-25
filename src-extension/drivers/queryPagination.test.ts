import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LIVE_BATCH_SIZE,
  isUnboundedLiveSelect,
  applyLivePagination,
  finalizePaginatedResult,
} from './queryPagination';

test('isUnboundedLiveSelect detects unbounded SELECT/WITH and skips explicit limits or DML', () => {
  assert.equal(isUnboundedLiveSelect('SELECT * FROM customers;'), true);
  assert.equal(isUnboundedLiveSelect('WITH c AS (SELECT 1) SELECT * FROM c'), true);
  assert.equal(isUnboundedLiveSelect('SELECT * FROM customers LIMIT 100'), false);
  assert.equal(isUnboundedLiveSelect('SELECT TOP 50 * FROM customers'), false);
  assert.equal(isUnboundedLiveSelect('SELECT * FROM customers FETCH FIRST 20 ROWS ONLY'), false);
  assert.equal(isUnboundedLiveSelect('UPDATE customers SET city = \'NY\''), false);
});

test('applyLivePagination generates dialect-appropriate batchSize + 1 queries', () => {
  const pg = applyLivePagination('SELECT * FROM "customers";', 'postgres', 1000, 0);
  assert.equal(pg.paginated, true);
  assert.equal(pg.effectiveQuery, 'SELECT * FROM "customers" LIMIT 1001 OFFSET 0');

  const ora = applyLivePagination('SELECT * FROM "CUSTOMERS"', 'oracle', 1000, 1000);
  assert.equal(ora.paginated, true);
  assert.equal(ora.effectiveQuery, 'SELECT * FROM "CUSTOMERS" OFFSET 1000 ROWS FETCH NEXT 1001 ROWS ONLY');

  const mssql = applyLivePagination('SELECT * FROM [customers]', 'sqlserver', 1000, 0);
  assert.equal(mssql.paginated, true);
  assert.equal(
    mssql.effectiveQuery,
    'SELECT * FROM [customers] ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 1001 ROWS ONLY'
  );

  const mongo = applyLivePagination('{"find": "customers"}', 'mongodb', 1000, 0);
  assert.equal(mongo.paginated, false);
});

test('finalizePaginatedResult detects hasMore when probe row is present and computes nextOffset', () => {
  const rows = Array.from({ length: DEFAULT_LIVE_BATCH_SIZE + 1 }, (_, i) => ({ id: i + 1 }));
  const res = finalizePaginatedResult(
    {
      columns: ['id'],
      rows,
      executionTimeMs: 12,
      fetchTimeMs: 1,
      rowCount: rows.length,
      query: 'SELECT * FROM customers LIMIT 1001 OFFSET 0',
    },
    'SELECT * FROM customers',
    true,
    1000,
    0
  );

  assert.equal(res.rows.length, 1000);
  assert.equal(res.rowCount, 1000);
  assert.equal(res.hasMore, true);
  assert.equal(res.nextOffset, 1000);
  assert.equal(res.query, 'SELECT * FROM customers');

  const finalPage = finalizePaginatedResult(
    { ...res, rows: [{ id: 1001 }], rowCount: 1 },
    'SELECT * FROM customers',
    true,
    1000,
    1000
  );
  assert.equal(finalPage.hasMore, false);
  assert.equal(finalPage.nextOffset, undefined);
});
