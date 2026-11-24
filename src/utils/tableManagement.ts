import { ColumnDefinition, DatabaseType } from '../types/database';

export const COMMON_COLUMN_TYPES = [
  'INTEGER',
  'VARCHAR(100)',
  'VARCHAR(255)',
  'TEXT',
  'DECIMAL(10,2)',
  'TIMESTAMP',
  'BOOLEAN',
] as const;

const SAFE_DEFAULT_KEYWORDS = new Set([
  'NULL',
  'TRUE',
  'FALSE',
  'CURRENT_TIMESTAMP',
  'CURRENT_DATE',
  'CURRENT_TIME',
]);

function cleanIdentifier(name: string): string {
  return name.replace(/[`"[\];\r\n]/g, '').trim();
}

function escapeSqlStringLiteral(val: string): string {
  return val.replace(/'/g, "''");
}

function sanitizeColumnType(rawType: string): string {
  const beforeSemicolon = rawType.split(';')[0];
  const cleaned = beforeSemicolon.replace(/[\r\n]/g, '').replace(/--.*$/g, '').trim();
  return cleaned || 'TEXT';
}

function formatDefaultValue(rawDefault: string): string {
  const trimmed = rawDefault.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return trimmed;
  if (SAFE_DEFAULT_KEYWORDS.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    const inner = trimmed.slice(1, -1).replace(/''/g, "'");
    return `'${escapeSqlStringLiteral(inner)}'`;
  }
  return `'${escapeSqlStringLiteral(trimmed)}'`;
}

function quoteIdentifier(name: string, dialect: DatabaseType): string {
  const clean = cleanIdentifier(name);
  if (dialect === 'oracle') return `"${clean.toUpperCase()}"`;
  if (dialect === 'sqlserver') return `[${clean}]`;
  return `\`${clean}\``;
}

function qualifyTable(tableName: string, dialect: DatabaseType): string {
  const clean = cleanIdentifier(tableName);
  if (dialect === 'oracle') return `"${clean.toUpperCase()}"`;
  if (dialect === 'sqlserver') return `[dbo].[${clean}]`;
  return `\`${clean}\``;
}

function appendColumnConstraints(col: ColumnDefinition): string {
  let suffix = '';
  if (col.primaryKey) {
    suffix += ' PRIMARY KEY';
  } else if (!col.nullable) {
    suffix += ' NOT NULL';
  }
  if (col.defaultValue) {
    suffix += ` DEFAULT ${formatDefaultValue(col.defaultValue)}`;
  }
  return suffix;
}

export function generateDropTableSql(
  tableName: string,
  ifExists = true,
  dialect: DatabaseType = 'sqlite'
): string {
  if (dialect === 'oracle') {
    return `DROP TABLE ${qualifyTable(tableName, 'oracle')} CASCADE CONSTRAINTS;`;
  }

  if (dialect === 'sqlserver') {
    const qualified = qualifyTable(tableName, 'sqlserver');
    const escapedLiteral = escapeSqlStringLiteral(qualified);
    return `IF OBJECT_ID(N'${escapedLiteral}', N'U') IS NOT NULL DROP TABLE ${qualified};`;
  }

  return `DROP TABLE ${ifExists ? 'IF EXISTS ' : ''}${qualifyTable(tableName, dialect)};`;
}

export function generateTruncateTableSql(
  tableName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  if (dialect === 'oracle' || dialect === 'sqlserver') {
    return `TRUNCATE TABLE ${qualifyTable(tableName, dialect)};`;
  }

  return `DELETE FROM ${qualifyTable(tableName, dialect)};`;
}

export function generateRenameTableSql(
  oldName: string,
  newName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  const safeOld = cleanIdentifier(oldName);
  const safeNew = cleanIdentifier(newName);

  if (dialect === 'sqlserver') {
    return `EXEC sp_rename 'dbo.${escapeSqlStringLiteral(safeOld)}', '${escapeSqlStringLiteral(safeNew)}';`;
  }

  return `ALTER TABLE ${quoteIdentifier(safeOld, dialect)} RENAME TO ${quoteIdentifier(safeNew, dialect)};`;
}

function mapDialectAddColumnType(rawType: string, dialect: DatabaseType): string {
  const sanitized = sanitizeColumnType(rawType);
  const upper = sanitized.toUpperCase();
  if (dialect === 'oracle' && upper === 'VARCHAR') return 'VARCHAR2(100)';
  if (dialect === 'oracle' && upper === 'INTEGER') return 'NUMBER';
  if (dialect === 'sqlserver' && upper === 'VARCHAR') return 'NVARCHAR(100)';
  return sanitized;
}

function buildColumnNullAndDefaultSuffix(
  col: ColumnDefinition,
  includeExplicitNull: boolean
): string {
  let suffix = '';
  if (!col.nullable) {
    suffix += ' NOT NULL';
  } else if (includeExplicitNull) {
    suffix += ' NULL';
  }
  if (col.defaultValue) {
    suffix += ` DEFAULT ${formatDefaultValue(col.defaultValue)}`;
  }
  return suffix;
}

export function generateAddColumnSql(
  tableName: string,
  col: ColumnDefinition,
  dialect: DatabaseType = 'sqlite'
): string {
  const type = mapDialectAddColumnType(col.type, dialect);
  const tableId = qualifyTable(tableName, dialect);
  const colId = quoteIdentifier(col.name, dialect);

  if (dialect === 'oracle') {
    return `ALTER TABLE ${tableId} ADD (${colId} ${type}${buildColumnNullAndDefaultSuffix(col, false)});`;
  }

  if (dialect === 'sqlserver') {
    return `ALTER TABLE ${tableId} ADD ${colId} ${type}${buildColumnNullAndDefaultSuffix(col, true)};`;
  }

  return `ALTER TABLE ${tableId} ADD COLUMN ${colId} ${type}${buildColumnNullAndDefaultSuffix(col, false)};`;
}

function mapDialectCreateColumnType(col: ColumnDefinition, dialect: DatabaseType): string {
  const sanitizedType = sanitizeColumnType(col.type);
  const upperType = sanitizedType.toUpperCase();
  if (dialect === 'oracle') {
    if (upperType.includes('AUTOINCREMENT') || (col.primaryKey && upperType === 'INTEGER')) {
      return 'NUMBER GENERATED BY DEFAULT ON NULL AS IDENTITY';
    }
    if (upperType.startsWith('VARCHAR')) {
      return sanitizedType.replace(/VARCHAR/i, 'VARCHAR2');
    }
  } else if (dialect === 'sqlserver') {
    if (col.primaryKey && upperType === 'INTEGER') {
      return 'INT IDENTITY(1,1)';
    }
    if (upperType.startsWith('VARCHAR')) {
      return sanitizedType.replace(/VARCHAR/i, 'NVARCHAR');
    }
  }
  return sanitizedType;
}

export function generateRenameColumnSql(
  tableName: string,
  oldColName: string,
  newColName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  if (dialect === 'sqlserver') {
    const target = escapeSqlStringLiteral(
      `${qualifyTable(tableName, 'sqlserver')}.${quoteIdentifier(oldColName, 'sqlserver')}`
    );
    const nextName = escapeSqlStringLiteral(cleanIdentifier(newColName));
    return `EXEC sp_rename '${target}', '${nextName}', 'COLUMN';`;
  }

  return `ALTER TABLE ${qualifyTable(tableName, dialect)} RENAME COLUMN ${quoteIdentifier(oldColName, dialect)} TO ${quoteIdentifier(newColName, dialect)};`;
}

export function generateDropColumnSql(
  tableName: string,
  colName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  return `ALTER TABLE ${qualifyTable(tableName, dialect)} DROP COLUMN ${quoteIdentifier(colName, dialect)};`;
}

export function generateCreateTableSql(
  tableName: string,
  columns: ColumnDefinition[],
  dialect: DatabaseType = 'sqlite'
): string {
  const colDefs = columns.map((col) => {
    const type = mapDialectCreateColumnType(col, dialect);
    return `  ${quoteIdentifier(col.name, dialect)} ${type}${appendColumnConstraints(col)}`;
  });

  return `CREATE TABLE ${qualifyTable(tableName, dialect)} (\n${colDefs.join(',\n')}\n);`;
}

export function generateCreateViewTemplateSql(
  schemaName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  const safeSchema = cleanIdentifier(schemaName) || 'public';
  if (dialect === 'sqlserver') {
    return `CREATE OR ALTER VIEW [${safeSchema}].[new_view]\nAS\nSELECT\n  *\nFROM [${safeSchema}].[your_table];\n`;
  }
  if (dialect === 'oracle') {
    return `CREATE OR REPLACE VIEW "${safeSchema.toUpperCase()}"."NEW_VIEW" AS\nSELECT\n  *\nFROM your_table;\n`;
  }
  if (dialect === 'postgres') {
    return `CREATE OR REPLACE VIEW "${safeSchema}"."new_view" AS\nSELECT\n  *\nFROM "${safeSchema}"."your_table";\n`;
  }
  if (dialect === 'sqlite') {
    return `CREATE VIEW IF NOT EXISTS \`new_view\` AS\nSELECT\n  *\nFROM \`your_table\`;\n`;
  }
  return `CREATE OR REPLACE VIEW \`${safeSchema}\`.\`new_view\` AS\nSELECT\n  *\nFROM \`${safeSchema}\`.\`your_table\`;\n`;
}

export function generateCreateProcedureTemplateSql(
  schemaName: string,
  dialect: DatabaseType = 'sqlite'
): string {
  const safeSchema = cleanIdentifier(schemaName) || 'public';
  if (dialect === 'postgres') {
    return `CREATE OR REPLACE PROCEDURE "${safeSchema}"."new_procedure"()\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- Add statements here\nEND;\n$$;\n`;
  }
  if (dialect === 'sqlserver') {
    return `CREATE OR ALTER PROCEDURE [${safeSchema}].[new_procedure]\nAS\nBEGIN\n  SET NOCOUNT ON;\n  -- Add statements here\nEND;\n`;
  }
  if (dialect === 'oracle') {
    return `CREATE OR REPLACE PROCEDURE "${safeSchema.toUpperCase()}"."NEW_PROCEDURE" AS\nBEGIN\n  -- Add statements here\n  NULL;\nEND;\n`;
  }
  if (dialect === 'mysql' || dialect === 'mariadb') {
    return `CREATE PROCEDURE \`${safeSchema}\`.\`new_procedure\`()\nBEGIN\n  -- Add statements here\nEND;\n`;
  }
  return `-- Create procedure template\nCREATE PROCEDURE new_procedure()\nBEGIN\n  -- Add statements here\nEND;\n`;
}
