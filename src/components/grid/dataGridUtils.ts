import {
  exportToCsv,
  exportToJson,
  exportToSqlInsert,
  exportToMarkdown,
} from '../../utils/exportData';

export const EXPORT_OPTIONS = [
  { format: 'csv', label: 'Export to CSV', ext: '.csv' },
  { format: 'json', label: 'Export to JSON', ext: '.json' },
  { format: 'sql', label: 'Export SQL INSERT', ext: '.sql' },
  { format: 'md', label: 'Export Markdown Table', ext: '.md' },
] as const;

export type ExportFormat = (typeof EXPORT_OPTIONS)[number]['format'];

export function formatCellDisplay(value: any, pretty = false): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, pretty ? 2 : undefined);
  return String(value);
}

export function compareCellValues(valA: any, valB: any, direction: 'ASC' | 'DESC'): number {
  if (valA === valB) return 0;
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  const mult = direction === 'ASC' ? 1 : -1;
  if (typeof valA === 'number' && typeof valB === 'number') {
    return (valA - valB) * mult;
  }
  return String(valA).localeCompare(String(valB)) * mult;
}

export function filterAndSortGridRows(
  rows: Record<string, any>[],
  searchFilter: string,
  sortColumn: string | null,
  sortDirection: 'ASC' | 'DESC' | null
): Record<string, any>[] {
  const q = searchFilter.trim().toLowerCase();
  const filtered = q
    ? rows.filter((row) =>
        Object.values(row).some((val) => formatCellDisplay(val).toLowerCase().includes(q))
      )
    : [...rows];

  if (sortColumn && sortDirection) {
    filtered.sort((a, b) => compareCellValues(a[sortColumn], b[sortColumn], sortDirection));
  }
  return filtered;
}

export function serializeExportData(
  format: ExportFormat,
  tableName: string,
  columns: string[],
  rows: Record<string, any>[]
): { content: string; mimeType: string; ext: string } {
  switch (format) {
    case 'csv':
      return { content: exportToCsv(columns, rows), mimeType: 'text/csv', ext: 'csv' };
    case 'json':
      return { content: exportToJson(rows), mimeType: 'application/json', ext: 'json' };
    case 'sql':
      return {
        content: exportToSqlInsert(tableName, columns, rows),
        mimeType: 'application/sql',
        ext: 'sql',
      };
    case 'md':
      return { content: exportToMarkdown(columns, rows), mimeType: 'text/plain', ext: 'md' };
  }
}
