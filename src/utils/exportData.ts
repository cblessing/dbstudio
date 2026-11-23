import { QueryResult } from '../types/database';

export function formatSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

export function mergePaginatedResults(
  prev: QueryResult | null,
  next: QueryResult
): QueryResult {
  if (!prev) return next;
  const mergedRows = [...prev.rows, ...next.rows];
  return {
    ...prev,
    rows: mergedRows,
    rowCount: mergedRows.length,
    fetchTimeMs: +(prev.fetchTimeMs + next.fetchTimeMs).toFixed(2),
    hasMore: next.hasMore,
    nextOffset: next.nextOffset,
  };
}

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

  const colList = columns.map((c) => `\`${c}\``).join(', ');
  const insertStatements = rows.map((row) => {
    const valList = columns.map((col) => formatSqlValue(row[col])).join(', ');
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

function getVsCodeApi(): { postMessage: (msg: any) => void } | null {
  const g = globalThis as any;
  if (g.__vscodeApi) return g.__vscodeApi;
  if (typeof g.acquireVsCodeApi === 'function') {
    try {
      g.__vscodeApi = g.acquireVsCodeApi();
      return g.__vscodeApi;
    } catch {
      return null;
    }
  }
  return null;
}

export function postVsCodeMessage(msg: any): boolean {
  const vscode = getVsCodeApi();
  if (vscode) {
    vscode.postMessage(msg);
    return true;
  }
  return false;
}

export function downloadFile(
  filename: string,
  content: string | Uint8Array,
  mimeType = 'text/plain'
): void {
  const vscode = getVsCodeApi();
  if (vscode) {
    if (content instanceof Uint8Array) {
      let binary = '';
      for (let i = 0; i < content.byteLength; i++) {
        binary += String.fromCharCode(content[i]);
      }
      vscode.postMessage({
        command: 'saveFile',
        filename,
        content: btoa(binary),
        isBase64: true,
      });
    } else {
      vscode.postMessage({
        command: 'saveFile',
        filename,
        content,
        isBase64: false,
      });
    }
    return;
  }

  const blob = new Blob([content as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
