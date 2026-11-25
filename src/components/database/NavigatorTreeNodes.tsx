import React from 'react';
import {
  DatabaseType,
  SchemaDefinition,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import {
  ObjectGroupSpec,
  generateCreateObjectTemplateSql,
  getObjectGroupsForEngine,
} from '../../utils/navigatorObjects';
import { TableTreeItem, ViewTreeItem, RoutineTreeItem } from './NavigatorLeafItems';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, RefreshCw } from 'lucide-react';

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
  onCreateClick,
  createTitle,
  onRefreshClick,
  isRefreshing,
}: {
  label: string;
  count: number;
  isExpanded: boolean;
  folderColorClass: string;
  title: string;
  onToggle: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onCreateClick?: () => void;
  createTitle?: string;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div
      className="group flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] rounded-sm"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[#858585]">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        {isExpanded ? (
          <FolderOpen className={`w-3.5 h-3.5 ${folderColorClass} shrink-0`} />
        ) : (
          <Folder className={`w-3.5 h-3.5 ${folderColorClass} shrink-0`} />
        )}
        <span className="font-medium truncate">{label}</span>
        <span className="text-[10px] text-[#6b6b6b] font-mono">({count})</span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1 shrink-0">
        {onCreateClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateClick();
            }}
            title={createTitle ?? `Create New ${label}`}
            aria-label={createTitle ?? `Create New ${label}`}
            className={`p-0.5 hover:bg-[#454545] rounded ${folderColorClass}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
        {onRefreshClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshClick();
            }}
            disabled={isRefreshing}
            title={`Refresh ${label}`}
            aria-label={`Refresh ${label}`}
            className="p-0.5 hover:bg-[#454545] disabled:opacity-50 rounded text-sky-400"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

function getRoutineItems(
  schema: SchemaDefinition,
  kind: 'procedures' | 'functions' | 'packages',
  searchTerm: string
): ProcedureDefinition[] {
  const list =
    kind === 'procedures'
      ? schema.procedures ?? []
      : kind === 'functions'
      ? schema.functions ?? []
      : schema.packages ?? [];
  return list.filter((item) => matchesSearchFilter(searchTerm, item.name));
}

function filterVisibleTables(
  tables: TableDefinition[],
  showSystemTables: boolean,
  searchTerm: string
): TableDefinition[] {
  return tables.filter(
    (t) => (showSystemTables || !t.system) && matchesSearchFilter(searchTerm, t.name, t.columns)
  );
}

export function SchemaObjectGroups({
  connId,
  dbType,
  schema,
  schemaKey,
  searchTerm,
  showSystemTables = true,
  isRefreshing = false,
  expandedObjectGroups,
  expandedTables,
  expandedViews,
  onToggleObjectGroup,
  onToggleTable,
  onToggleView,
  onOpenTable,
  onOpenSqlEditor,
  onEditColumns,
  onCreateTableClick,
  onRefreshConnection,
  onObjectGroupContextMenu,
  onTableContextMenu,
  onViewContextMenu,
  onRoutineContextMenu,
  onColumnContextMenu,
}: {
  connId: string;
  dbType: DatabaseType;
  schema: SchemaDefinition;
  schemaKey: string;
  searchTerm: string;
  showSystemTables?: boolean;
  isRefreshing?: boolean;
  expandedObjectGroups: Record<string, boolean>;
  expandedTables: Record<string, boolean>;
  expandedViews: Record<string, boolean>;
  onToggleObjectGroup: (key: string, defaultExpanded: boolean) => void;
  onToggleTable: (key: string) => void;
  onToggleView: (key: string) => void;
  onOpenTable: (connId: string, tableName: string) => void;
  onOpenSqlEditor: (connId: string, query?: string) => void;
  onEditColumns: (connId: string, table: TableDefinition) => void;
  onCreateTableClick: (connId: string) => void;
  onRefreshConnection?: () => void;
  onObjectGroupContextMenu: (
    e: React.MouseEvent,
    spec: ObjectGroupSpec,
    connId: string,
    schemaName: string
  ) => void;
  onTableContextMenu: (e: React.MouseEvent, connId: string, tbl: TableDefinition) => void;
  onViewContextMenu: (e: React.MouseEvent, connId: string, vw: ViewDefinition) => void;
  onRoutineContextMenu: (
    e: React.MouseEvent,
    connId: string,
    kind: 'procedure' | 'function' | 'package',
    item: ProcedureDefinition
  ) => void;
  onColumnContextMenu: (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition,
    col: ColumnDefinition
  ) => void;
}) {
  const groups = getObjectGroupsForEngine(dbType);
  const filteredTables = filterVisibleTables(schema.tables, showSystemTables, searchTerm);
  const filteredViews = (schema.views ?? []).filter((v) =>
    matchesSearchFilter(searchTerm, v.name, v.columns)
  );

  const resolveExpanded = (key: string, count: number, fallback: boolean) =>
    searchTerm ? count > 0 : expandedObjectGroups[key] ?? fallback;

  const handleCreateForGroup = (spec: ObjectGroupSpec) => {
    if (spec.kind === 'tables') {
      onCreateTableClick(connId);
      return;
    }
    onOpenSqlEditor(connId, generateCreateObjectTemplateSql(spec.kind, schema.name, dbType));
  };

  return (
    <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5 space-y-0.5 mt-0.5">
      {groups.map((spec) => {
        const groupKey = `${schemaKey}_${spec.kind}`;
        const itemsCount =
          spec.kind === 'tables'
            ? filteredTables.length
            : spec.kind === 'views'
            ? filteredViews.length
            : getRoutineItems(schema, spec.kind, searchTerm).length;
        const isExpanded = resolveExpanded(groupKey, itemsCount, spec.defaultExpanded);

        return (
          <div key={spec.kind}>
            <ObjectGroupHeader
              label={spec.label}
              count={itemsCount}
              isExpanded={isExpanded}
              folderColorClass={spec.colorClass}
              title={`${spec.label} (Right-click for actions)`}
              onToggle={() => onToggleObjectGroup(groupKey, spec.defaultExpanded)}
              onContextMenu={(e) => onObjectGroupContextMenu(e, spec, connId, schema.name)}
              onCreateClick={spec.supportsCreate ? () => handleCreateForGroup(spec) : undefined}
              createTitle={`Create New ${spec.singularLabel}`}
              onRefreshClick={onRefreshConnection}
              isRefreshing={isRefreshing}
            />

            {isExpanded && (
              <div className="pl-3.5 border-l border-[#2d2d2d] ml-2.5">
                {spec.kind === 'tables' &&
                  filteredTables.map((tbl) => {
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
                        onTableContextMenu={onTableContextMenu}
                        onColumnContextMenu={onColumnContextMenu}
                      />
                    );
                  })}

                {spec.kind === 'views' &&
                  filteredViews.map((vw) => {
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

                {spec.kind !== 'tables' &&
                  spec.kind !== 'views' &&
                  getRoutineItems(schema, spec.kind, searchTerm).map((item) => {
                    const singularKind =
                      spec.kind === 'procedures'
                        ? 'procedure'
                        : spec.kind === 'functions'
                        ? 'function'
                        : 'package';
                    return (
                      <RoutineTreeItem
                        key={item.name}
                        kind={singularKind}
                        connId={connId}
                        dialect={dbType}
                        item={item}
                        onOpenSqlEditor={onOpenSqlEditor}
                        onContextMenu={onRoutineContextMenu}
                      />
                    );
                  })}

                {itemsCount === 0 && (
                  <div className="px-4 py-1 text-[11px] text-[#6b6b6b] italic">
                    No {spec.label.toLowerCase()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
