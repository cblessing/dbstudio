import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getObjectGroupsForEngine,
  generateCreateFunctionTemplateSql,
  generateCreatePackageTemplateSql,
  generateDropObjectSql,
  generateRoutineRunSql,
  removeObjectFromSchema,
} from './navigatorObjects';

test('getObjectGroupsForEngine returns accurate object folders per database engine', () => {
  assert.deepEqual(
    getObjectGroupsForEngine('oracle').map((g) => g.label),
    ['Tables', 'Views', 'Procedures', 'Functions', 'Packages']
  );
  assert.deepEqual(
    getObjectGroupsForEngine('postgres').map((g) => g.label),
    ['Tables', 'Views', 'Functions', 'Procedures']
  );
  assert.deepEqual(
    getObjectGroupsForEngine('sqlserver').map((g) => g.label),
    ['Tables', 'Views', 'Stored Procedures', 'Functions']
  );
  assert.deepEqual(
    getObjectGroupsForEngine('sqlite').map((g) => g.label),
    ['Tables', 'Views']
  );
  assert.deepEqual(
    getObjectGroupsForEngine('mongodb').map((g) => g.label),
    ['Collections', 'Views']
  );
  assert.deepEqual(
    getObjectGroupsForEngine('redis').map((g) => g.label),
    ['Keyspace']
  );
});

test('generateCreateFunctionTemplateSql and generateCreatePackageTemplateSql generate dialect-aware DDL', () => {
  assert.match(generateCreateFunctionTemplateSql('public', 'postgres'), /LANGUAGE plpgsql/);
  assert.match(generateCreateFunctionTemplateSql('dbo', 'sqlserver'), /CREATE OR ALTER FUNCTION \[dbo\]\.\[new_function\]/);
  assert.match(generateCreateFunctionTemplateSql('DBSTUDIO', 'oracle'), /RETURN NUMBER/);
  assert.match(generateCreatePackageTemplateSql('DBSTUDIO'), /CREATE OR REPLACE PACKAGE BODY/);
});

test('generateDropObjectSql and generateRoutineRunSql respect dialect syntax', () => {
  assert.equal(generateDropObjectSql('view', 'v_orders', 'postgres'), 'DROP VIEW IF EXISTS "v_orders";');
  assert.equal(generateDropObjectSql('package', 'PKG_UTIL', 'oracle'), 'DROP PACKAGE "PKG_UTIL";');
  assert.equal(generateRoutineRunSql('function', 'calc_tax', 'oracle'), 'SELECT "calc_tax"() FROM DUAL;');
  assert.equal(generateRoutineRunSql('procedure', 'sync_orders', 'postgres'), 'CALL "sync_orders"();');
  assert.equal(generateRoutineRunSql('procedure', 'sp_sync', 'sqlserver'), 'EXEC [sp_sync];');
});

test('removeObjectFromSchema removes only the targeted object kind and name', () => {
  const updated = removeObjectFromSchema(
    {
      name: 'DBSTUDIO',
      tables: [],
      views: [{ name: 'v1', definition: 'SELECT 1' }],
      functions: [
        { name: 'fn_keep', definition: '' },
        { name: 'fn_drop', definition: '' },
      ],
    },
    'function',
    'fn_drop'
  );
  assert.equal(updated.views?.length, 1);
  assert.deepEqual(
    updated.functions?.map((f) => f.name),
    ['fn_keep']
  );
});
