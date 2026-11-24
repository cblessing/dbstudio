import React, { useRef, useState } from 'react';
import {
  DatabaseConnection,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import { ContextMenu, ContextMenuItem } from '../dialogs/ContextMenu';
import {
  buildConnectionContextMenuItems,
  buildTableContextMenuItems,
  buildViewContextMenuItems,
  buildProcedureContextMenuItems,
  buildViewsGroupContextMenuItems,
  buildProceduresGroupContextMenuItems,
  buildColumnContextMenuItems,
  buildSchemaContextMenuItems,
  NavigatorMenuCallbacks,
} from './navigatorContextMenus';
import { SchemaObjectGroups } from './NavigatorTreeNodes';
import {
  NavigatorHeader,
  ConnectionTreeHeader,
  SchemaTreeRow,
} from './NavigatorHeaderRows';
import { parseImportedConnectionProfiles } from '../../utils/connectionProfiles';
import { Database, Search } from 'lucide-react';

interface DatabaseNavigatorProps extends NavigatorMenuCallbacks {
  connections: DatabaseConnection[];
  activeConnectionId: string;
  isRefreshing?: boolean;
  onSelectConnection: (id: string) => void;
  onOpenNewConnectionModal: () => void;
  onEditConnection: (conn: DatabaseConnection) => void;
  onRefreshConnection?: (id: string) => void;
  onRefreshAllConnections?: () => void;
  onImportConnections?: (imported: DatabaseConnection[]) => void;
  onExportConnections?: () => void;
  onDeleteConnection: (id: string) => void;
  onExportDatabase?: () => void;
}

export const DatabaseNavigator: React.FC<DatabaseNavigatorProps> = ({
  connections,
  activeConnectionId,
  isRefreshing = false,
  onSelectConnection,
  onOpenTable,
  onOpenSqlEditor,
  onOpenERDiagram,
  onOpenNewConnectionModal,
  onEditConnection,
  onRefreshConnection,
  onRefreshAllConnections,
  onImportConnections,
  onExportConnections,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleSchema = (key: string) =>
    setExpandedSchemas((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  const toggleObjectGroup = (groupKey: string, defaultExpanded = false) =>
    setExpandedObjectGroups((prev) => ({ ...prev, [groupKey]: !(prev[groupKey] ?? defaultExpanded) }));

  const handleCollapseAll = () => {
    setExpandedConnections({});
    setExpandedSchemas({});
    setExpandedObjectGroups({});
    setExpandedTables({});
    setExpandedViews({});
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportConnections) return;
    try {
      const imported = parseImportedConnectionProfiles(await file.text());
      if (imported.length > 0) onImportConnections(imported);
    } catch (err) {
      console.error('Failed to import connections file:', err);
    }
  };

  const openContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const getConnDialect = (connId: string) =>
    connections.find((c) => c.id === connId)?.type ?? 'sqlite';

  const handleTableContextMenu = (e: React.MouseEvent, connId: string, tbl: TableDefinition) =>
    openContextMenu(e, buildTableContextMenuItems(connId, tbl, menuCallbacks));

  const handleViewContextMenu = (e: React.MouseEvent, connId: string, vw: ViewDefinition) =>
    openContextMenu(e, buildViewContextMenuItems(connId, vw, menuCallbacks, getConnDialect(connId)));

  const handleProcedureContextMenu = (e: React.MouseEvent, connId: string, proc: ProcedureDefinition) =>
    openContextMenu(e, buildProcedureContextMenuItems(connId, proc, menuCallbacks, getConnDialect(connId)));

  const handleViewsGroupContextMenu = (e: React.MouseEvent, connId: string, schemaName: string) =>
    openContextMenu(e, buildViewsGroupContextMenuItems(connId, schemaName, getConnDialect(connId), menuCallbacks));

  const handleProceduresGroupContextMenu = (e: React.MouseEvent, connId: string, schemaName: string) =>
    openContextMenu(e, buildProceduresGroupContextMenuItems(connId, schemaName, getConnDialect(connId), menuCallbacks));

  const handleColumnContextMenu = (e: React.MouseEvent, connId: string, tbl: TableDefinition, col: ColumnDefinition) =>
    openContextMenu(e, buildColumnContextMenuItems(connId, tbl, col, menuCallbacks));

  const handleSchemaContextMenu = (e: React.MouseEvent, connId: string, schemaName: string) =>
    openContextMenu(e, buildSchemaContextMenuItems(connId, schemaName, menuCallbacks, getConnDialect(connId)));

  const handleConnectionContextMenu = (e: React.MouseEvent, conn: DatabaseConnection) =>
    openContextMenu(
      e,
      buildConnectionContextMenuItems(conn, true, {
        onEditConnection,
        onRefreshConnection,
        onOpenSqlEditor,
        onExportSqlite: onExportDatabase,
        onDeleteConnection,
      })
    );

  const hasConnection = connections.length > 0;

  return (
    <div
      className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs border-r border-[#1e1e1e]"
      role="region"
      aria-label="Database Navigator"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
        aria-hidden="true"
      />

      <NavigatorHeader
        hasConnection={hasConnection}
        isRefreshing={isRefreshing}
        onNewConnection={onOpenNewConnectionModal}
        onRefreshAll={onRefreshAllConnections}
        onCollapseAll={handleCollapseAll}
        onImportClick={() => fileInputRef.current?.click()}
        onExportConnections={onExportConnections}
      />

      <div className="p-2 border-b border-[#2d2d2d]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#858585]" />
          <input
            type="text"
            placeholder="Filter tables, views, procedures..."
            value={searchTerm}
            disabled={!hasConnection}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] disabled:opacity-40 disabled:cursor-not-allowed rounded px-2 pl-7 py-1 text-xs text-[#cccccc] placeholder-[#6b6b6b] outline-none"
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
        {!hasConnection ? (
          <div className="px-4 py-8 text-center text-[#858585] space-y-2">
            <Database className="w-6 h-6 mx-auto opacity-50" />
            <p className="text-xs text-[#a0a0a0]">No database connections</p>
            <button
              onClick={onOpenNewConnectionModal}
              className="px-3 py-1.5 rounded bg-[#007acc] hover:bg-[#0066ad] text-white text-xs font-medium transition-colors"
            >
              + New Connection
            </button>
          </div>
        ) : (
          connections.map((conn) => {
            const isConnExpanded = Boolean(expandedConnections[conn.id]);
            const isActive = conn.id === activeConnectionId;

            return (
              <div key={conn.id} className="mb-0.5">
                <ConnectionTreeHeader
                  conn={conn}
                  isExpanded={isConnExpanded}
                  isActive={isActive}
                  onToggleConnection={() => toggleConnection(conn.id)}
                  onContextMenu={(e) => handleConnectionContextMenu(e, conn)}
                  onOpenSqlEditor={() => onOpenSqlEditor(conn.id)}
                  onDeleteConnection={() => onDeleteConnection(conn.id)}
                />

                {isConnExpanded && (
                  <div className="pl-3.5">
                    {conn.schemas.map((schema) => {
                      const schemaKey = `${conn.id}_${schema.name}`;
                      const isSchemaExpanded = expandedSchemas[schemaKey] ?? true;

                      return (
                        <div key={schema.name} className="mt-0.5">
                          <SchemaTreeRow
                            conn={conn}
                            schemaName={schema.name}
                            isExpanded={isSchemaExpanded}
                            onToggle={() => toggleSchema(schemaKey)}
                            onContextMenu={(e) => handleSchemaContextMenu(e, conn.id, schema.name)}
                            onOpenSqlEditor={() => onOpenSqlEditor(conn.id)}
                            onOpenERDiagram={() => onOpenERDiagram(conn.id)}
                          />

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
                              onToggleTable={(k) => setExpandedTables((p) => ({ ...p, [k]: !p[k] }))}
                              onToggleView={(k) => setExpandedViews((p) => ({ ...p, [k]: !p[k] }))}
                              onOpenTable={onOpenTable}
                              onOpenSqlEditor={onOpenSqlEditor}
                              onEditColumns={onEditColumns}
                              onDropTableClick={onDropTableClick}
                              onSchemaContextMenu={handleSchemaContextMenu}
                              onViewsGroupContextMenu={handleViewsGroupContextMenu}
                              onProceduresGroupContextMenu={handleProceduresGroupContextMenu}
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
          })
        )}
      </div>

      <div className="px-2.5 py-1.5 border-t border-[#333333] bg-[#1e1e1e] flex items-center justify-between text-[11px] text-[#858585]">
        <button onClick={onOpenNewConnectionModal} className="text-sky-400 hover:underline font-medium">
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
