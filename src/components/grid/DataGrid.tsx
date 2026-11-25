import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { downloadFile } from '../../utils/exportData';
import { ContextMenu, ContextMenuItem } from '../dialogs/ContextMenu';
import {
  ExportFormat,
  formatCellDisplay,
  filterAndSortGridRows,
  serializeExportData,
} from './dataGridUtils';
import {
  GridCellContent,
  buildGridHeaderContextMenuItems,
  buildGridRowContextMenuItems,
} from './dataGridMenus';
import {
  DataGridToolbar,
  DataGridPaginationFooter,
  CellInspectorModal,
  AddRowModal,
} from './DataGridControls';

interface DataGridProps {
  columns: string[];
  rows: Record<string, any>[];
  tableName?: string;
  executionTimeMs?: number;
  fetchTimeMs?: number;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  onRefresh?: () => void;
  onUpdateRow?: (rowIndex: number, colName: string, newValue: any) => void;
  onAddRow?: (newRow: Record<string, any>) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

function DataGridTable({
  columns,
  paginatedRows,
  currentPage,
  pageSize,
  sortColumn,
  sortDirection,
  selectedRowIndex,
  editingCell,
  editValue,
  onHeaderClick,
  onHeaderContextMenu,
  onSelectRow,
  onRowContextMenu,
  onStartEditing,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onInspectCell,
}: {
  columns: string[];
  paginatedRows: Record<string, any>[];
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'ASC' | 'DESC' | null;
  selectedRowIndex: number | null;
  editingCell: { rowIdx: number; col: string } | null;
  editValue: string;
  onHeaderClick: (col: string) => void;
  onHeaderContextMenu: (e: React.MouseEvent, col: string) => void;
  onSelectRow: (idx: number) => void;
  onRowContextMenu: (
    e: React.MouseEvent,
    row: Record<string, any>,
    rowIdx: number,
    col?: string
  ) => void;
  onStartEditing: (rowIdx: number, col: string, val: any) => void;
  onEditValueChange: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onInspectCell: (col: string, val: any) => void;
}) {
  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#858585] p-6">
        <p>No columns returned or empty query.</p>
      </div>
    );
  }

  const renderSortIcon = (col: string) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />;
    }
    return sortDirection === 'ASC' ? (
      <ArrowUp className="w-3 h-3 text-[#007acc]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#007acc]" />
    );
  };

  return (
    <table className="w-full border-collapse font-mono text-xs text-left">
      <thead className="sticky top-0 bg-[#2d2d2d] z-10 border-b border-[#3c3c3c] select-none">
        <tr>
          <th className="w-12 px-2 py-1.5 text-center text-[#858585] border-r border-[#3c3c3c] font-sans font-normal text-[11px]">
            #
          </th>
          {columns.map((col) => (
            <th
              key={col}
              onClick={() => onHeaderClick(col)}
              onContextMenu={(e) => onHeaderContextMenu(e, col)}
              className="px-3 py-1.5 border-r border-[#3c3c3c] text-[#cccccc] hover:bg-[#383838] cursor-pointer transition-colors whitespace-nowrap"
              title="Click to sort, Right-click for column actions"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white">{col}</span>
                <span className="text-[#858585]">{renderSortIcon(col)}</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>

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
            const stripeClass =
              rowIdx % 2 === 0
                ? 'bg-[#1e1e1e] hover:bg-[#2a2d2e]'
                : 'bg-[#222222] hover:bg-[#2a2d2e]';

            return (
              <tr
                key={globalRowIdx}
                onClick={() => onSelectRow(globalRowIdx)}
                onContextMenu={(e) => onRowContextMenu(e, row, globalRowIdx)}
                className={`border-b border-[#2d2d2d] transition-colors ${
                  isSelected ? 'bg-[#04395e] text-white' : stripeClass
                }`}
              >
                <td className="px-2 py-1 text-center text-[#6e6e6e] border-r border-[#2d2d2d] select-none font-sans text-[11px]">
                  {globalRowIdx + 1}
                </td>

                {columns.map((col) => {
                  const isEditingThis =
                    editingCell?.rowIdx === globalRowIdx && editingCell.col === col;
                  return (
                    <td
                      key={col}
                      onDoubleClick={() => onStartEditing(globalRowIdx, col, row[col])}
                      onContextMenu={(e) => onRowContextMenu(e, row, globalRowIdx, col)}
                      className="px-3 py-1 border-r border-[#2d2d2d] max-w-xs truncate cursor-cell relative group"
                      title="Double-click to edit cell, Right-click for row/cell actions"
                    >
                      <GridCellContent
                        col={col}
                        cellValue={row[col]}
                        isEditing={isEditingThis}
                        editValue={editValue}
                        onEditValueChange={onEditValueChange}
                        onSaveEdit={onSaveEdit}
                        onCancelEdit={onCancelEdit}
                        onInspect={onInspectCell}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  rows: initialRows,
  tableName = 'result_set',
  executionTimeMs = 1.2,
  fetchTimeMs = 0.5,
  hasMore = false,
  onLoadMore,
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  const copyToClipboard = (text: string, notificationMessage?: string) => {
    navigator.clipboard.writeText(text);
    if (notificationMessage) {
      setCopyNotification(notificationMessage);
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  const handleHeaderContextMenu = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();

    const items = buildGridHeaderContextMenuItems(
      col,
      (nextCol, nextDir) => {
        setSortColumn(nextCol);
        setSortDirection(nextDir);
      },
      copyToClipboard,
      setSearchFilter
    );
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const duplicateRowRecord = (row: Record<string, any>) => {
    if (!onAddRow) return;
    const clone = { ...row };
    if (typeof clone.id === 'number') {
      clone.id = Date.now();
    }
    onAddRow(clone);
  };

  const handleRowContextMenu = (
    e: React.MouseEvent,
    row: Record<string, any>,
    globalRowIdx: number,
    col?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRowIndex(globalRowIdx);

    const items = buildGridRowContextMenuItems({
      row,
      globalRowIdx,
      col,
      tableName,
      columns,
      onCopy: copyToClipboard,
      onInspectCell: (c, value) => setInspectCell({ col: c, value }),
      onDuplicateRow: duplicateRowRecord,
      onDeleteRow,
    });

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

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

  const filteredAndSortedRows = useMemo(
    () => filterAndSortGridRows(initialRows, searchFilter, sortColumn, sortDirection),
    [initialRows, searchFilter, sortColumn, sortDirection]
  );

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  const startEditing = (rowIdx: number, col: string, currentVal: any) => {
    setEditingCell({ rowIdx, col });
    setEditValue(formatCellDisplay(currentVal));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    onUpdateRow?.(editingCell.rowIdx, editingCell.col, editValue);
    setEditingCell(null);
  };

  const handleExport = (format: ExportFormat) => {
    setExportDropdownOpen(false);
    setCopyNotification(`Preparing ${format.toUpperCase()} export...`);
    setTimeout(() => {
      try {
        const { content, mimeType, ext } = serializeExportData(
          format,
          tableName,
          columns,
          filteredAndSortedRows
        );
        downloadFile(`${tableName}_export.${ext}`, content, mimeType);
        setCopyNotification(`Export ready (${filteredAndSortedRows.length} rows)`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setCopyNotification(`Export failed: ${msg}`);
      } finally {
        setTimeout(() => setCopyNotification(null), 2500);
      }
    }, 0);
  };

  const copyAsTsv = () => {
    const tsv = [
      columns.join('\t'),
      ...filteredAndSortedRows.map((r) => columns.map((c) => r[c] ?? '').join('\t')),
    ].join('\n');
    copyToClipboard(tsv, 'Copied to clipboard (TSV)');
  };

  const handleNextPage = async () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      return;
    }
    const canFetchNextBatch = hasMore && Boolean(onLoadMore) && !isLoadingMore;
    if (!canFetchNextBatch) return;

    const nextPage = totalPages + 1;
    setIsLoadingMore(true);
    try {
      await onLoadMore!();
      setCurrentPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans text-xs select-none">
      <DataGridToolbar
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        filteredCount={filteredAndSortedRows.length}
        totalCount={initialRows.length}
        onRefresh={onRefresh}
        onStartAddRow={() => {
          const draft: Record<string, any> = {};
          columns.forEach((col) => (draft[col] = ''));
          setNewRowDraft(draft);
          setIsAddingRow(true);
        }}
        canDeleteSelected={selectedRowIndex !== null && Boolean(onDeleteRow)}
        onDeleteSelected={() => {
          if (selectedRowIndex !== null) {
            onDeleteRow?.(selectedRowIndex);
            setSelectedRowIndex(null);
          }
        }}
        onCopyTsv={copyAsTsv}
        exportDropdownOpen={exportDropdownOpen}
        onToggleExportDropdown={() => setExportDropdownOpen(!exportDropdownOpen)}
        onExport={handleExport}
      />

      {copyNotification && (
        <div className="bg-emerald-600 text-white px-3 py-1 text-center font-medium transition-all">
          {copyNotification}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-[#1e1e1e] relative">
        <DataGridTable
          columns={columns}
          paginatedRows={paginatedRows}
          currentPage={currentPage}
          pageSize={pageSize}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          selectedRowIndex={selectedRowIndex}
          editingCell={editingCell}
          editValue={editValue}
          onHeaderClick={handleHeaderClick}
          onHeaderContextMenu={handleHeaderContextMenu}
          onSelectRow={setSelectedRowIndex}
          onRowContextMenu={handleRowContextMenu}
          onStartEditing={startEditing}
          onEditValueChange={setEditValue}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingCell(null)}
          onInspectCell={(col, value) => setInspectCell({ col, value })}
        />
      </div>

      <DataGridPaginationFooter
        rowCount={filteredAndSortedRows.length}
        hasMore={hasMore}
        executionTimeMs={executionTimeMs}
        fetchTimeMs={fetchTimeMs}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        isLoadingMore={isLoadingMore}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={handleNextPage}
      />

      {inspectCell && (
        <CellInspectorModal
          inspectCell={inspectCell}
          onClose={() => setInspectCell(null)}
          onCopy={(text) => copyToClipboard(text)}
        />
      )}

      {isAddingRow && (
        <AddRowModal
          tableName={tableName}
          columns={columns}
          draft={newRowDraft}
          onDraftChange={(col, val) =>
            setNewRowDraft((prev) => ({ ...prev, [col]: val }))
          }
          onClose={() => setIsAddingRow(false)}
          onSave={() => {
            onAddRow?.(newRowDraft);
            setIsAddingRow(false);
          }}
        />
      )}

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
