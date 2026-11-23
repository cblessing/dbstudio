import React from 'react';
import {
  Search,
  Download,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  EXPORT_OPTIONS,
  ExportFormat,
  formatCellDisplay,
} from './dataGridUtils';

export function DataGridToolbar({
  searchFilter,
  onSearchChange,
  filteredCount,
  totalCount,
  onRefresh,
  onStartAddRow,
  canDeleteSelected,
  onDeleteSelected,
  onCopyTsv,
  exportDropdownOpen,
  onToggleExportDropdown,
  onExport,
}: {
  searchFilter: string;
  onSearchChange: (val: string) => void;
  filteredCount: number;
  totalCount: number;
  onRefresh?: () => void;
  onStartAddRow: () => void;
  canDeleteSelected: boolean;
  onDeleteSelected: () => void;
  onCopyTsv: () => void;
  exportDropdownOpen: boolean;
  onToggleExportDropdown: () => void;
  onExport: (format: ExportFormat) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d2d2d] bg-[#252526] gap-2">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#858585]" />
          <input
            type="text"
            placeholder="Search in grid results..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 pl-7 py-1 text-xs text-[#cccccc] outline-none"
            aria-label="Filter result rows"
          />
        </div>

        {searchFilter && (
          <span className="text-[11px] text-[#858585]">
            Filtered ({filteredCount} / {totalCount})
          </span>
        )}
      </div>

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
          onClick={onStartAddRow}
          className="flex items-center gap-1 px-2 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded transition-colors"
          title="Add New Row"
          aria-label="Add Row"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Row</span>
        </button>

        {canDeleteSelected && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 px-2 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded transition-colors"
            title="Delete Selected Row"
            aria-label="Delete Row"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}

        <button
          onClick={onCopyTsv}
          className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
          title="Copy as TSV / Excel table"
          aria-label="Copy to Clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </button>

        <div className="relative">
          <button
            onClick={onToggleExportDropdown}
            className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
            title="Export Results (CSV, JSON, SQL, Markdown)"
            aria-label="Export Data"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export</span>
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1 z-50 text-xs">
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => onExport(opt.format)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex items-center justify-between"
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-60">{opt.ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataGridPaginationFooter({
  rowCount,
  hasMore,
  executionTimeMs,
  fetchTimeMs,
  pageSize,
  currentPage,
  totalPages,
  isLoadingMore,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}: {
  rowCount: number;
  hasMore: boolean;
  executionTimeMs: number;
  fetchTimeMs: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  isLoadingMore: boolean;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  const isAtEnd = currentPage === totalPages && !hasMore;
  const nextTitle =
    currentPage === totalPages && hasMore ? 'Load next 1,000 rows' : 'Next Page';

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#2d2d2d] bg-[#252526] select-none text-[11px] text-[#969696]">
      <div className="flex items-center gap-3">
        <span>
          {rowCount}
          {hasMore ? '+' : ''} rows loaded ({executionTimeMs}ms execution, {fetchTimeMs}ms
          fetch)
        </span>
        {hasMore && (
          <span className="text-sky-400">
            • More rows available (page forward to load next 1,000)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
          {hasMore ? '+' : ''}
        </span>

        <button
          onClick={onPrevPage}
          disabled={currentPage === 1 || isLoadingMore}
          className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded text-white"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNextPage}
          disabled={isAtEnd || isLoadingMore}
          className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded text-white"
          title={nextTitle}
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function CellInspectorModal({
  inspectCell,
  onClose,
  onCopy,
}: {
  inspectCell: { col: string; value: any };
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const displayValue = formatCellDisplay(inspectCell.value, true);
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-lg p-4 font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#3c3c3c]">
          <span className="font-semibold text-white">
            Cell Value Inspector: <span className="text-[#007acc]">{inspectCell.col}</span>
          </span>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            ✕
          </button>
        </div>
        <div className="py-3">
          <textarea
            readOnly
            value={displayValue}
            rows={8}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2 text-white font-mono text-xs outline-none select-text"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
          <button
            onClick={() => {
              onCopy(displayValue);
              onClose();
            }}
            className="px-3 py-1 bg-[#007acc] text-white rounded hover:bg-[#0062a3]"
          >
            Copy Value
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#333333] text-white rounded hover:bg-[#3c3c3c]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddRowModal({
  tableName,
  columns,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: {
  tableName: string;
  columns: string[];
  draft: Record<string, any>;
  onDraftChange: (col: string, val: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-md p-4 font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#3c3c3c]">
          <span className="font-semibold text-white">Add New Row to {tableName}</span>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            ✕
          </button>
        </div>

        <div className="py-3 max-h-72 overflow-y-auto space-y-2">
          {columns.map((col) => (
            <div key={col}>
              <label className="block text-[#969696] mb-1 font-mono">{col}</label>
              <input
                type="text"
                value={draft[col] ?? ''}
                onChange={(e) => onDraftChange(col, e.target.value)}
                placeholder={`Enter value for ${col}`}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white outline-none focus:border-[#007acc]"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#333333] text-white rounded hover:bg-[#3c3c3c]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1 bg-[#007acc] text-white rounded hover:bg-[#0062a3]"
          >
            Save Row
          </button>
        </div>
      </div>
    </div>
  );
}
