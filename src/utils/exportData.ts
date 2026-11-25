import { QueryResult } from '../types/database';

function replaceBigInt(_key: string, val: unknown): unknown {
  return typeof val === 'bigint' ? val.toString() : val;
}

export function safeJsonStringify(value: unknown, space?: number): string {
  try {
    return JSON.stringify(value, replaceBigInt, space);
  } catch {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return val.toString();
        if (val && typeof val === 'object') {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      },
      space
    );
  }
}

export function quoteSqlIdentifier(name: string): string {
  return `\`${String(name).replace(/`/g, '``')}\``;
}

export function formatSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${safeJsonStringify(val).replace(/'/g, "''")}'`;
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

function neutralizeCsvFormula(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

export function exportToCsv(columns: string[], rows: Record<string, any>[]): string {
  if (!columns.length) return '';
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const rawStr = typeof val === 'object' ? safeJsonStringify(val) : String(val);
    const str =
      typeof val === 'number' || typeof val === 'bigint' ? rawStr : neutralizeCsvFormula(rawStr);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map(escapeCell).join(',');
  const rowLines = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(','));

  return [headerLine, ...rowLines].join('\n');
}

export function exportToJson(rows: Record<string, any>[]): string {
  return safeJsonStringify(rows, 2);
}

export function exportToSqlInsert(
  tableName: string,
  columns: string[],
  rows: Record<string, any>[]
): string {
  if (!columns.length || !rows.length) return '';
  const safeTable = quoteSqlIdentifier(tableName || 'exported_table');

  const colList = columns.map((c) => quoteSqlIdentifier(c)).join(', ');
  const insertStatements = rows.map((row) => {
    const valList = columns.map((col) => formatSqlValue(row[col])).join(', ');
    return `INSERT INTO ${safeTable} (${colList}) VALUES (${valList});`;
  });

  return insertStatements.join('\n');
}

export function exportToMarkdown(columns: string[], rows: Record<string, any>[]): string {
  if (!columns.length) return '';

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return safeJsonStringify(val).replace(/\|/g, '\\|');
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

function encodeUint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(''));
}

export function downloadFile(
  filename: string,
  content: string | Uint8Array,
  mimeType = 'text/plain'
): void {
  const vscode = getVsCodeApi();
  if (vscode) {
    if (content instanceof Uint8Array) {
      vscode.postMessage({
        command: 'saveFile',
        filename,
        content: encodeUint8ArrayToBase64(content),
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
