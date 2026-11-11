import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Code2,
  FileCode,
} from 'lucide-react';
import {
  exportToCsv,
  exportToJson,
  exportToSqlInsert,
  exportToMarkdown,
} from '../../utils/exportData';
import { ContextMenu, ContextMenuItem } from '../dialogs/ContextMenu';

interface DataGridProps {
  columns: string[];
  rows: Record<string, any>[];
  tableName?: string;
  executionTimeMs?: number;
  fetchTimeMs?: number;
  onRefresh?: () => void;
  onUpdateRow?: (rowIndex: number, colName: string, newValue: any) => void;
  onAddRow?: (newRow: Record<string, any>) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  rows: initialRows,
  tableName = 'result_set',
  executionTimeMs = 1.2,
  fetchTimeMs = 0.5,
  onRefresh,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC' | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [inspectCell, setInspectCell] = useState<{ col: string; value: any } | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<Record<string, any>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // Header Right Click Menu
  const handleHeaderContextMenu = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'sort_asc',
        label: `Sort "${col}" Ascending (A-Z)`,
        icon: <ArrowUp className="w-3.5 h-3.5 text-sky-400" />,
        action: () => {
          setSortColumn(col);
          setSortDirection('ASC');
        },
      },
      {
        id: 'sort_desc',
        label: `Sort "${col}" Descending (Z-A)`,
        icon: <ArrowDown className="w-3.5 h-3.5 text-sky-400" />,
        action: () => {
          setSortColumn(col);
          setSortDirection('DESC');
        },
      },
      {
        id: 'clear_sort',
        label: 'Clear Sorting',
        icon: <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />,
        action: () => {
          setSortColumn(null);
          setSortDirection(null);
        },
      },
      { id: 'div_1', isDivider: true, label: '' },
      {
        id: 'copy_col_name',
        label: `Copy Column Name ("${col}")`,
        icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
        action: () => {
          navigator.clipboard.writeText(col);
          setCopyNotification(`Copied column "${col}"`);
          setTimeout(() => setCopyNotification(null), 2000);
        },
      },
      {
        id: 'filter_by_col',
        label: `Filter by Column "${col}"`,
        icon: <Filter className="w-3.5 h-3.5 text-amber-400" />,
        action: () => {
          setSearchFilter(col);
        },
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Row / Cell Right Click Menu
  const handleRowContextMenu = (
    e: React.MouseEvent,
    row: Record<string, any>,
    globalRowIdx: number,
    col?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRowIndex(globalRowIdx);

    const cellVal = col ? row[col] : null;

    const items: ContextMenuItem[] = [
      ...(col
        ? [
            {
              id: 'copy_cell',
              label: `Copy Cell Value (${String(cellVal).slice(0, 16)}...)`,
              icon: <Copy className="w-3.5 h-3.5 text-sky-400" />,
              action: () => {
                navigator.clipboard.writeText(String(cellVal ?? ''));
                setCopyNotification('Copied cell value');
                setTimeout(() => setCopyNotification(null), 2000);
              },
            },
            {
              id: 'inspect_cell',
              label: `Inspect Cell (${col})`,
              icon: <Eye className="w-3.5 h-3.5 text-emerald-400" />,
              action: () => setInspectCell({ col, value: cellVal }),
            },
            { id: 'div_cell', isDivider: true, label: '' },
          ]
        : []),
      {
        id: 'copy_row_json',
        label: 'Copy Row as JSON',
        icon: <Code2 className="w-3.5 h-3.5 text-amber-400" />,
        action: () => {
          navigator.clipboard.writeText(JSON.stringify(row, null, 2));
          setCopyNotification('Copied row as JSON');
          setTimeout(() => setCopyNotification(null), 2000);
        },
      },
      {
        id: 'copy_row_sql',
        label: 'Copy Row as SQL INSERT',
        icon: <FileCode className="w-3.5 h-3.5 text-purple-400" />,
        action: () => {
          const insertSql = exportToSqlInsert(tableName, columns, [row]);
          navigator.clipboard.writeText(insertSql);
          setCopyNotification('Copied row as SQL INSERT');
          setTimeout(() => setCopyNotification(null), 2000);
        },
      },
      { id: 'div_row', isDivider: true, label: '' },
      {
        id: 'duplicate_row',
        label: 'Duplicate Row',
        icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
        action: () => {
          if (onAddRow) {
            const clone = { ...row };
            if ('id' in clone && typeof clone.id === 'number') {
              clone.id = Date.now();
            }
            onAddRow(clone);
          }
        },
      },
      ...(onDeleteRow
        ? [
            {
              id: 'delete_row',
              label: 'Delete Row',
              icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
              isDestructive: true,
              action: () => onDeleteRow(globalRowIdx),
            },
          ]
        : []),
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Sorting handler
  const handleHeaderClick = (col: string) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection('ASC');
    } else if (sortDirection === 'ASC') {
      setSortDirection('DESC');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let result = [...initialRows];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'ASC' ? valA - valB : valB - valA;
        }
        return sortDirection === 'ASC'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [initialRows, searchFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  // Edit cell handlers
  const startEditing = (rowIdx: number, col: string, currentVal: any) => {
    setEditingCell({ rowIdx, col });
    setEditValue(currentVal === null || currentVal === undefined ? '' : String(currentVal));
  };

  const saveEdit = () => {
    if (editingCell) {
      if (onUpdateRow) {
        onUpdateRow(editingCell.rowIdx, editingCell.col, editValue);
      }
      setEditingCell(null);
    }
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'json' | 'sql' | 'md') => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'csv') {
      content = exportToCsv(columns, filteredAndSortedRows);
      mimeType = 'text/csv';
      ext = 'csv';
    } else if (format === 'json') {
      content = exportToJson(filteredAndSortedRows);
      mimeType = 'application/json';
      ext = 'json';
    } else if (format === 'sql') {
      content = exportToSqlInsert(tableName, columns, filteredAndSortedRows);
      mimeType = 'application/sql';
      ext = 'sql';
    } else if (format === 'md') {
      content = exportToMarkdown(columns, filteredAndSortedRows);
      ext = 'md';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_export.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportDropdownOpen(false);
  };

  const copyAsTsv = () => {
    const tsv = [
      columns.join('\t'),
      ...filteredAndSortedRows.map((r) => columns.map((c) => r[c] ?? '').join('\t')),
    ].join('\n');

    navigator.clipboard.writeText(tsv);
    setCopyNotification('Copied to clipboard (TSV)');
    setTimeout(() => setCopyNotification(null), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans text-xs select-none">
      {/* Top Grid Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d2d2d] bg-[#252526] gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Quick Search Filter */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#858585]" />
            <input
              type="text"
              placeholder="Search in grid results..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 pl-7 py-1 text-xs text-[#cccccc] outline-none"
              aria-label="Filter result rows"
            />
          </div>

          {searchFilter && (
            <span className="text-[11px] text-[#858585]">
              Filtered ({filteredAndSortedRows.length} / {initialRows.length})
            </span>
          )}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
              title="Refresh Grid Data"
              aria-label="Refresh Grid Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={() => {
              const draft: Record<string, any> = {};
              columns.forEach((col) => (draft[col] = ''));
              setNewRowDraft(draft);
              setIsAddingRow(true);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded transition-colors"
            title="Add New Row"
            aria-label="Add Row"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          {selectedRowIndex !== null && onDeleteRow && (
            <button
              onClick={() => {
                onDeleteRow(selectedRowIndex);
                setSelectedRowIndex(null);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded transition-colors"
              title="Delete Selected Row"
              aria-label="Delete Row"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            onClick={copyAsTsv}
            className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
            title="Copy as TSV / Excel table"
            aria-label="Copy to Clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
              title="Export Results (CSV, JSON, SQL, Markdown)"
              aria-label="Export Data"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export</span>
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex items-center justify-between"
                >
                  <span>Export to CSV</span>
                  <span className="text-[10px] opacity-60">.csv</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex items-center justify-between"
                >
                  <span>Export to JSON</span>
                  <span className="text-[10px] opacity-60">.json</span>
                </button>
                <button
                  onClick={() => handleExport('sql')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex items-center justify-between"
                >
                  <span>Export SQL INSERT</span>
                  <span className="text-[10px] opacity-60">.sql</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex items-center justify-between"
                >
                  <span>Export Markdown Table</span>
                  <span className="text-[10px] opacity-60">.md</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copyNotification && (
        <div className="bg-emerald-600 text-white px-3 py-1 text-center font-medium transition-all">
          {copyNotification}
        </div>
      )}

      {/* Main Table Grid Viewport */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e] relative">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#858585] p-6">
            <p>No columns returned or empty query.</p>
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-xs text-left">
            {/* Table Header */}
            <thead className="sticky top-0 bg-[#2d2d2d] z-10 border-b border-[#3c3c3c] select-none">
              <tr>
                {/* Gutter / Row Number header */}
                <th className="w-12 px-2 py-1.5 text-center text-[#858585] border-r border-[#3c3c3c] font-sans font-normal text-[11px]">
                  #
                </th>
                {columns.map((col) => {
                  const isSorted = sortColumn === col;

                  return (
                    <th
                      key={col}
                      onClick={() => handleHeaderClick(col)}
                      onContextMenu={(e) => handleHeaderContextMenu(e, col)}
                      className="px-3 py-1.5 border-r border-[#3c3c3c] text-[#cccccc] hover:bg-[#383838] cursor-pointer transition-colors whitespace-nowrap"
                      title="Click to sort, Right-click for column actions"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{col}</span>
                        <span className="text-[#858585]">
                          {isSorted ? (
                            sortDirection === 'ASC' ? (
                              <ArrowUp className="w-3 h-3 text-[#007acc]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#007acc]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                          )}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="p-8 text-center text-[#858585] font-sans"
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => {
                  const globalRowIdx = (currentPage - 1) * pageSize + rowIdx;
                  const isSelected = selectedRowIndex === globalRowIdx;

                  return (
                    <tr
                      key={globalRowIdx}
                      onClick={() => setSelectedRowIndex(globalRowIdx)}
                      onContextMenu={(e) => handleRowContextMenu(e, row, globalRowIdx)}
                      className={`border-b border-[#2d2d2d] transition-colors ${
                        isSelected
                          ? 'bg-[#04395e] text-white'
                          : rowIdx % 2 === 0
                          ? 'bg-[#1e1e1e] hover:bg-[#2a2d2e]'
                          : 'bg-[#222222] hover:bg-[#2a2d2e]'
                      }`}
                    >
                      {/* Row Gutter Index */}
                      <td className="px-2 py-1 text-center text-[#6e6e6e] border-r border-[#2d2d2d] select-none font-sans text-[11px]">
                        {globalRowIdx + 1}
                      </td>

                      {/* Cells */}
                      {columns.map((col) => {
                        const cellValue = row[col];
                        const isEditingThis =
                          editingCell?.rowIdx === globalRowIdx &&
                          editingCell?.col === col;

                        return (
                          <td
                            key={col}
                            onDoubleClick={() => startEditing(globalRowIdx, col, cellValue)}
                            onContextMenu={(e) => handleRowContextMenu(e, row, globalRowIdx, col)}
                            className="px-3 py-1 border-r border-[#2d2d2d] max-w-xs truncate cursor-cell relative group"
                            title="Double-click to edit cell, Right-click for row/cell actions"
                          >
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full bg-[#111111] border border-[#007acc] text-white px-1 py-0.5 rounded outline-none text-xs"
                                />
                                <button
                                  onClick={saveEdit}
                                  className="text-emerald-400 p-0.5"
                                  title="Save"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`truncate ${
                                    cellValue === null || cellValue === undefined
                                      ? 'text-amber-500/80 italic'
                                      : typeof cellValue === 'number'
                                      ? 'text-emerald-300'
                                      : 'text-[#cccccc]'
                                  }`}
                                >
                                  {cellValue === null || cellValue === undefined
                                    ? '[NULL]'
                                    : typeof cellValue === 'object'
                                    ? JSON.stringify(cellValue)
                                    : String(cellValue)}
                                </span>

                                {/* Inspect Eye button on cell hover */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectCell({ col, value: cellValue });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-sky-400 text-[#858585]"
                                  title="Inspect cell value"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Grid Status & Pagination Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#2d2d2d] bg-[#252526] select-none text-[11px] text-[#969696]">
        <div className="flex items-center gap-3">
          <span>
            {filteredAndSortedRows.length} rows total ({executionTimeMs}ms execution,{' '}
            {fetchTimeMs}ms fetch)
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400 font-mono">WASM Virtual Memory</span>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#1e1e1e] border border-[#3c3c3c] text-white rounded px-1.5 py-0.5 outline-none"
            aria-label="Rows per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="mx-1">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded text-white"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded text-white"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cell Value Inspector Drawer / Modal */}
      {inspectCell && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setInspectCell(null)}
        >
          <div
            className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-lg p-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#3c3c3c]">
              <span className="font-semibold text-white">
                Cell Value Inspector: <span className="text-[#007acc]">{inspectCell.col}</span>
              </span>
              <button
                onClick={() => setInspectCell(null)}
                className="text-[#858585] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="py-3">
              <textarea
                readOnly
                value={
                  typeof inspectCell.value === 'object'
                    ? JSON.stringify(inspectCell.value, null, 2)
                    : String(inspectCell.value ?? '')
                }
                rows={8}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2 text-white font-mono text-xs outline-none select-text"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    typeof inspectCell.value === 'object'
                      ? JSON.stringify(inspectCell.value, null, 2)
                      : String(inspectCell.value ?? '')
                  );
                  setInspectCell(null);
                }}
                className="px-3 py-1 bg-[#007acc] text-white rounded hover:bg-[#0062a3]"
              >
                Copy Value
              </button>
              <button
                onClick={() => setInspectCell(null)}
                className="px-3 py-1 bg-[#333333] text-white rounded hover:bg-[#3c3c3c]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {isAddingRow && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddingRow(false)}
        >
          <div
            className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-md p-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#3c3c3c]">
              <span className="font-semibold text-white">Add New Row to {tableName}</span>
              <button
                onClick={() => setIsAddingRow(false)}
                className="text-[#858585] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-3 max-h-72 overflow-y-auto space-y-2">
              {columns.map((col) => (
                <div key={col}>
                  <label className="block text-[#969696] mb-1 font-mono">{col}</label>
                  <input
                    type="text"
                    value={newRowDraft[col] ?? ''}
                    onChange={(e) =>
                      setNewRowDraft((prev) => ({ ...prev, [col]: e.target.value }))
                    }
                    placeholder={`Enter value for ${col}`}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white outline-none focus:border-[#007acc]"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
              <button
                onClick={() => setIsAddingRow(false)}
                className="px-3 py-1 bg-[#333333] text-white rounded hover:bg-[#3c3c3c]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onAddRow) {
                    onAddRow(newRowDraft);
                  }
                  setIsAddingRow(false);
                }}
                className="px-3 py-1 bg-[#007acc] text-white rounded hover:bg-[#0062a3]"
              >
                Save Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
