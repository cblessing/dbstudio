import React, { useState } from 'react';
import { DatabaseConnection, EditorTab, QueryResult, TableDefinition } from './types/database';
import { databaseManager } from './engine/databaseManager';
import { StatusBar } from './components/vscode/StatusBar';
import {
  StandaloneTabBar,
  QueryOutputLogPanel,
  WorkspaceModals,
  ConfirmModalConfig,
  buildWorkspaceCommands,
} from './components/vscode/WorkspaceChrome';
import { DatabaseNavigator } from './components/database/DatabaseNavigator';
import { SqlEditor } from './components/editor/SqlEditor';
import { TableDetailsView } from './components/views/TableDetailsView';
import { ERDiagramViewer } from './components/diagram/ERDiagramViewer';
import { generateDropTableSql, generateTruncateTableSql, generateDropColumnSql } from './utils/tableManagement';
import { downloadFile, formatSqlValue, postVsCodeMessage, quoteSqlIdentifier } from './utils/exportData';
import { executeLiveQuery, deleteLiveConnection, isNetworkDatabaseType } from './utils/liveBridge';
import {
  VsCodeViewMode,
  VsCodeEditorConfig,
  getInjectedGlobal,
  createInitialTabs,
  resolveCurrentTableDefinition,
  getInitialConnections,
  getInitialConnectionId,
  findConnectionOrFallback,
  upsertConnectionList,
  useVsCodeHostSync,
  buildDestructiveConfirmConfig,
} from './hooks/useVsCodeHostSync';

function resolveTabConnInfo(tabConnection: DatabaseConnection | null) {
  return {
    id: tabConnection?.id ?? '',
    name: tabConnection?.name ?? 'No Connection',
    database: tabConnection?.database ?? '',
    tables: tabConnection?.schemas[0]?.tables ?? [],
  };
}

let nextTabId = 2;
const createTabId = (prefix: string) => `${prefix}_${nextTabId++}`;

export default function App() {
  const viewMode = getInjectedGlobal<VsCodeViewMode>('__VSCODE_VIEW_MODE__') || 'standalone';
  const initialEditorConfig = getInjectedGlobal<VsCodeEditorConfig>('__VSCODE_EDITOR_CONFIG__');
  const initialSyncedConnections = getInitialConnections();

  const [connections, setConnections] = useState<DatabaseConnection[]>(initialSyncedConnections);
  const [activeConnectionId, setActiveConnectionId] = useState<string>(() =>
    getInitialConnectionId(initialEditorConfig, initialSyncedConnections)
  );
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [connectionModal, setConnectionModal] = useState<{ open: boolean; editing: DatabaseConnection | null }>({ open: false, editing: null });
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [editingColumnsTable, setEditingColumnsTable] = useState<{
    connectionId: string;
    table: TableDefinition;
  } | null>(null);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [createTableConnectionId, setCreateTableConnectionId] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    'Ready for query execution.',
  ]);

  const [tabs, setTabs] = useState<EditorTab[]>(() =>
    createInitialTabs(viewMode, initialEditorConfig)
  );
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  const [executionStats, setExecutionStats] = useState<{
    lastTimeMs?: number;
    rowCount?: number;
    isExecuting?: boolean;
  }>({ isExecuting: false });

  useVsCodeHostSync(setConnections, setTabs, setIsCommandPaletteOpen);

  const broadcastConnectionsUpdate = (nextConnections: DatabaseConnection[], ddlQuery?: string) =>
    postVsCodeMessage({
      command: 'stateUpdate',
      connections: nextConnections.map(({ password: _pw, ...conn }) => (void _pw, conn)),
      ddlQuery,
    });

  const updateConnectionTables = (
    targetConnId: string | null,
    updater: (tables: TableDefinition[]) => TableDefinition[],
    ddlQuery?: string
  ) => {
    setConnections((prev) => {
      const next = prev.map((c) =>
        targetConnId && c.id !== targetConnId
          ? c
          : { ...c, schemas: c.schemas.map((s) => ({ ...s, tables: updater(s.tables) })) }
      );
      broadcastConnectionsUpdate(next, ddlQuery);
      return next;
    });
  };

  const activeConnection = findConnectionOrFallback(connections, activeConnectionId, connections[0] ?? null);
  const isVsCodeSplitView = viewMode !== 'standalone';

  const openSqlEditorTab = (connectionId: string, initialQuery?: string) => {
    if (!connectionId) return;
    if (isVsCodeSplitView) {
      postVsCodeMessage({ command: 'openEditor', editorType: 'query', connectionId, initialQuery });
      return;
    }
    const queryNumber = tabs.filter((t) => t.type === 'query').length + 1;
    const newTabId = createTabId('tab_sql');
    setTabs((prev) => [
      ...prev,
      { id: newTabId, title: `Script-${queryNumber}.sql`, type: 'query', connectionId, queryContent: initialQuery ?? '' },
    ]);
    setActiveTabId(newTabId);
  };

  const openTableTab = (connectionId: string, tableName: string) => {
    if (isVsCodeSplitView) {
      postVsCodeMessage({ command: 'openEditor', editorType: 'table', connectionId, tableName, title: `${tableName}.table` });
      return;
    }
    const existing = tabs.find((t) => t.type === 'table' && t.tableName === tableName && t.connectionId === connectionId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTabId = createTabId(`tab_tbl_${tableName}`);
    setTabs((prev) => [...prev, { id: newTabId, title: `${tableName}.table`, type: 'table', connectionId, tableName }]);
    setActiveTabId(newTabId);
  };

  const openERDiagramTab = (connectionId: string) => {
    const targetConn = connections.find((c) => c.id === connectionId) ?? activeConnection;
    if (!targetConn) return;
    const title = `${targetConn.database.replace(/\.[^.]+$/, '')}.erd`;
    if (isVsCodeSplitView) {
      postVsCodeMessage({ command: 'openEditor', editorType: 'erd', connectionId, title });
      return;
    }
    const existing = tabs.find((t) => t.type === 'erd' && t.connectionId === connectionId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTabId = createTabId('tab_erd');
    setTabs((prev) => [...prev, { id: newTabId, title, type: 'erd', connectionId }]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleExecuteQuery = async (
    query: string,
    options?: { offset?: number; batchSize?: number }
  ): Promise<QueryResult> => {
    if (!activeConnection) {
      return { columns: [], rows: [], executionTimeMs: 0, fetchTimeMs: 0, rowCount: 0, query, error: 'No active database connection.' };
    }
    setExecutionStats((prev) => ({ ...prev, isExecuting: true }));
    const timestamp = new Date().toLocaleTimeString();

    try {
      const res = isNetworkDatabaseType(activeConnection.type)
        ? await executeLiveQuery(activeConnection.id, query, options)
        : await databaseManager.executeQuery(query, options);
      setExecutionStats({
        lastTimeMs: res.executionTimeMs,
        rowCount: res.rowCount,
        isExecuting: false,
      });

      setExecutionLogs((prev) => [
        `[${timestamp}] Executed: "${query.slice(0, 45)}..." in ${res.executionTimeMs}ms (${res.rowCount} rows)`,
        ...prev.slice(0, 40),
      ]);

      if (/^\s*(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|EXEC)\b/i.test(query)) {
        postVsCodeMessage({ command: 'stateUpdate', ddlQuery: query });
      }
      return res;
    } catch (err: any) {
      setExecutionStats((prev) => ({ ...prev, isExecuting: false }));
      const errText = err ? String(err.message || err) : 'Execution error';
      setExecutionLogs((prev) => [`[${timestamp}] ERROR: ${errText}`, ...prev.slice(0, 40)]);
      throw err;
    }
  };

  const handleFetchTableData = async (tableName: string, offset = 0): Promise<QueryResult> =>
    activeConnection && isNetworkDatabaseType(activeConnection.type)
      ? executeLiveQuery(activeConnection.id, `SELECT * FROM ${quoteSqlIdentifier(tableName)} LIMIT 1000 OFFSET ${offset}`)
      : databaseManager.getTableData(tableName, 1000, offset);

  const getActiveTableName = () => {
    const active = tabs.find((t) => t.id === activeTabId);
    return active?.tableName ? active.tableName : 'customers';
  };

  const handleUpdateRow = async (rowIndex: number, colName: string, newValue: any) => {
    const tableId = quoteSqlIdentifier(getActiveTableName());
    const colId = quoteSqlIdentifier(colName);
    const safeOffset = Math.max(0, Math.floor(rowIndex));
    const sql = `UPDATE ${tableId} SET ${colId} = ${formatSqlValue(newValue)} WHERE id = (SELECT id FROM ${tableId} LIMIT 1 OFFSET ${safeOffset});`;
    await handleExecuteQuery(sql);
  };

  const handleAddRow = async (newRow: Record<string, any>) => {
    const tableId = quoteSqlIdentifier(getActiveTableName());
    const columns = Object.keys(newRow).filter((k) => newRow[k] !== '');
    if (columns.length === 0) return;

    const colList = columns.map((k) => quoteSqlIdentifier(k)).join(', ');
    const values = columns.map((k) => formatSqlValue(newRow[k]));
    const sql = `INSERT INTO ${tableId} (${colList}) VALUES (${values.join(', ')});`;
    await handleExecuteQuery(sql);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const tableId = quoteSqlIdentifier(getActiveTableName());
    const safeOffset = Math.max(0, Math.floor(rowIndex));
    const sql = `DELETE FROM ${tableId} WHERE id = (SELECT id FROM ${tableId} LIMIT 1 OFFSET ${safeOffset});`;
    await handleExecuteQuery(sql);
  };

  const handleDownloadDatabase = () => {
    if (!activeConnection) return;
    const binary = databaseManager.exportDatabaseBinary();
    if (!binary) return;
    const dbBaseName = activeConnection.database ? activeConnection.database : 'database_export';
    downloadFile(`${dbBaseName}.sqlite`, binary, 'application/x-sqlite3');
  };

  const getConnectionDialect = (connectionId: string) =>
    connections.find((c) => c.id === connectionId)?.type ?? 'sqlite';

  const handleDropTableClick = (connectionId: string, tableName: string) => {
    const ddl = generateDropTableSql(tableName, true, getConnectionDialect(connectionId));
    setConfirmModal(
      buildDestructiveConfirmConfig(
        `Drop Table: ${tableName}`,
        `Are you sure you want to drop "${tableName}"? This action will permanently delete the table and all its stored records.`,
        ddl,
        'Drop Table',
        async () => {
          await handleExecuteQuery(ddl);
          updateConnectionTables(connectionId, (tables) => tables.filter((t) => t.name !== tableName), ddl);
          setTabs((prev) => prev.filter((t) => !(t.type === 'table' && t.tableName === tableName)));
        }
      )
    );
  };

  const handleTruncateTableClick = (connectionId: string, tableName: string) => {
    const ddl = generateTruncateTableSql(tableName, getConnectionDialect(connectionId));
    setConfirmModal(
      buildDestructiveConfirmConfig(
        `Truncate Table: ${tableName}`,
        `Are you sure you want to delete all rows in "${tableName}"? The table schema will be preserved.`,
        ddl,
        'Truncate Table',
        async () => {
          await handleExecuteQuery(ddl);
          updateConnectionTables(connectionId, (tables) => tables.map((t) => (t.name === tableName ? { ...t, rowCount: 0 } : t)), ddl);
        }
      )
    );
  };

  const handleDropColumnClick = (connectionId: string, tableName: string, colName: string) => {
    const ddl = generateDropColumnSql(tableName, colName, getConnectionDialect(connectionId));
    setConfirmModal(
      buildDestructiveConfirmConfig(
        `Drop Column: ${colName}`,
        `Are you sure you want to drop column "${colName}" from table "${tableName}"? All data in this column will be discarded.`,
        ddl,
        'Drop Column',
        async () => {
          await handleExecuteQuery(ddl);
          updateConnectionTables(
            connectionId,
            (tables) =>
              tables.map((t) =>
                t.name === tableName ? { ...t, columns: t.columns.filter((col) => col.name !== colName) } : t
              ),
            ddl
          );
        }
      )
    );
  };

  const handleExecuteAlter = async (ddlSql: string, updatedTable: TableDefinition, oldTableName?: string) => {
    await handleExecuteQuery(ddlSql);
    const matchName = oldTableName ? oldTableName : updatedTable.name;
    updateConnectionTables(null, (tables) => tables.map((t) => (t.name === matchName ? updatedTable : t)), ddlSql);
    if (oldTableName && oldTableName !== updatedTable.name) {
      setTabs((prev) =>
        prev.map((t) =>
          t.type === 'table' && t.tableName === oldTableName
            ? { ...t, tableName: updatedTable.name, title: `${updatedTable.name}.table` }
            : t
        )
      );
    }
  };

  const handleCreateTable = async (tableDef: TableDefinition, ddl: string) => {
    await handleExecuteQuery(ddl);
    updateConnectionTables(createTableConnectionId, (tables) => [tableDef, ...tables], ddl);
    openTableTab(createTableConnectionId, tableDef.name);
  };

  const handleDeleteConnection = (connId: string) => {
    const target = connections.find((c) => c.id === connId);
    if (target && isNetworkDatabaseType(target.type)) {
      void deleteLiveConnection(connId).catch(() => {});
    }
    const next = connections.filter((c) => c.id !== connId);
    setConnections(next);
    broadcastConnectionsUpdate(next);
    if (activeConnectionId === connId) {
      setActiveConnectionId(next[0]?.id ?? '');
    }
  };

  const commands = buildWorkspaceCommands({
    onNewConnection: () => setConnectionModal({ open: true, editing: null }),
    onNewQuery: () => openSqlEditorTab(activeConnectionId),
    onOpenErd: () => openERDiagramTab(activeConnectionId),
    onExportDatabase: handleDownloadDatabase,
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const tabConnection = findConnectionOrFallback(connections, activeTab.connectionId, activeConnection);
  const currentTableDef = resolveCurrentTableDefinition(tabConnection, activeTab.tableName);
  const editingDialect = editingColumnsTable ? getConnectionDialect(editingColumnsTable.connectionId) : 'sqlite';

  const handleUpsertConnection = (savedConn: DatabaseConnection) => {
    setConnections((prev) => {
      const next = upsertConnectionList(prev, savedConn);
      broadcastConnectionsUpdate(next);
      return next;
    });
    setActiveConnectionId(savedConn.id);
  };

  const renderModals = () => (
    <WorkspaceModals
      isNewConnectionOpen={connectionModal.open}
      editingConnection={connectionModal.editing}
      onCloseNewConnection={() => setConnectionModal({ open: false, editing: null })}
      onAddConnection={handleUpsertConnection}
      isCommandPaletteOpen={isCommandPaletteOpen}
      onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
      commands={commands}
      editingColumnsTable={editingColumnsTable}
      editingDialect={editingDialect}
      onCloseEditColumns={() => setEditingColumnsTable(null)}
      onExecuteAlter={handleExecuteAlter}
      isCreateTableOpen={isCreateTableOpen}
      createTableDialect={getConnectionDialect(createTableConnectionId)}
      onCloseCreateTable={() => setIsCreateTableOpen(false)}
      onCreateTable={handleCreateTable}
      confirmModal={confirmModal}
      onCloseConfirmModal={() => setConfirmModal(null)}
    />
  );

  const renderDatabaseNavigator = () => (
    <DatabaseNavigator
      connections={connections}
      activeConnectionId={activeConnectionId}
      onSelectConnection={setActiveConnectionId}
      onOpenTable={openTableTab}
      onOpenSqlEditor={openSqlEditorTab}
      onOpenERDiagram={openERDiagramTab}
      onOpenNewConnectionModal={() => setConnectionModal({ open: true, editing: null })}
      onEditConnection={(conn) => setConnectionModal({ open: true, editing: conn })}
      onDeleteConnection={handleDeleteConnection}
      onEditColumns={(connId, tbl) =>
        setEditingColumnsTable({ connectionId: connId, table: tbl })
      }
      onCreateTableClick={(connId) => {
        setCreateTableConnectionId(connId);
        setIsCreateTableOpen(true);
      }}
      onDropTableClick={handleDropTableClick}
      onTruncateTableClick={handleTruncateTableClick}
      onDropColumnClick={handleDropColumnClick}
      onExportDatabase={handleDownloadDatabase}
    />
  );

  const renderActiveEditorContent = () => {
    if (activeTab.type === 'table') {
      return (
        <TableDetailsView
          table={currentTableDef}
          onFetchTableData={handleFetchTableData}
          onUpdateRow={handleUpdateRow}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
        />
      );
    }
    const connInfo = resolveTabConnInfo(tabConnection);
    if (activeTab.type === 'erd') {
      return (
        <ERDiagramViewer
          tables={connInfo.tables}
          connectionName={connInfo.name}
          onSelectTable={(tblName) => tabConnection && openTableTab(tabConnection.id, tblName)}
        />
      );
    }
    return (
      <SqlEditor
        initialQuery={activeTab.queryContent}
        onExecuteQuery={handleExecuteQuery}
        connectionName={connInfo.name}
        databaseName={connInfo.database}
        connections={connections}
        connectionId={connInfo.id}
        onSelectConnection={(nextConnId) => {
          setActiveConnectionId(nextConnId);
          setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, connectionId: nextConnId } : t)));
        }}
      />
    );
  };

  if (viewMode === 'sidebar') {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#252526] text-[#cccccc] font-sans overflow-hidden select-none">
        {renderDatabaseNavigator()}{renderModals()}
      </div>
    );
  }
  if (viewMode === 'editor') {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none">
        <main className="flex-1 min-h-0 relative flex flex-col" role="main">{renderActiveEditorContent()}</main>{renderModals()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none">
      <div className="flex-1 flex min-h-0 relative">
        {isSidebarVisible && (
          <aside className="w-64 sm:w-72 border-r border-[#2d2d2d] flex flex-col shrink-0 bg-[#252526]">
            {renderDatabaseNavigator()}
          </aside>
        )}
        <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] overflow-hidden" role="main">
          <StandaloneTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            isSidebarVisible={isSidebarVisible}
            isBottomPanelOpen={isBottomPanelOpen}
            hasConnection={Boolean(activeConnection)}
            onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onNewSqlTab={() => openSqlEditorTab(activeConnectionId)}
            onOpenErdTab={() => openERDiagramTab(activeConnectionId)}
            onToggleBottomPanel={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
          />
          <div className="flex-1 min-h-0 relative flex flex-col">{renderActiveEditorContent()}</div>
          {isBottomPanelOpen && <QueryOutputLogPanel logs={executionLogs} onClose={() => setIsBottomPanelOpen(false)} />}
        </main>
      </div>
      <StatusBar
        activeConnection={activeConnection}
        executionStats={executionStats}
        onOpenNewConnection={() => setConnectionModal({ open: true, editing: null })}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      {renderModals()}
    </div>
  );
}
