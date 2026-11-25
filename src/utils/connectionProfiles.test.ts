import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportConnectionProfiles,
  parseImportedConnectionProfiles,
  supportsErDiagram,
  getConsoleActionLabel,
  groupTablesIntoSchemas,
} from './connectionProfiles';
import { getConnectionFieldLabels } from './connectionLabels';
import { DatabaseConnection } from '../types/database';

test('supportsErDiagram and getConsoleActionLabel distinguish SQL vs NoSQL engines', () => {
  assert.equal(supportsErDiagram('postgres'), true);
  assert.equal(supportsErDiagram('oracle'), true);
  assert.equal(supportsErDiagram('mongodb'), false);
  assert.equal(supportsErDiagram('redis'), false);

  assert.equal(getConsoleActionLabel('postgres'), 'SQL Console');
  assert.equal(getConsoleActionLabel('mongodb'), 'Command Console');
  assert.equal(getConsoleActionLabel('redis'), 'Command Console');
});

test('exportConnectionProfiles excludes passwords and parseImportedConnectionProfiles validates safely', () => {
  const conns: DatabaseConnection[] = [
    {
      id: 'c1',
      name: 'Local PG',
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'dbstudio',
      username: 'postgres',
      password: 'SHOULD_NOT_EXPORT',
      ssl: true,
      rejectUnauthorized: false,
      colorBadge: '#336791',
      status: 'connected',
      schemas: [],
    },
  ];

  const json = exportConnectionProfiles(conns);
  assert.ok(!json.includes('SHOULD_NOT_EXPORT'));

  const imported = parseImportedConnectionProfiles(json);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].name, 'Local PG');
  assert.equal(imported[0].type, 'postgres');
  assert.equal(imported[0].port, 5432);
  assert.equal('password' in imported[0], false);
});

test('parseImportedConnectionProfiles skips invalid entries and throws on malformed wrapper', () => {
  const mixed = JSON.stringify({
    connections: [
      { name: 'Valid Redis', type: 'redis', host: '127.0.0.1', port: 6379, ssl: true },
      { name: 'Invalid Engine', type: 'unknown_db', host: '127.0.0.1', port: 1234 },
    ],
  });
  const imported = parseImportedConnectionProfiles(mixed);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].type, 'redis');

  assert.throws(() => parseImportedConnectionProfiles('{"invalid": true}'));
});

test('groupTablesIntoSchemas groups tables by schema, prioritizes default schema, and preserves views', () => {
  const grouped = groupTablesIntoSchemas(
    [
      { name: 'invoices', schema: 'SALES', rowCount: 0, columns: [] },
      { name: 'employees', schema: 'HR', rowCount: 0, columns: [] },
      { name: 'audit_log', schema: 'SYSTEM', rowCount: 0, columns: [] },
      { name: 'departments', schema: 'HR', rowCount: 0, columns: [] },
    ],
    'SYSTEM',
    [{ name: 'HR', tables: [], views: [{ name: 'v_emp', definition: 'SELECT 1' }], procedures: [] }]
  );

  assert.deepEqual(
    grouped.map((s) => s.name),
    ['SYSTEM', 'HR', 'SALES']
  );
  assert.deepEqual(
    grouped[1].tables.map((t) => t.name),
    ['employees', 'departments']
  );
  assert.equal(grouped[1].views?.length, 1);

  const empty = groupTablesIntoSchemas([], 'public');
  assert.deepEqual(empty, [{ name: 'public', tables: [], views: [], procedures: [] }]);
});

test('getConnectionFieldLabels returns database-specific nomenclature', () => {
  const oracle = getConnectionFieldLabels('oracle');
  assert.equal(oracle.databaseLabel, 'Service Name / SID');
  assert.equal(oracle.usernameLabel, 'Username (Schema)');

  const mssql = getConnectionFieldLabels('sqlserver');
  assert.equal(mssql.hostLabel, 'Server');
  assert.equal(mssql.usernameLabel, 'Login');

  const redis = getConnectionFieldLabels('redis');
  assert.equal(redis.databaseLabel, 'Database Index');
  assert.equal(redis.passwordLabel, 'Password / AUTH');
});
