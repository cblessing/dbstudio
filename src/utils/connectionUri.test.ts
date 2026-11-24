import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConnectionUri } from './connectionUri';

test('parseConnectionUri parses PostgreSQL URI with credentials and sslmode', () => {
  const res = parseConnectionUri('postgresql://postgres:secret%21@127.0.0.1:5432/dbstudio?sslmode=require&rejectUnauthorized=false');
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.type, 'postgres');
    assert.equal(res.value.host, '127.0.0.1');
    assert.equal(res.value.port, 5432);
    assert.equal(res.value.database, 'dbstudio');
    assert.equal(res.value.username, 'postgres');
    assert.equal(res.value.password, 'secret!');
    assert.equal(res.value.ssl, true);
    assert.equal(res.value.allowSelfSigned, true);
  }
});

test('parseConnectionUri detects rediss and mongodb+srv TLS defaults', () => {
  const redisRes = parseConnectionUri('rediss://:mypwd@127.0.0.1:6379/0');
  assert.equal(redisRes.ok, true);
  if (redisRes.ok) {
    assert.equal(redisRes.value.type, 'redis');
    assert.equal(redisRes.value.ssl, true);
    assert.equal(redisRes.value.password, 'mypwd');
  }

  const mongoRes = parseConnectionUri('mongodb+srv://root:pass@cluster.example.net/admin');
  assert.equal(mongoRes.ok, true);
  if (mongoRes.ok) {
    assert.equal(mongoRes.value.type, 'mongodb');
    assert.equal(mongoRes.value.ssl, true);
    assert.equal(mongoRes.value.database, 'admin');
  }
});

test('parseConnectionUri rejects empty and malformed URIs', () => {
  assert.equal(parseConnectionUri('').ok, false);
  assert.equal(parseConnectionUri('not-a-uri').ok, false);
});
