import React, { useState, useEffect } from 'react';
import {
  DatabaseConnection,
  EditorTab,
  QueryResult,
  TableDefinition,
} from './types/database';
import {
  INITIAL_CONNECTIONS,
  INITIAL_ECOMMERCE_TABLES,
} from './wasm/sqlEngineCore';
import { wasmDatabaseManager } from './wasm/wasmDatabaseManager';
import { ActivityBar } from './components/vscode/ActivityBar';
import { StatusBar } from './components/vscode/StatusBar';
import { DatabaseNavigator } from './components/database/DatabaseNavigator';
import { ExplorerPanel, ExtensionsPanel } from './components/vscode/SidePanels';
import { SqlEditor } from './components/editor/SqlEditor';
import { TableDetailsView } from './components/views/TableDetailsView';
import { ERDiagramViewer } from './components/diagram/ERDiagramViewer';
import { NewConnectionModal } from './components/dialogs/NewConnectionModal';
import { EditColumnsModal } from './components/dialogs/EditColumnsModal';
import { CreateTableModal } from './components/dialogs/CreateTableModal';
import { ConfirmActionModal } from './components/dialogs/ConfirmActionModal';
import { InstallVsCodeModal } from './components/dialogs/InstallVsCodeModal';
import {
  generateDropTableSql,
  generateTruncateTableSql,
  generateDropColumnSql,
} from './utils/tableManagement';
import {
  CommandPaletteModal,
  CommandItem,
} from './components/dialogs/CommandPaletteModal';
import {
  Database,
  Table,
  FileCode,
  LayoutGrid,
  Plus,
  X,
  Search,
  Code2,
  Terminal,
  Download,
  Upload,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  Package,
} from 'lucide-react';

export default function App() {
  const [connections, setConnections] = useState<DatabaseConnection[]>(INITIAL_CONNECTIONS);
  const [activeConnectionId, setActiveConnectionId] = useState<string>(INITIAL_CONNECTIONS[0].id);
  const [activeView, setActiveView] = useState<'database' | 'explorer' | 'search' | 'extensions'>('database');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewConnectionOpen, setIsNewConnectionOpen] = useState(false);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [editingColumnsTable, setEditingColumnsTable] = useState<{
    connectionId: string;
    table: TableDefinition;
  } | null>(null);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isInstallVsCodeOpen, setIsInstallVsCodeOpen] = useState(false);
  const [createTableConnectionId, setCreateTableConnectionId] = useState<string>(
    INITIAL_CONNECTIONS[0].id
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    sqlStatement?: string;
    confirmButtonLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [executionLogs, setExecutionLogs] = useState<string[]>([
    'WebAssembly SQL engine initialized (sql.js / SQLite 3.45 in 32-bit linear address space)',
    'Loaded enterprise schemas: customers, categories, products, orders, order_items, reviews',
    'Ready for query execution.',
  ]);

  // Tabs state
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: 'tab_sql_1',
      title: 'Script-1.sql',
      type: 'query',
      connectionId: INITIAL_CONNECTIONS[0].id,
      queryContent: `SELECT 
  p.title AS product_name,
  c.name AS category,
  p.price,
  SUM(oi.quantity) AS total_sold,
  ROUND(SUM(oi.subtotal), 2) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY p.id, p.title, c.name, p.price
ORDER BY total_revenue DESC;`,
    },
    {
      id: 'tab_erd_1',
      title: 'ERD: E-Commerce Schema',
      type: 'erd',
      connectionId: INITIAL_CONNECTIONS[0].id,
    },
    {
      id: 'tab_tbl_customers',
      title: 'Table: customers',
      type: 'table',
      connectionId: INITIAL_CONNECTIONS[0].id,
      tableName: 'customers',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab_sql_1');

  // Execution Stats for Status Bar
  const [executionStats, setExecutionStats] = useState<{
    lastTimeMs?: number;
    rowCount?: number;
    isExecuting?: boolean;
  }>({
    lastTimeMs: 1.2,
    rowCount: 5,
    isExecuting: false,
  });

  // Hotkey listener for Command Palette (Ctrl+P or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active Connection helper
  const activeConnection =
    connections.find((c) => c.id === activeConnectionId) || connections[0];

  // Tab management helpers
  const openSqlEditorTab = (connectionId: string, initialQuery?: string) => {
    const newTabId = `tab_sql_${Date.now()}`;
    const newTab: EditorTab = {
      id: newTabId,
      title: `Script-${tabs.filter((t) => t.type === 'query').length + 1}.sql`,
      type: 'query',
      connectionId,
      queryContent:
        initialQuery ||
        `SELECT * FROM products\nJOIN categories ON products.category_id = categories.id\nLIMIT 100;`,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const openTableTab = (connectionId: string, tableName: string) => {
    const existing = tabs.find(
      (t) => t.type === 'table' && t.tableName === tableName && t.connectionId === connectionId
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTabId = `tab_tbl_${tableName}_${Date.now()}`;
    const newTab: EditorTab = {
      id: newTabId,
      title: `Table: ${tableName}`,
      type: 'table',
      connectionId,
      tableName,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const openERDiagramTab = (connectionId: string) => {
    const existing = tabs.find((t) => t.type === 'erd' && t.connectionId === connectionId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTabId = `tab_erd_${Date.now()}`;
    const newTab: EditorTab = {
      id: newTabId,
      title: `ERD: ${activeConnection.database}`,
      type: 'erd',
      connectionId,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  // WASM Query Execution Handler
  const handleExecuteQuery = async (query: string): Promise<QueryResult> => {
    setExecutionStats((prev) => ({ ...prev, isExecuting: true }));
    const timestamp = new Date().toLocaleTimeString();

    try {
      const res = await wasmDatabaseManager.executeQuery(query);
      setExecutionStats({
        lastTimeMs: res.executionTimeMs,
        rowCount: res.rowCount,
        isExecuting: false,
      });

      setExecutionLogs((prev) => [
        `[${timestamp}] Executed: "${query.slice(0, 45)}..." in ${res.executionTimeMs}ms (${res.rowCount} rows)`,
        ...prev.slice(0, 40),
      ]);

      return res;
    } catch (err: any) {
      setExecutionStats((prev) => ({ ...prev, isExecuting: false }));
      setExecutionLogs((prev) => [
        `[${timestamp}] ERROR: ${err?.message || String(err)}`,
        ...prev.slice(0, 40),
      ]);
      throw err;
    }
  };

  // Fetch Table Data Handler
  const handleFetchTableData = async (tableName: string): Promise<QueryResult> => {
    return wasmDatabaseManager.getTableData(tableName, 100);
  };

  // Row Modification Handlers
  const handleUpdateRow = async (rowIndex: number, colName: string, newValue: any) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const tableName = activeTab?.tableName || 'customers';
    const escapedVal = typeof newValue === 'number' ? newValue : `'${String(newValue).replace(/'/g, "''")}'`;
    const sql = `UPDATE ${tableName} SET ${colName} = ${escapedVal} WHERE id = (SELECT id FROM ${tableName} LIMIT 1 OFFSET ${rowIndex});`;

    await handleExecuteQuery(sql);
  };

  const handleAddRow = async (newRow: Record<string, any>) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const tableName = activeTab?.tableName || 'customers';
    const columns = Object.keys(newRow).filter((k) => newRow[k] !== '');
    const values = columns.map((k) => {
      const val = newRow[k];
      return typeof val === 'number' ? val : `'${String(val).replace(/'/g, "''")}'`;
    });

    if (columns.length > 0) {
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
      await handleExecuteQuery(sql);
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const tableName = activeTab?.tableName || 'customers';
    const sql = `DELETE FROM ${tableName} WHERE id = (SELECT id FROM ${tableName} LIMIT 1 OFFSET ${rowIndex});`;
    await handleExecuteQuery(sql);
  };

  // Export SQLite WASM Binary File
  const handleDownloadDatabase = () => {
    const binary = wasmDatabaseManager.exportDatabaseBinary();
    if (binary) {
      const blob = new Blob([binary as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeConnection.database || 'database_export'}.sqlite`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  // Drop Table Handler with confirmation
  const handleDropTableClick = (connectionId: string, tableName: string) => {
    const targetConn = connections.find((c) => c.id === connectionId);
    const dialect = targetConn?.type || 'sqlite';
    const ddl = generateDropTableSql(tableName, true, dialect);
    setConfirmModal({
      isOpen: true,
      title: `Drop Table: ${tableName}`,
      description: `Are you sure you want to drop "${tableName}"? This action will permanently delete the table and all its stored records from WebAssembly memory.`,
      sqlStatement: ddl,
      confirmButtonLabel: 'Drop Table',
      isDestructive: true,
      onConfirm: async () => {
        await handleExecuteQuery(ddl);
        // Remove table from connection state
        setConnections((prev) =>
          prev.map((c) => {
            if (c.id !== connectionId) return c;
            return {
              ...c,
              schemas: c.schemas.map((s) => ({
                ...s,
                tables: s.tables.filter((t) => t.name !== tableName),
              })),
            };
          })
        );
        // Close tab if open
        setTabs((prev) => prev.filter((t) => !(t.type === 'table' && t.tableName === tableName)));
      },
    });
  };

  // Truncate Table Handler
  const handleTruncateTableClick = (connectionId: string, tableName: string) => {
    const targetConn = connections.find((c) => c.id === connectionId);
    const dialect = targetConn?.type || 'sqlite';
    const ddl = generateTruncateTableSql(tableName, dialect);
    setConfirmModal({
      isOpen: true,
      title: `Truncate Table: ${tableName}`,
      description: `Are you sure you want to delete all rows in "${tableName}"? The table schema will be preserved.`,
      sqlStatement: ddl,
      confirmButtonLabel: 'Truncate Table',
      isDestructive: true,
      onConfirm: async () => {
        await handleExecuteQuery(ddl);
        // Reset row count to 0 in state
        setConnections((prev) =>
          prev.map((c) => {
            if (c.id !== connectionId) return c;
            return {
              ...c,
              schemas: c.schemas.map((s) => ({
                ...s,
                tables: s.tables.map((t) =>
                  t.name === tableName ? { ...t, rowCount: 0 } : t
                ),
              })),
            };
          })
        );
      },
    });
  };

  // Drop Column Handler
  const handleDropColumnClick = (
    connectionId: string,
    tableName: string,
    colName: string
  ) => {
    const targetConn = connections.find((c) => c.id === connectionId);
    const dialect = targetConn?.type || 'sqlite';
    const ddl = generateDropColumnSql(tableName, colName, dialect);
    setConfirmModal({
      isOpen: true,
      title: `Drop Column: ${colName}`,
      description: `Are you sure you want to drop column "${colName}" from table "${tableName}"? All data in this column will be discarded.`,
      sqlStatement: ddl,
      confirmButtonLabel: 'Drop Column',
      isDestructive: true,
      onConfirm: async () => {
        await handleExecuteQuery(ddl);
        // Update column list in state
        setConnections((prev) =>
          prev.map((c) => {
            if (c.id !== connectionId) return c;
            return {
              ...c,
              schemas: c.schemas.map((s) => ({
                ...s,
                tables: s.tables.map((t) => {
                  if (t.name !== tableName) return t;
                  return {
                    ...t,
                    columns: t.columns.filter((col) => col.name !== colName),
                  };
                }),
              })),
            };
          })
        );
      },
    });
  };

  // Alter Table Handler (from EditColumnsModal)
  const handleExecuteAlter = async (
    ddlSql: string,
    updatedTable: TableDefinition
  ) => {
    await handleExecuteQuery(ddlSql);
    // Reflect in connections state
    setConnections((prev) =>
      prev.map((c) => {
        return {
          ...c,
          schemas: c.schemas.map((s) => ({
            ...s,
            tables: s.tables.map((t) =>
              t.name === updatedTable.name ? updatedTable : t
            ),
          })),
        };
      })
    );
  };

  // Create Table Handler (from CreateTableModal)
  const handleCreateTable = async (tableDef: TableDefinition, ddl: string) => {
    await handleExecuteQuery(ddl);
    // Add table to connection state
    setConnections((prev) =>
      prev.map((c) => {
        if (c.id !== createTableConnectionId) return c;
        const schema = c.schemas[0] || { name: 'public', tables: [] };
        return {
          ...c,
          schemas: [
            {
              ...schema,
              tables: [tableDef, ...schema.tables],
            },
          ],
        };
      })
    );
    // Automatically open the new table
    openTableTab(createTableConnectionId, tableDef.name);
  };

  // Command Palette Items
  const commands: CommandItem[] = [
    {
      id: 'cmd_install_vscode',
      title: 'VS Code: Install / Package Extension (F5 & .VSIX Guide)',
      category: 'Extension',
      shortcut: 'Ctrl+Shift+I',
      icon: <Package className="w-4 h-4 text-sky-400" />,
      action: () => setIsInstallVsCodeOpen(true),
    },
    {
      id: 'cmd_new_conn',
      title: 'Database: New Connection (All Drivers)',
      category: 'Connection',
      shortcut: 'Ctrl+Shift+N',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      action: () => setIsNewConnectionOpen(true),
    },
    {
      id: 'cmd_new_query',
      title: 'Database: Open New SQL Query Editor',
      category: 'SQL Editor',
      shortcut: 'Ctrl+N',
      icon: <FileCode className="w-4 h-4 text-amber-400" />,
      action: () => openSqlEditorTab(activeConnectionId),
    },
    {
      id: 'cmd_open_erd',
      title: 'Database: View Interactive ER Diagram',
      category: 'Schema Tools',
      shortcut: 'Ctrl+Shift+E',
      icon: <LayoutGrid className="w-4 h-4 text-sky-400" />,
      action: () => openERDiagramTab(activeConnectionId),
    },
    {
      id: 'cmd_export_db',
      title: 'Database: Export Database Binary (.sqlite file)',
      category: 'Tools',
      icon: <Download className="w-4 h-4 text-purple-400" />,
      action: handleDownloadDatabase,
    },
    {
      id: 'cmd_view_customers',
      title: 'Database: Open Table: customers',
      category: 'Data Grid',
      icon: <Table className="w-4 h-4 text-blue-400" />,
      action: () => openTableTab(activeConnectionId, 'customers'),
    },
    {
      id: 'cmd_view_products',
      title: 'Database: Open Table: products',
      category: 'Data Grid',
      icon: <Table className="w-4 h-4 text-blue-400" />,
      action: () => openTableTab(activeConnectionId, 'products'),
    },
    {
      id: 'cmd_view_orders',
      title: 'Database: Open Table: orders',
      category: 'Data Grid',
      icon: <Table className="w-4 h-4 text-blue-400" />,
      action: () => openTableTab(activeConnectionId, 'orders'),
    },
  ];

  // Active Tab object
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Table definition if active tab is table view
  const allConnectionTables = activeConnection.schemas.flatMap((s) => s.tables);
  const currentTableDef =
    allConnectionTables.find((t) => t.name === activeTab.tableName) ||
    INITIAL_ECOMMERCE_TABLES.find((t) => t.name === activeTab.tableName) ||
    allConnectionTables[0] ||
    INITIAL_ECOMMERCE_TABLES[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none">
      {/* Top VS Code Window Titlebar */}
      <header
        className="h-9 bg-[#323233] border-b border-[#2b2b2b] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0"
        role="banner"
      >
        {/* Left: VS Code Application Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
            <div className="w-4 h-4 rounded bg-[#007acc] flex items-center justify-center text-[10px] text-white">
              DB
            </div>
            <span>Database Studio</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[#cccccc] text-[11px]">
            <span
              onClick={() => setIsInstallVsCodeOpen(true)}
              className="hover:text-white cursor-pointer text-sky-400 font-medium"
              title="View instructions to install in local VS Code"
            >
              Install in VS Code
            </span>
            <span className="hover:text-white cursor-pointer">Edit</span>
            <span
              onClick={() => setIsNewConnectionOpen(true)}
              className="hover:text-white cursor-pointer text-sky-400"
            >
              Database
            </span>
            <span
              onClick={() => openSqlEditorTab(activeConnectionId)}
              className="hover:text-white cursor-pointer"
            >
              SQL Editor
            </span>
            <span
              onClick={() => openERDiagramTab(activeConnectionId)}
              className="hover:text-white cursor-pointer"
            >
              ER Diagram
            </span>
            <span
              onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
              className="hover:text-white cursor-pointer"
            >
              Terminal
            </span>
          </div>
        </div>

        {/* Center: Command Search Bar */}
        <div
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex-1 max-w-md mx-4 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] rounded-md px-3 py-1 flex items-center justify-between cursor-pointer transition-all text-[#858585] hover:text-[#cccccc] shadow-inner"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] truncate">
              WebAssembly Database Studio (Press Ctrl+P to run commands)
            </span>
          </div>
          <span className="text-[10px] font-mono bg-[#2d2d2d] px-1.5 py-0.2 rounded border border-[#3c3c3c]">
            ⌘P
          </span>
        </div>

        {/* Right: Actions & Window Dots */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInstallVsCodeOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#007acc]/20 hover:bg-[#007acc]/40 border border-[#007acc]/60 rounded text-sky-300 hover:text-white transition-colors text-[11px] font-medium"
            title="Step-by-step instructions to install in local VS Code"
            aria-label="Install in local VS Code"
          >
            <Package className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Install in VS Code</span>
          </button>

          <button
            onClick={handleDownloadDatabase}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#252526] hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors text-[11px]"
            title="Download real SQLite database file (.db) generated in WASM"
            aria-label="Export SQLite file"
          >
            <Download className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">Export .sqlite</span>
          </button>

          <button
            onClick={() => setIsNewConnectionOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded transition-colors text-[11px] font-medium"
            aria-label="Add Database Connection"
          >
            <Plus className="w-3 h-3" />
            <span>Connect</span>
          </button>
        </div>
      </header>

      {/* Main Body Workspace (Activity Bar + Sidebar + Editor) */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Leftmost Activity Bar */}
        <ActivityBar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenSettings={() => setIsNewConnectionOpen(true)}
        />

        {/* Sidebar Panel (Database Navigator or Explorer or Extensions) */}
        <div className="w-64 sm:w-72 border-r border-[#2d2d2d] flex flex-col shrink-0 bg-[#252526]">
          {activeView === 'database' && (
            <DatabaseNavigator
              connections={connections}
              activeConnectionId={activeConnectionId}
              onSelectConnection={setActiveConnectionId}
              onOpenTable={(connId, tblName) => openTableTab(connId, tblName)}
              onOpenSqlEditor={(connId, q) => openSqlEditorTab(connId, q)}
              onOpenERDiagram={(connId) => openERDiagramTab(connId)}
              onOpenNewConnectionModal={() => setIsNewConnectionOpen(true)}
              onDeleteConnection={(connId) => {
                if (connections.length > 1) {
                  setConnections((prev) => prev.filter((c) => c.id !== connId));
                  if (activeConnectionId === connId) {
                    setActiveConnectionId(connections.find((c) => c.id !== connId)!.id);
                  }
                }
              }}
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
            />
          )}

          {activeView === 'explorer' && (
            <ExplorerPanel
              onOpenQuery={(title, sql) => {
                const newId = `tab_${Date.now()}`;
                setTabs((prev) => [
                  ...prev,
                  {
                    id: newId,
                    title,
                    type: 'query',
                    connectionId: activeConnectionId,
                    queryContent: sql,
                  },
                ]);
                setActiveTabId(newId);
              }}
            />
          )}

          {activeView === 'extensions' && <ExtensionsPanel />}

          {activeView === 'search' && (
            <div className="p-4 text-[#858585] text-xs">
              <p className="font-semibold text-white mb-2">Search Database Objects</p>
              <input
                type="text"
                placeholder="Search procedures, tables, views..."
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white outline-none"
              />
              <p className="mt-3 text-[11px]">
                Search across all registered catalogs and schemas in WebAssembly memory space.
              </p>
            </div>
          )}
        </div>

        {/* Main Editor Center Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] overflow-hidden" role="main">
          {/* Editor Tabs Header Bar */}
          <div className="h-9 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between overflow-x-auto select-none shrink-0 scrollbar-none">
            <div className="flex items-center h-full">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;

                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`h-full flex items-center gap-2 px-3.5 border-r border-[#2d2d2d] cursor-pointer text-xs font-sans transition-colors group ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc] font-medium'
                        : 'bg-[#2d2d2d] text-[#858585] hover:text-[#cccccc] hover:bg-[#282828]'
                    }`}
                  >
                    {tab.type === 'query' && (
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {tab.type === 'table' && (
                      <Table className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    {tab.type === 'erd' && (
                      <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}

                    <span className="truncate max-w-[140px]">{tab.title}</span>

                    {/* Close Tab X */}
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => closeTab(tab.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c] rounded p-0.5 text-[#858585] hover:text-white transition-opacity"
                        aria-label={`Close ${tab.title}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add New Query Tab Button */}
              <button
                onClick={() => openSqlEditorTab(activeConnectionId)}
                className="p-1.5 ml-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded"
                title="New SQL Script Tab"
                aria-label="New SQL Tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Workbench Mode Actions */}
            <div className="flex items-center gap-1 pr-2">
              <button
                onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
                className={`p-1.5 rounded transition-colors ${
                  isBottomPanelOpen ? 'text-[#007acc] bg-[#333333]' : 'text-[#858585] hover:text-white'
                }`}
                title="Toggle Execution Terminal / Output Log"
                aria-label="Toggle Terminal Panel"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Tab Viewport */}
          <div className="flex-1 min-h-0 relative">
            {activeTab.type === 'query' && (
              <SqlEditor
                initialQuery={activeTab.queryContent}
                onExecuteQuery={handleExecuteQuery}
                connectionName={activeConnection.name}
                databaseName={activeConnection.database}
              />
            )}

            {activeTab.type === 'table' && (
              <TableDetailsView
                table={currentTableDef}
                onFetchTableData={handleFetchTableData}
                onUpdateRow={handleUpdateRow}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
              />
            )}

            {activeTab.type === 'erd' && (
              <ERDiagramViewer
                tables={activeConnection.schemas[0]?.tables || INITIAL_ECOMMERCE_TABLES}
                connectionName={activeConnection.name}
                onSelectTable={(tblName) => openTableTab(activeConnectionId, tblName)}
              />
            )}
          </div>

          {/* Collapsible Bottom Output Panel (VS Code style Terminal) */}
          {isBottomPanelOpen && (
            <div className="h-44 bg-[#181818] border-t border-[#2d2d2d] flex flex-col font-mono text-xs select-none">
              <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#2d2d2d]">
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    OUTPUT: WASM Database Engine
                  </span>
                  <span className="text-[#858585]">
                    Status: <span className="text-emerald-400">ONLINE</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsBottomPanelOpen(false)}
                  className="text-[#858585] hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 p-2 overflow-y-auto space-y-1 text-[#a0a0a0] leading-relaxed">
                {executionLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-zinc-600 select-none">❯</span>
                    <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('WASM') ? 'text-emerald-300' : ''}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* VS Code Bottom Status Bar */}
      <StatusBar
        activeConnection={activeConnection}
        executionStats={executionStats}
        onOpenNewConnection={() => setIsNewConnectionOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* New Connection Modal */}
      <NewConnectionModal
        isOpen={isNewConnectionOpen}
        onClose={() => setIsNewConnectionOpen(false)}
        onAddConnection={(newConn) => {
          setConnections((prev) => [newConn, ...prev]);
          setActiveConnectionId(newConn.id);
          openSqlEditorTab(newConn.id, `SELECT * FROM ${newConn.schemas[0]?.tables[0]?.name || 'customers'} LIMIT 10;`);
        }}
      />

      {/* Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Edit Columns Modal */}
      {editingColumnsTable && (
        <EditColumnsModal
          isOpen={true}
          table={editingColumnsTable.table}
          onClose={() => setEditingColumnsTable(null)}
          onExecuteAlter={handleExecuteAlter}
        />
      )}

      {/* Create Table Modal */}
      <CreateTableModal
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onCreateTable={handleCreateTable}
      />

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmActionModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          sqlStatement={confirmModal.sqlStatement}
          confirmButtonLabel={confirmModal.confirmButtonLabel}
          isDestructive={confirmModal.isDestructive}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
        />
      )}

      {/* Install in VS Code Modal */}
      <InstallVsCodeModal
        isOpen={isInstallVsCodeOpen}
        onClose={() => setIsInstallVsCodeOpen(false)}
      />
    </div>
  );
}
