import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportConnectionProfiles,
  parseImportedConnectionProfiles,
  supportsErDiagram,
  getConsoleActionLabel,
} from './connectionProfiles';
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
