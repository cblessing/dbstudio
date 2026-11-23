import React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Plus,
  Trash2,
  Eye,
  Check,
  Filter,
  Code2,
  FileCode,
} from 'lucide-react';
import { exportToSqlInsert } from '../../utils/exportData';
import { ContextMenuItem } from '../dialogs/ContextMenu';
import { formatCellDisplay } from './dataGridUtils';

export function GridCellContent({
  col,
  cellValue,
  isEditing,
  editValue,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onInspect,
}: {
  col: string;
  cellValue: any;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onInspect: (col: string, value: any) => void;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          autoFocus
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="w-full bg-[#111111] border border-[#007acc] text-white px-1 py-0.5 rounded outline-none text-xs"
        />
        <button onClick={onSaveEdit} className="text-emerald-400 p-0.5" title="Save">
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isNull = cellValue === null || cellValue === undefined;
  const textColorClass = isNull
    ? 'text-amber-500/80 italic'
    : typeof cellValue === 'number'
    ? 'text-emerald-300'
    : 'text-[#cccccc]';

  return (
    <div className="flex items-center justify-between gap-1">
      <span className={`truncate ${textColorClass}`}>
        {isNull ? '[NULL]' : formatCellDisplay(cellValue)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInspect(col, cellValue);
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-sky-400 text-[#858585]"
        title="Inspect cell value"
      >
        <Eye className="w-3 h-3" />
      </button>
    </div>
  );
}

export function buildGridHeaderContextMenuItems(
  col: string,
  onSort: (col: string | null, dir: 'ASC' | 'DESC' | null) => void,
  onCopy: (text: string, msg: string) => void,
  onFilter: (col: string) => void
): ContextMenuItem[] {
  return [
    {
      id: 'sort_asc',
      label: `Sort "${col}" Ascending (A-Z)`,
      icon: <ArrowUp className="w-3.5 h-3.5 text-sky-400" />,
      action: () => onSort(col, 'ASC'),
    },
    {
      id: 'sort_desc',
      label: `Sort "${col}" Descending (Z-A)`,
      icon: <ArrowDown className="w-3.5 h-3.5 text-sky-400" />,
      action: () => onSort(col, 'DESC'),
    },
    {
      id: 'clear_sort',
      label: 'Clear Sorting',
      icon: <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => onSort(null, null),
    },
    { id: 'div_1', isDivider: true, label: '' },
    {
      id: 'copy_col_name',
      label: `Copy Column Name ("${col}")`,
      icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => onCopy(col, `Copied column "${col}"`),
    },
    {
      id: 'filter_by_col',
      label: `Filter by Column "${col}"`,
      icon: <Filter className="w-3.5 h-3.5 text-amber-400" />,
      action: () => onFilter(col),
    },
  ];
}

export function buildGridRowContextMenuItems({
  row,
  globalRowIdx,
  col,
  tableName,
  columns,
  onCopy,
  onInspectCell,
  onDuplicateRow,
  onDeleteRow,
}: {
  row: Record<string, any>;
  globalRowIdx: number;
  col?: string;
  tableName: string;
  columns: string[];
  onCopy: (text: string, msg: string) => void;
  onInspectCell: (col: string, value: any) => void;
  onDuplicateRow: (row: Record<string, any>) => void;
  onDeleteRow?: (rowIndex: number) => void;
}): ContextMenuItem[] {
  const cellItems: ContextMenuItem[] = col
    ? [
        {
          id: 'copy_cell',
          label: `Copy Cell Value (${String(row[col]).slice(0, 16)}...)`,
          icon: <Copy className="w-3.5 h-3.5 text-sky-400" />,
          action: () => onCopy(formatCellDisplay(row[col]), 'Copied cell value'),
        },
        {
          id: 'inspect_cell',
          label: `Inspect Cell (${col})`,
          icon: <Eye className="w-3.5 h-3.5 text-emerald-400" />,
          action: () => onInspectCell(col, row[col]),
        },
        { id: 'div_cell', isDivider: true, label: '' },
      ]
    : [];

  const deleteItems: ContextMenuItem[] = onDeleteRow
    ? [
        {
          id: 'delete_row',
          label: 'Delete Row',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
          isDestructive: true,
          action: () => onDeleteRow(globalRowIdx),
        },
      ]
    : [];

  return [
    ...cellItems,
    {
      id: 'copy_row_json',
      label: 'Copy Row as JSON',
      icon: <Code2 className="w-3.5 h-3.5 text-amber-400" />,
      action: () => onCopy(JSON.stringify(row, null, 2), 'Copied row as JSON'),
    },
    {
      id: 'copy_row_sql',
      label: 'Copy Row as SQL INSERT',
      icon: <FileCode className="w-3.5 h-3.5 text-purple-400" />,
      action: () =>
        onCopy(
          exportToSqlInsert(tableName, columns, [row]),
          'Copied row as SQL INSERT'
        ),
    },
    { id: 'div_row', isDivider: true, label: '' },
    {
      id: 'duplicate_row',
      label: 'Duplicate Row',
      icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => onDuplicateRow(row),
    },
    ...deleteItems,
  ];
}
