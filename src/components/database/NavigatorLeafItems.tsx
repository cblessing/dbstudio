import React from 'react';
import {
  DatabaseType,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import { generateRoutineRunSql } from '../../utils/navigatorObjects';
import {
  ChevronRight,
  ChevronDown,
  Table,
  Eye,
  Cpu,
  Code2,
  Package,
  Key,
  Link,
  Play,
} from 'lucide-react';

function TableColumnNode({
  col,
  onContextMenu,
}: {
  col: ColumnDefinition;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const renderIcon = () => {
    if (col.primaryKey) {
      return (
        <span title="Primary Key">
          <Key className="w-3 h-3 text-amber-400 shrink-0" />
        </span>
      );
    }
    if (col.foreignKey) {
      return (
        <span title={`Foreign Key -> ${col.foreignKey.targetTable}.${col.foreignKey.targetColumn}`}>
          <Link className="w-3 h-3 text-sky-400 shrink-0" />
        </span>
      );
    }
    return <span className="w-3 h-3 inline-block" />;
  };

  return (
    <div
      onContextMenu={onContextMenu}
      className="flex items-center justify-between py-0.5 text-[11px] text-[#999999] hover:text-[#cccccc] hover:bg-[#282828] px-1 rounded cursor-context-menu"
      title={`Right-click to manage column "${col.name}"`}
    >
      <div className="flex items-center gap-1.5 truncate">
        {renderIcon()}
        <span className={col.primaryKey ? 'font-medium text-amber-200' : ''}>{col.name}</span>
      </div>
      <span className="text-[10px] text-[#666666] font-mono">{col.type}</span>
    </div>
  );
}

export function TableTreeItem({
  connId,
  tbl,
  isExpanded,
  onToggleExpand,
  onOpenTable,
  onEditColumns,
  onTableContextMenu,
  onColumnContextMenu,
}: {
  connId: string;
  tbl: TableDefinition;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenTable: (connId: string, tableName: string) => void;
  onEditColumns: (connId: string, table: TableDefinition) => void;
  onTableContextMenu: (e: React.MouseEvent, connId: string, tbl: TableDefinition) => void;
  onColumnContextMenu: (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition,
    col: ColumnDefinition
  ) => void;
}) {
  return (
    <div className="mt-0.5">
      <div
        className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
        onClick={() => onOpenTable(connId, tbl.name)}
        onContextMenu={(e) => onTableContextMenu(e, connId, tbl)}
        title={`Click to view data, right-click to manage "${tbl.name}"`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-[#858585] hover:text-white p-0.5"
            aria-label={`Toggle columns for ${tbl.name}`}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <Table className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">{tbl.name}</span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditColumns(connId, tbl);
            }}
            title="Edit Columns / Structure"
            aria-label={`Edit columns in ${tbl.name}`}
            className="text-[10px] text-sky-400 hover:underline px-1"
          >
            Edit
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-5 py-0.5 space-y-0.5 border-l border-[#333333] ml-2.5">
          {tbl.columns.map((col) => (
            <TableColumnNode
              key={col.name}
              col={col}
              onContextMenu={(e) => onColumnContextMenu(e, connId, tbl, col)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ViewTreeItem({
  connId,
  vw,
  isExpanded,
  onToggleExpand,
  onOpenSqlEditor,
  onViewContextMenu,
}: {
  connId: string;
  vw: ViewDefinition;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenSqlEditor: (connId: string, query?: string) => void;
  onViewContextMenu: (e: React.MouseEvent, connId: string, vw: ViewDefinition) => void;
}) {
  const columns = vw.columns ?? [];
  const hasCols = columns.length > 0;
  const querySql = `SELECT * FROM ${vw.name} LIMIT 100;`;

  return (
    <div className="mt-0.5">
      <div
        onClick={() => onOpenSqlEditor(connId, querySql)}
        onContextMenu={(e) => onViewContextMenu(e, connId, vw)}
        title={`Click to query view "${vw.name}" (Right-click for DDL / Drop)`}
        className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {hasCols ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="text-[#858585] hover:text-white p-0.5"
              aria-label={`Toggle columns for view ${vw.name}`}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4 inline-block" />
          )}
          <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{vw.name}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSqlEditor(connId, querySql);
          }}
          title={`Query ${vw.name}`}
          aria-label={`Query view ${vw.name}`}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#454545] rounded text-emerald-400"
        >
          <Play className="w-3 h-3" />
        </button>
      </div>

      {isExpanded && (
        <div className="pl-5 py-0.5 space-y-0.5 border-l border-[#333333] ml-2.5">
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between py-0.5 text-[11px] text-[#999999] px-1"
            >
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] text-[#666666] font-mono">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoutineTreeItem({
  kind,
  connId,
  dialect,
  item,
  onOpenSqlEditor,
  onContextMenu,
}: {
  kind: 'procedure' | 'function' | 'package';
  connId: string;
  dialect: DatabaseType;
  item: ProcedureDefinition;
  onOpenSqlEditor: (connId: string, query?: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    connId: string,
    kind: 'procedure' | 'function' | 'package',
    item: ProcedureDefinition
  ) => void;
}) {
  const runSql = generateRoutineRunSql(kind, item.name, dialect);
  const icon =
    kind === 'function' ? (
      <Code2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
    ) : kind === 'package' ? (
      <Package className="w-3.5 h-3.5 text-rose-400 shrink-0" />
    ) : (
      <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    );

  return (
    <div
      onClick={() => onOpenSqlEditor(connId, runSql)}
      onContextMenu={(e) => onContextMenu(e, connId, kind, item)}
      title={`Click to run "${item.name}" (Right-click for DDL / Drop)`}
      className="group flex items-center justify-between px-2 py-1 mt-0.5 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0 pl-1">
        {icon}
        <span className="truncate">{item.name}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenSqlEditor(connId, runSql);
        }}
        title={`Run ${item.name}`}
        aria-label={`Run ${kind} ${item.name}`}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#454545] rounded text-amber-300"
      >
        <Play className="w-3 h-3" />
      </button>
    </div>
  );
}
