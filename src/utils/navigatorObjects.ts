import { DatabaseType, SchemaDefinition } from '../types/database';
import {
  generateCreateViewTemplateSql,
  generateCreateProcedureTemplateSql,
} from './tableManagement';

export function quoteDialectIdentifier(name: string, dialect: DatabaseType): string {
  const cleaned = name.replace(/[`"[\];\r\n]/g, '').trim() || 'object';
  if (dialect === 'sqlserver') return `[${cleaned}]`;
  if (dialect === 'postgres' || dialect === 'oracle') return `"${cleaned}"`;
  return `\`${cleaned}\``;
}

export function generateSelectTableSql(
  tableName: string,
  dialect: DatabaseType,
  limit = 1000,
  offset = 0
): string {
  if (dialect === 'mongodb') {
    return JSON.stringify({ find: tableName, limit, skip: offset }, null, 2);
  }
  if (dialect === 'redis') {
    return 'KEYS *';
  }
  const id = quoteDialectIdentifier(tableName, dialect);
  if (dialect === 'oracle') {
    return `SELECT * FROM ${id} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  }
  if (dialect === 'sqlserver') {
    return offset > 0
      ? `SELECT * FROM ${id} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
      : `SELECT TOP ${limit} * FROM ${id}`;
  }
  return offset > 0
    ? `SELECT * FROM ${id} LIMIT ${limit} OFFSET ${offset}`
    : `SELECT * FROM ${id} LIMIT ${limit}`;
}

export function generateInsertTemplateSql(
  tableName: string,
  columns: { name: string; primaryKey?: boolean }[],
  dialect: DatabaseType
): string {
  const id = quoteDialectIdentifier(tableName, dialect);
  const nonPk = columns.filter((c) => !c.primaryKey);
  const targetCols = nonPk.length > 0 ? nonPk : columns;
  const colList = targetCols.map((c) => quoteDialectIdentifier(c.name, dialect)).join(', ');
  const placeholders = targetCols.map(() => '?').join(', ');
  return `INSERT INTO ${id} (${colList})\nVALUES (${placeholders});`;
}

export function generateGroupByColumnSql(
  tableName: string,
  colName: string,
  dialect: DatabaseType
): string {
  const tblId = quoteDialectIdentifier(tableName, dialect);
  const colId = quoteDialectIdentifier(colName, dialect);
  return `SELECT ${colId}, COUNT(*) AS count\nFROM ${tblId}\nGROUP BY ${colId}\nORDER BY count DESC;`;
}

export function removeObjectFromSchema(
  schema: SchemaDefinition,
  kind: 'view' | 'procedure' | 'function' | 'package',
  objectName: string
): SchemaDefinition {
  if (kind === 'view') {
    return { ...schema, views: (schema.views ?? []).filter((v) => v.name !== objectName) };
  }
  if (kind === 'procedure') {
    return { ...schema, procedures: (schema.procedures ?? []).filter((p) => p.name !== objectName) };
  }
  if (kind === 'function') {
    return { ...schema, functions: (schema.functions ?? []).filter((f) => f.name !== objectName) };
  }
  return { ...schema, packages: (schema.packages ?? []).filter((p) => p.name !== objectName) };
}

export type ObjectGroupKind = 'tables' | 'views' | 'procedures' | 'functions' | 'packages';

export interface ObjectGroupSpec {
  kind: ObjectGroupKind;
  label: string;
  singularLabel: string;
  colorClass: string;
  defaultExpanded: boolean;
  supportsCreate: boolean;
}

const TABLES_GROUP: ObjectGroupSpec = {
  kind: 'tables',
  label: 'Tables',
  singularLabel: 'Table',
  colorClass: 'text-blue-400',
  defaultExpanded: true,
  supportsCreate: true,
};

const VIEWS_GROUP: ObjectGroupSpec = {
  kind: 'views',
  label: 'Views',
  singularLabel: 'View',
  colorClass: 'text-emerald-400',
  defaultExpanded: false,
  supportsCreate: true,
};

const PROCEDURES_GROUP: ObjectGroupSpec = {
  kind: 'procedures',
  label: 'Procedures',
  singularLabel: 'Procedure',
  colorClass: 'text-amber-400',
  defaultExpanded: false,
  supportsCreate: true,
};

const STORED_PROCEDURES_GROUP: ObjectGroupSpec = {
  ...PROCEDURES_GROUP,
  label: 'Stored Procedures',
  singularLabel: 'Stored Procedure',
};

const FUNCTIONS_GROUP: ObjectGroupSpec = {
  kind: 'functions',
  label: 'Functions',
  singularLabel: 'Function',
  colorClass: 'text-purple-400',
  defaultExpanded: false,
  supportsCreate: true,
};

const PACKAGES_GROUP: ObjectGroupSpec = {
  kind: 'packages',
  label: 'Packages',
  singularLabel: 'Package',
  colorClass: 'text-rose-400',
  defaultExpanded: false,
  supportsCreate: true,
};

const GROUPS_BY_ENGINE: Partial<Record<DatabaseType, ObjectGroupSpec[]>> = {
  oracle: [TABLES_GROUP, VIEWS_GROUP, PROCEDURES_GROUP, FUNCTIONS_GROUP, PACKAGES_GROUP],
  postgres: [TABLES_GROUP, VIEWS_GROUP, FUNCTIONS_GROUP, PROCEDURES_GROUP],
  mysql: [TABLES_GROUP, VIEWS_GROUP, PROCEDURES_GROUP, FUNCTIONS_GROUP],
  mariadb: [TABLES_GROUP, VIEWS_GROUP, PROCEDURES_GROUP, FUNCTIONS_GROUP],
  sqlserver: [TABLES_GROUP, VIEWS_GROUP, STORED_PROCEDURES_GROUP, FUNCTIONS_GROUP],
  mongodb: [
    {
      kind: 'tables',
      label: 'Collections',
      singularLabel: 'Collection',
      colorClass: 'text-emerald-400',
      defaultExpanded: true,
      supportsCreate: false,
    },
    { ...VIEWS_GROUP, supportsCreate: false },
  ],
  redis: [
    {
      kind: 'tables',
      label: 'Keyspace',
      singularLabel: 'Keyspace',
      colorClass: 'text-rose-400',
      defaultExpanded: true,
      supportsCreate: false,
    },
  ],
};

export function getObjectGroupsForEngine(type: DatabaseType): ObjectGroupSpec[] {
  return GROUPS_BY_ENGINE[type] ?? [TABLES_GROUP, VIEWS_GROUP];
}

export function generateCreateFunctionTemplateSql(
  schemaName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  const schema = schemaName.trim();
  const prefix = schema ? `${quoteDialectIdentifier(schema, dialect)}.` : '';
  const funcId = `${prefix}${quoteDialectIdentifier('new_function', dialect)}`;

  if (dialect === 'postgres') {
    return `CREATE OR REPLACE FUNCTION ${funcId}(p_input INTEGER)\nRETURNS INTEGER\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  RETURN p_input;\nEND;\n$$;\n`;
  }
  if (dialect === 'sqlserver') {
    return `CREATE OR ALTER FUNCTION ${funcId} (@input INT)\nRETURNS INT\nAS\nBEGIN\n  RETURN @input;\nEND;\n`;
  }
  if (dialect === 'oracle') {
    return `CREATE OR REPLACE FUNCTION ${funcId} (p_input IN NUMBER)\nRETURN NUMBER\nAS\nBEGIN\n  RETURN p_input;\nEND;\n/\n`;
  }
  return `CREATE FUNCTION ${funcId}(p_input INT)\nRETURNS INT\nDETERMINISTIC\nBEGIN\n  RETURN p_input;\nEND;\n`;
}

export function generateCreatePackageTemplateSql(schemaName: string): string {
  const schema = schemaName.trim();
  const prefix = schema ? `${quoteDialectIdentifier(schema, 'oracle')}.` : '';
  const pkgId = `${prefix}${quoteDialectIdentifier('NEW_PACKAGE', 'oracle')}`;
  return [
    `CREATE OR REPLACE PACKAGE ${pkgId} AS`,
    `  PROCEDURE do_work;`,
    `END;`,
    `/`,
    ``,
    `CREATE OR REPLACE PACKAGE BODY ${pkgId} AS`,
    `  PROCEDURE do_work IS`,
    `  BEGIN`,
    `    NULL;`,
    `  END do_work;`,
    `END;`,
    `/`,
    ``,
  ].join('\n');
}

export function generateCreateObjectTemplateSql(
  kind: Exclude<ObjectGroupKind, 'tables'>,
  schemaName: string,
  dialect: DatabaseType
): string {
  if (kind === 'views') return generateCreateViewTemplateSql(schemaName, dialect);
  if (kind === 'procedures') return generateCreateProcedureTemplateSql(schemaName, dialect);
  if (kind === 'functions') return generateCreateFunctionTemplateSql(schemaName, dialect);
  return generateCreatePackageTemplateSql(schemaName);
}

export function generateDropObjectSql(
  kind: 'view' | 'procedure' | 'function' | 'package',
  objectName: string,
  dialect: DatabaseType
): string {
  const id = quoteDialectIdentifier(objectName, dialect);
  const keyword = kind.toUpperCase();
  if (dialect === 'oracle') {
    return `DROP ${keyword} ${id};`;
  }
  return `DROP ${keyword} IF EXISTS ${id};`;
}

export function generateRoutineRunSql(
  kind: 'procedure' | 'function' | 'package',
  objectName: string,
  dialect: DatabaseType
): string {
  const id = quoteDialectIdentifier(objectName, dialect);
  if (kind === 'function') {
    return dialect === 'oracle' ? `SELECT ${id}() FROM DUAL;` : `SELECT ${id}();`;
  }
  if (kind === 'package') {
    return `BEGIN\n  ${id}.do_work;\nEND;\n/`;
  }
  if (dialect === 'postgres' || dialect === 'mysql' || dialect === 'mariadb') {
    return `CALL ${id}();`;
  }
  if (dialect === 'oracle') {
    return `BEGIN\n  ${id};\nEND;\n/`;
  }
  return `EXEC ${id};`;
}
