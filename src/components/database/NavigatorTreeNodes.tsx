import React from 'react';
import {
  SchemaDefinition,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Table,
  Eye,
  Cpu,
  Key,
  Link,
} from 'lucide-react';

function matchesSearchFilter(
  searchTerm: string,
  name: string,
  columns?: ColumnDefinition[]
): boolean {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  if (name.toLowerCase().includes(q)) return true;
  return columns ? columns.some((c) => c.name.toLowerCase().includes(q)) : false;
}

function ObjectGroupHeader({
  label,
  count,
  isExpanded,
  folderColorClass,
  title,
  onToggle,
  onContextMenu,
}: {
  label: string;
  count: number;
  isExpanded: boolean;
  folderColorClass: string;
  title: string;
  onToggle: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] rounded-sm"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[#858585]">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        {isExpanded ? (
          <FolderOpen className={`w-3.5 h-3.5 ${folderColorClass} shrink-0`} />
        ) : (
          <Folder className={`w-3.5 h-3.5 ${folderColorClass} shrink-0`} />
        )}
        <span className="font-medium">{label}</span>
        <span className="text-[10px] text-[#6b6b6b] font-mono">({count})</span>
      </div>
    </div>
  );
}

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
        <span
          title={`Foreign Key -> ${col.foreignKey.targetTable}.${col.foreignKey.targetColumn}`}
        >
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
        <span className={col.primaryKey ? 'font-medium text-amber-200' : ''}>
          {col.name}
        </span>
      </div>
      <span className="text-[10px] text-[#666666] font-mono">{col.type}</span>
    </div>
  );
}

function TableTreeItem({
  connId,
  tbl,
  isExpanded,
  onToggleExpand,
  onOpenTable,
  onEditColumns,
  onDropTableClick,
  onTableContextMenu,
  onColumnContextMenu,
}: {
  connId: string;
  tbl: TableDefinition;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenTable: (connId: string, tableName: string) => void;
  onEditColumns: (connId: string, table: TableDefinition) => void;
  onDropTableClick: (connId: string, tableName: string) => void;
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
        title={`Right-click to manage "${tbl.name}" (Drop, Alter, Truncate, DDL)`}
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
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
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
            title="Edit Columns"
            aria-label={`Edit columns in ${tbl.name}`}
            className="text-[10px] text-sky-400 hover:underline px-1"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDropTableClick(connId, tbl.name);
            }}
            title="Drop Table"
            aria-label={`Drop table ${tbl.name}`}
            className="text-[10px] text-rose-400 hover:underline px-1"
          >
            Drop
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

function ViewTreeItem({
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

  return (
    <div className="mt-0.5">
      <div
        onClick={() => onOpenSqlEditor(connId, `SELECT * FROM ${vw.name} LIMIT 100;`)}
        onContextMenu={(e) => onViewContextMenu(e, connId, vw)}
        title={`Click to query view "${vw.name}" (Right-click for DDL)`}
        className="flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
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
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4 inline-block" />
          )}
          <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{vw.name}</span>
        </div>
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

export function SchemaObjectGroups({
  connId,
  schema,
  schemaKey,
  searchTerm,
  expandedObjectGroups,
  expandedTables,
  expandedViews,
  onToggleObjectGroup,
  onToggleTable,
  onToggleView,
  onOpenTable,
  onOpenSqlEditor,
  onEditColumns,
  onDropTableClick,
  onSchemaContextMenu,
  onViewsGroupContextMenu,
  onProceduresGroupContextMenu,
  onTableContextMenu,
  onViewContextMenu,
  onProcedureContextMenu,
  onColumnContextMenu,
}: {
  connId: string;
  schema: SchemaDefinition;
  schemaKey: string;
  searchTerm: string;
  expandedObjectGroups: Record<string, boolean>;
  expandedTables: Record<string, boolean>;
  expandedViews: Record<string, boolean>;
  onToggleObjectGroup: (key: string, defaultExpanded: boolean) => void;
  onToggleTable: (key: string) => void;
  onToggleView: (key: string) => void;
  onOpenTable: (connId: string, tableName: string) => void;
  onOpenSqlEditor: (connId: string, query?: string) => void;
  onEditColumns: (connId: string, table: TableDefinition) => void;
  onDropTableClick: (connId: string, tableName: string) => void;
  onSchemaContextMenu: (e: React.MouseEvent, connId: string, schemaName: string) => void;
  onViewsGroupContextMenu: (e: React.MouseEvent, connId: string, schemaName: string) => void;
  onProceduresGroupContextMenu: (e: React.MouseEvent, connId: string, schemaName: string) => void;
  onTableContextMenu: (e: React.MouseEvent, connId: string, tbl: TableDefinition) => void;
  onViewContextMenu: (e: React.MouseEvent, connId: string, vw: ViewDefinition) => void;
  onProcedureContextMenu: (
    e: React.MouseEvent,
    connId: string,
    proc: ProcedureDefinition
  ) => void;
  onColumnContextMenu: (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition,
    col: ColumnDefinition
  ) => void;
}) {
  const filteredTables = schema.tables.filter((t) =>
    matchesSearchFilter(searchTerm, t.name, t.columns)
  );
  const viewsList = schema.views ?? [];
  const filteredViews = viewsList.filter((v) =>
    matchesSearchFilter(searchTerm, v.name, v.columns)
  );
  const proceduresList = schema.procedures ?? [];
  const filteredProcedures = proceduresList.filter((p) =>
    matchesSearchFilter(searchTerm, p.name)
  );

  const tablesGroupKey = `${schemaKey}_tables`;
  const viewsGroupKey = `${schemaKey}_views`;
  const proceduresGroupKey = `${schemaKey}_procedures`;

  const resolveGroupExpanded = (key: string, matchCount: number, fallback: boolean) =>
    searchTerm ? matchCount > 0 : expandedObjectGroups[key] ?? fallback;

  const isTablesExpanded = resolveGroupExpanded(tablesGroupKey, filteredTables.length, true);
  const isViewsExpanded = resolveGroupExpanded(viewsGroupKey, filteredViews.length, false);
  const isProceduresExpanded = resolveGroupExpanded(
    proceduresGroupKey,
    filteredProcedures.length,
    false
  );

  return (
    <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5 space-y-0.5 mt-0.5">
      <div>
        <ObjectGroupHeader
          label="Tables"
          count={filteredTables.length}
          isExpanded={isTablesExpanded}
          folderColorClass="text-blue-400"
          title="Tables (Right-click to create table or view ER diagram)"
          onToggle={() => onToggleObjectGroup(tablesGroupKey, true)}
          onContextMenu={(e) => onSchemaContextMenu(e, connId, schema.name)}
        />

        {isTablesExpanded && (
          <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5">
            {filteredTables.map((tbl) => {
              const tableKey = `${schemaKey}_tbl_${tbl.name}`;
              return (
                <TableTreeItem
                  key={tbl.name}
                  connId={connId}
                  tbl={tbl}
                  isExpanded={Boolean(expandedTables[tableKey])}
                  onToggleExpand={() => onToggleTable(tableKey)}
                  onOpenTable={onOpenTable}
                  onEditColumns={onEditColumns}
                  onDropTableClick={onDropTableClick}
                  onTableContextMenu={onTableContextMenu}
                  onColumnContextMenu={onColumnContextMenu}
                />
              );
            })}
            {filteredTables.length === 0 && (
              <div className="px-4 py-1 text-[11px] text-[#6b6b6b] italic">No tables</div>
            )}
          </div>
        )}
      </div>

      <div>
        <ObjectGroupHeader
          label="Views"
          count={filteredViews.length}
          isExpanded={isViewsExpanded}
          folderColorClass="text-emerald-400"
          title="Database Views (Right-click to create new view)"
          onToggle={() => onToggleObjectGroup(viewsGroupKey, false)}
          onContextMenu={(e) => onViewsGroupContextMenu(e, connId, schema.name)}
        />

        {isViewsExpanded && (
          <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5">
            {filteredViews.map((vw) => {
              const viewKey = `${schemaKey}_vw_${vw.name}`;
              return (
                <ViewTreeItem
                  key={vw.name}
                  connId={connId}
                  vw={vw}
                  isExpanded={Boolean(expandedViews[viewKey])}
                  onToggleExpand={() => onToggleView(viewKey)}
                  onOpenSqlEditor={onOpenSqlEditor}
                  onViewContextMenu={onViewContextMenu}
                />
              );
            })}
            {filteredViews.length === 0 && (
              <div className="px-4 py-1 text-[11px] text-[#6b6b6b] italic">No views</div>
            )}
          </div>
        )}
      </div>

      <div>
        <ObjectGroupHeader
          label="Procedures"
          count={filteredProcedures.length}
          isExpanded={isProceduresExpanded}
          folderColorClass="text-amber-400"
          title="Stored Procedures (Right-click to create new procedure)"
          onToggle={() => onToggleObjectGroup(proceduresGroupKey, false)}
          onContextMenu={(e) => onProceduresGroupContextMenu(e, connId, schema.name)}
        />

        {isProceduresExpanded && (
          <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5">
            {filteredProcedures.map((proc) => (
              <div
                key={proc.name}
                onClick={() => onOpenSqlEditor(connId, `EXEC ${proc.name};`)}
                onContextMenu={(e) => onProcedureContextMenu(e, connId, proc)}
                title={`Click to execute "${proc.name}" (Right-click for DDL)`}
                className="flex items-center justify-between px-2 py-1 mt-0.5 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0 pl-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{proc.name}</span>
                </div>
              </div>
            ))}
            {filteredProcedures.length === 0 && (
              <div className="px-4 py-1 text-[11px] text-[#6b6b6b] italic">No procedures</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
