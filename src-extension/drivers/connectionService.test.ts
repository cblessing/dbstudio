import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveConnectionService, SecretStoreLike } from './connectionService';
import {
  LiveDatabaseDriver,
  sanitizeErrorMessage,
  validateConnectionConfig,
} from './types';

function createMockSecretStore(): SecretStoreLike & { storeMap: Map<string, string> } {
  const storeMap = new Map<string, string>();
  return {
    storeMap,
    get: async (key) => storeMap.get(key),
    store: async (key, value) => {
      storeMap.set(key, value);
    },
    delete: async (key) => {
      storeMap.delete(key);
    },
  };
}

test('validateConnectionConfig rejects invalid host, port, and unsupported driver types', () => {
  assert.equal(validateConnectionConfig(null).valid, false);
  assert.equal(
    validateConnectionConfig({ id: 'c1', type: 'sqlite', host: 'localhost', port: 5432 }).valid,
    false
  );
  assert.equal(
    validateConnectionConfig({ id: 'c1', type: 'postgres', host: 'bad host; rm -rf', port: 5432 }).valid,
    false
  );
  assert.equal(
    validateConnectionConfig({ id: 'c1', type: 'postgres', host: '127.0.0.1', port: 99999 }).valid,
    false
  );

  const ok = validateConnectionConfig({
    id: 'conn_pg_1',
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'appdb',
    username: 'postgres',
    ssl: true,
  });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.config.rejectUnauthorized, true);
  }
});

test('sanitizeErrorMessage redacts connection URIs and inline credentials', () => {
  const msg = sanitizeErrorMessage(
    new Error('Failed connecting to postgres://admin:SuperSecret123@db.internal:5432/prod password=abc')
  );
  assert.ok(!msg.includes('SuperSecret123'));
  assert.ok(!msg.includes('password=abc'));
  assert.ok(msg.includes('[redacted-uri]'));
  assert.ok(msg.includes('password=[redacted]'));
});

test('LiveConnectionService stores secrets in SecretStorage, passes them to drivers, and deletes on removal', async () => {
  const secrets = createMockSecretStore();
  let observedPassword = '';

  const mockDriver: LiveDatabaseDriver = {
    async testConnection(_cfg, pwd) {
      observedPassword = pwd;
      return { success: true, latencyMs: 3.2, version: 'PostgreSQL 17', message: 'OK' };
    },
    async executeQuery(_cfg, pwd, query) {
      observedPassword = pwd;
      return {
        columns: ['ok'],
        rows: [{ ok: 1 }],
        executionTimeMs: 1.5,
        fetchTimeMs: 0.1,
        rowCount: 1,
        query,
      };
    },
    async introspectSchema() {
      return [];
    },
  };

  const service = new LiveConnectionService(secrets, { postgres: mockDriver });
  const saved = await service.saveConnection(
    {
      id: 'conn_pg_live',
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'testdb',
      username: 'postgres',
      ssl: false,
    },
    'MyTopSecretPass!'
  );

  assert.equal('password' in saved, false);
  assert.equal(secrets.storeMap.get('dbstudio.conn.conn_pg_live.password'), 'MyTopSecretPass!');

  const res = await service.executeQuery('conn_pg_live', 'SELECT 1 AS ok');
  assert.equal(observedPassword, 'MyTopSecretPass!');
  assert.equal(res.rowCount, 1);

  await service.deleteConnection('conn_pg_live');
  assert.equal(secrets.storeMap.has('dbstudio.conn.conn_pg_live.password'), false);
  assert.equal(service.hasConnection('conn_pg_live'), false);
});
