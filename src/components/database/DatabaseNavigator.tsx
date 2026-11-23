import React, { useState } from 'react';
import {
  DatabaseConnection,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import { ContextMenu, ContextMenuItem } from '../dialogs/ContextMenu';
import {
  buildTableContextMenuItems,
  buildViewContextMenuItems,
  buildProcedureContextMenuItems,
  buildColumnContextMenuItems,
  buildSchemaContextMenuItems,
  NavigatorMenuCallbacks,
} from './navigatorContextMenus';
import { SchemaObjectGroups } from './NavigatorTreeNodes';
import {
  ChevronRight,
  ChevronDown,
  Database,
  Search,
  FileCode,
  LayoutGrid,
  Code2,
  Trash2,
  Download,
} from 'lucide-react';

interface DatabaseNavigatorProps extends NavigatorMenuCallbacks {
  connections: DatabaseConnection[];
  activeConnectionId: string;
  onSelectConnection: (id: string) => void;
  onOpenNewConnectionModal: () => void;
  onDeleteConnection: (id: string) => void;
  onExportDatabase?: () => void;
}

function ConnectionTreeHeader({
  conn,
  isExpanded,
  isActive,
  canDelete,
  onToggleConnection,
  onOpenSqlEditor,
  onOpenERDiagram,
  onDeleteConnection,
}: {
  conn: DatabaseConnection;
  isExpanded: boolean;
  isActive: boolean;
  canDelete: boolean;
  onToggleConnection: () => void;
  onOpenSqlEditor: () => void;
  onOpenERDiagram: () => void;
  onDeleteConnection: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer rounded-sm hover:bg-[#2a2d2e] ${
        isActive ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc]'
      }`}
      onClick={onToggleConnection}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[#858585] group-hover:text-white">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        <div
          className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-white font-bold text-[9px]"
          style={{ backgroundColor: conn.colorBadge }}
          title={`${conn.type.toUpperCase()} Driver`}
        >
          {conn.type.slice(0, 2).toUpperCase()}
        </div>

        <span className="truncate flex-1" title={conn.name}>
          {conn.name}
        </span>

        {conn.status === 'connected' ? (
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
            title={`Connected (${conn.pingMs ?? 1}ms)`}
          />
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0"
            title="Disconnected"
          />
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSqlEditor();
          }}
          title="SQL Console"
          aria-label={`Open SQL Console for ${conn.name}`}
          className="p-0.5 hover:bg-[#454545] rounded text-amber-300"
        >
          <Code2 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenERDiagram();
          }}
          title="ER Diagram"
          aria-label={`Open ER Diagram for ${conn.name}`}
          className="p-0.5 hover:bg-[#454545] rounded text-sky-300"
        >
          <LayoutGrid className="w-3 h-3" />
        </button>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConnection();
            }}
            title="Remove Connection"
            aria-label={`Remove Connection ${conn.name}`}
            className="p-0.5 hover:bg-rose-900/60 rounded text-rose-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export const DatabaseNavigator: React.FC<DatabaseNavigatorProps> = ({
  connections,
  activeConnectionId,
  onSelectConnection,
  onOpenTable,
  onOpenSqlEditor,
  onOpenERDiagram,
  onOpenNewConnectionModal,
  onDeleteConnection,
  onEditColumns,
  onCreateTableClick,
  onDropTableClick,
  onTruncateTableClick,
  onDropColumnClick,
  onExportDatabase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({
    [activeConnectionId]: true,
    conn_sqlite_local: true,
  });
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [expandedObjectGroups, setExpandedObjectGroups] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [expandedViews, setExpandedViews] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const menuCallbacks: NavigatorMenuCallbacks = {
    onOpenTable,
    onOpenSqlEditor,
    onOpenERDiagram,
    onEditColumns,
    onCreateTableClick,
    onDropTableClick,
    onTruncateTableClick,
    onDropColumnClick,
  };

  const toggleConnection = (id: string) => {
    setExpandedConnections((prev) => ({ ...prev, [id]: !prev[id] }));
    onSelectConnection(id);
  };

  const toggleSchema = (key: string) => {
    setExpandedSchemas((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const toggleObjectGroup = (groupKey: string, defaultExpanded = false) => {
    setExpandedObjectGroups((prev) => ({
      ...prev,
      [groupKey]: !(prev[groupKey] ?? defaultExpanded),
    }));
  };

  const toggleTable = (tableKey: string) => {
    setExpandedTables((prev) => ({ ...prev, [tableKey]: !prev[tableKey] }));
  };

  const toggleView = (viewKey: string) => {
    setExpandedViews((prev) => ({ ...prev, [viewKey]: !prev[viewKey] }));
  };

  const openContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleTableContextMenu = (e: React.MouseEvent, connId: string, tbl: TableDefinition) =>
    openContextMenu(e, buildTableContextMenuItems(connId, tbl, menuCallbacks));

  const handleViewContextMenu = (e: React.MouseEvent, connId: string, vw: ViewDefinition) =>
    openContextMenu(e, buildViewContextMenuItems(connId, vw, menuCallbacks));

  const handleProcedureContextMenu = (
    e: React.MouseEvent,
    connId: string,
    proc: ProcedureDefinition
  ) => openContextMenu(e, buildProcedureContextMenuItems(connId, proc, menuCallbacks));

  const handleColumnContextMenu = (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition,
    col: ColumnDefinition
  ) => openContextMenu(e, buildColumnContextMenuItems(connId, tbl, col, menuCallbacks));

  const handleSchemaContextMenu = (e: React.MouseEvent, connId: string, schemaName: string) =>
    openContextMenu(e, buildSchemaContextMenuItems(connId, schemaName, menuCallbacks));

  const activeConn = connections.find((c) => c.id === activeConnectionId) ?? connections[0];
  const defaultActiveId = activeConn ? activeConn.id : 'conn_sqlite_local';

  return (
    <div
      className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs border-r border-[#1e1e1e]"
      role="region"
      aria-label="Database Navigator"
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#333333] bg-[#2d2d2d]">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-[#969696] flex items-center gap-1.5 truncate">
          <Database className="w-3.5 h-3.5 text-[#007acc] shrink-0" />
          <span className="truncate">Connections</span>
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onOpenNewConnectionModal}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="New Database Connection"
            aria-label="New Database Connection"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button
            onClick={() => onOpenSqlEditor(defaultActiveId)}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="New SQL Script"
            aria-label="New SQL Script"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
          </button>
          <button
            onClick={() => onOpenERDiagram(defaultActiveId)}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="Open ER Diagram"
            aria-label="Open ER Diagram"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
          </button>
          {onExportDatabase && (
            <button
              onClick={onExportDatabase}
              className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
              title="Export SQLite Database (.sqlite)"
              aria-label="Export SQLite Database"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-2 border-b border-[#2d2d2d]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#858585]" />
          <input
            type="text"
            placeholder="Filter tables, views, procedures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 pl-7 py-1 text-xs text-[#cccccc] placeholder-[#6b6b6b] outline-none"
            aria-label="Filter database objects"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1.5 text-[#858585] hover:text-white"
              aria-label="Clear filter"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {connections.map((conn) => {
          const isConnExpanded = Boolean(expandedConnections[conn.id]);
          const isActive = conn.id === activeConnectionId;

          return (
            <div key={conn.id} className="mb-0.5">
              <ConnectionTreeHeader
                conn={conn}
                isExpanded={isConnExpanded}
                isActive={isActive}
                canDelete={connections.length > 1}
                onToggleConnection={() => toggleConnection(conn.id)}
                onOpenSqlEditor={() => onOpenSqlEditor(conn.id)}
                onOpenERDiagram={() => onOpenERDiagram(conn.id)}
                onDeleteConnection={() => onDeleteConnection(conn.id)}
              />

              {isConnExpanded && (
                <div className="pl-3.5">
                  {conn.schemas.map((schema) => {
                    const schemaKey = `${conn.id}_${schema.name}`;
                    const isSchemaExpanded = expandedSchemas[schemaKey] ?? true;

                    return (
                      <div key={schema.name} className="mt-0.5">
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#b0b0b0] rounded-sm"
                          onClick={() => toggleSchema(schemaKey)}
                          onContextMenu={(e) =>
                            handleSchemaContextMenu(e, conn.id, schema.name)
                          }
                          title="Right-click for schema actions (Create Table, SQL, ERD)"
                        >
                          <span className="text-[#858585]">
                            {isSchemaExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </span>
                          <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="font-medium text-[#cccccc] truncate">
                            {schema.name}
                          </span>
                        </div>

                        {isSchemaExpanded && (
                          <SchemaObjectGroups
                            connId={conn.id}
                            schema={schema}
                            schemaKey={schemaKey}
                            searchTerm={searchTerm}
                            expandedObjectGroups={expandedObjectGroups}
                            expandedTables={expandedTables}
                            expandedViews={expandedViews}
                            onToggleObjectGroup={toggleObjectGroup}
                            onToggleTable={toggleTable}
                            onToggleView={toggleView}
                            onOpenTable={onOpenTable}
                            onOpenSqlEditor={onOpenSqlEditor}
                            onEditColumns={onEditColumns}
                            onDropTableClick={onDropTableClick}
                            onSchemaContextMenu={handleSchemaContextMenu}
                            onTableContextMenu={handleTableContextMenu}
                            onViewContextMenu={handleViewContextMenu}
                            onProcedureContextMenu={handleProcedureContextMenu}
                            onColumnContextMenu={handleColumnContextMenu}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-2.5 py-1.5 border-t border-[#333333] bg-[#1e1e1e] flex items-center justify-between text-[11px] text-[#858585]">
        <button
          onClick={onOpenNewConnectionModal}
          className="text-sky-400 hover:underline font-medium"
        >
          + Connect
        </button>
      </div>

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
