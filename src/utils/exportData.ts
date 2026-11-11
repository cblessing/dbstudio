export function exportToCsv(columns: string[], rows: Record<string, any>[]): string {
  if (!columns.length) return '';
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map(escapeCell).join(',');
  const rowLines = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(','));

  return [headerLine, ...rowLines].join('\n');
}

export function exportToJson(rows: Record<string, any>[]): string {
  return JSON.stringify(rows, null, 2);
}

export function exportToSqlInsert(
  tableName: string,
  columns: string[],
  rows: Record<string, any>[]
): string {
  if (!columns.length || !rows.length) return '';
  const safeTable = tableName || 'exported_table';

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const colList = columns.map((c) => `\`${c}\``).join(', ');
  const insertStatements = rows.map((row) => {
    const valList = columns.map((col) => formatValue(row[col])).join(', ');
    return `INSERT INTO \`${safeTable}\` (${colList}) VALUES (${valList});`;
  });

  return insertStatements.join('\n');
}

export function exportToMarkdown(columns: string[], rows: Record<string, any>[]): string {
  if (!columns.length) return '';

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val).replace(/\|/g, '\\|');
  };

  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((c) => formatCell(row[c])).join(' | ')} |`);

  return [header, separator, ...body].join('\n');
}
