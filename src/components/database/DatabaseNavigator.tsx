import React, { useState } from 'react';
import {
  DatabaseConnection,
  TableDefinition,
  ColumnDefinition,
} from '../../types/database';
import { ContextMenu, ContextMenuItem } from '../dialogs/ContextMenu';
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  Key,
  Link,
  Plus,
  RefreshCw,
  Search,
  FileCode,
  LayoutGrid,
  Code2,
  Trash2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface DatabaseNavigatorProps {
  connections: DatabaseConnection[];
  activeConnectionId: string;
  onSelectConnection: (id: string) => void;
  onOpenTable: (connectionId: string, tableName: string) => void;
  onOpenSqlEditor: (connectionId: string, initialQuery?: string) => void;
  onOpenERDiagram: (connectionId: string) => void;
  onOpenNewConnectionModal: () => void;
  onDeleteConnection: (id: string) => void;
  onEditColumns: (connectionId: string, table: TableDefinition) => void;
  onCreateTableClick: (connectionId: string) => void;
  onDropTableClick: (connectionId: string, tableName: string) => void;
  onTruncateTableClick: (connectionId: string, tableName: string) => void;
  onDropColumnClick: (connectionId: string, tableName: string, colName: string) => void;
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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({
    [activeConnectionId]: true,
    conn_sqlite_wasm: true,
  });
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({
    main: true,
    public: true,
  });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    customers: false,
    orders: false,
    products: false,
  });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const toggleConnection = (id: string) => {
    setExpandedConnections((prev) => ({ ...prev, [id]: !prev[id] }));
    onSelectConnection(id);
  };

  const toggleSchema = (key: string) => {
    setExpandedSchemas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const activeConn = connections.find((c) => c.id === activeConnectionId) || connections[0];

  // Right-Click Context Menu for Tables
  const handleTableContextMenu = (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'open_data',
        label: `View Data (${tbl.name})`,
        icon: <Table className="w-3.5 h-3.5 text-blue-400" />,
        action: () => onOpenTable(connId, tbl.name),
      },
      {
        id: 'edit_columns',
        label: 'Edit Columns / Structure...',
        icon: <Code2 className="w-3.5 h-3.5 text-sky-400" />,
        action: () => onEditColumns(connId, tbl),
      },
      {
        id: 'view_erd',
        label: 'View ER Diagram',
        icon: <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />,
        action: () => onOpenERDiagram(connId),
      },
      { id: 'div_1', isDivider: true, label: '' },
      {
        id: 'gen_select',
        label: 'Generate SQL: SELECT *',
        icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />,
        action: () => onOpenSqlEditor(connId, `SELECT * FROM ${tbl.name} LIMIT 100;`),
      },
      {
        id: 'gen_insert',
        label: 'Generate SQL: INSERT Template',
        icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
        action: () => {
          const nonPkCols = tbl.columns.filter((c) => !c.primaryKey).map((c) => c.name);
          onOpenSqlEditor(
            connId,
            `INSERT INTO ${tbl.name} (${nonPkCols.join(', ')})\nVALUES (${nonPkCols.map(() => '?').join(', ')});`
          );
        },
      },
      {
        id: 'show_ddl',
        label: 'Show DDL Script',
        icon: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
        action: () => onOpenSqlEditor(connId, tbl.ddl || `-- DDL for ${tbl.name}`),
      },
      { id: 'div_2', isDivider: true, label: '' },
      {
        id: 'truncate_table',
        label: 'Truncate Table (Clear Rows)',
        icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
        action: () => onTruncateTableClick(connId, tbl.name),
      },
      {
        id: 'drop_table',
        label: 'Drop Table (DROP TABLE)',
        icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
        isDestructive: true,
        action: () => onDropTableClick(connId, tbl.name),
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Right-Click Context Menu for Columns
  const handleColumnContextMenu = (
    e: React.MouseEvent,
    connId: string,
    tbl: TableDefinition,
    col: ColumnDefinition
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'edit_col_struct',
        label: `Edit Columns of ${tbl.name}...`,
        icon: <Code2 className="w-3.5 h-3.5 text-sky-400" />,
        action: () => onEditColumns(connId, tbl),
      },
      {
        id: 'copy_col_name',
        label: `Copy Column Name ("${col.name}")`,
        icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
        action: () => navigator.clipboard.writeText(col.name),
      },
      {
        id: 'filter_col',
        label: `Group by ${col.name}`,
        icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
        action: () =>
          onOpenSqlEditor(
            connId,
            `SELECT ${col.name}, COUNT(*) AS count\nFROM ${tbl.name}\nGROUP BY ${col.name}\nORDER BY count DESC;`
          ),
      },
      ...(!col.primaryKey
        ? [
            { id: 'div_col', isDivider: true, label: '' },
            {
              id: 'drop_col',
              label: `Drop Column "${col.name}"`,
              icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
              isDestructive: true,
              action: () => onDropColumnClick(connId, tbl.name, col.name),
            },
          ]
        : []),
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Right-Click Context Menu for Schemas
  const handleSchemaContextMenu = (
    e: React.MouseEvent,
    connId: string,
    schemaName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'create_table',
        label: `Create New Table in ${schemaName}...`,
        icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
        action: () => onCreateTableClick(connId),
      },
      {
        id: 'open_sql',
        label: 'Open New SQL Console',
        icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />,
        action: () => onOpenSqlEditor(connId),
      },
      {
        id: 'view_erd',
        label: 'View Schema ER Diagram',
        icon: <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />,
        action: () => onOpenERDiagram(connId),
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <div
      className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs border-r border-[#1e1e1e]"
      role="region"
      aria-label="Database Navigator"
    >
      {/* Navigator Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] bg-[#2d2d2d]">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-[#969696] flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#007acc]" />
          Database Navigator
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateTableClick(activeConn?.id || 'conn_sqlite_wasm')}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="Create New Table (Table Designer)"
            aria-label="Create New Table"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => onOpenSqlEditor(activeConn?.id || 'conn_sqlite_wasm')}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="Open New SQL Console"
            aria-label="Open New SQL Console"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => onOpenERDiagram(activeConn?.id || 'conn_sqlite_wasm')}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors"
            title="View Interactive ER Diagram"
            aria-label="View Interactive ER Diagram"
          >
            <LayoutGrid className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2 border-b border-[#2d2d2d]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#858585]" />
          <input
            type="text"
            placeholder="Filter tables, columns... (Right-click to manage)"
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

      {/* Database Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {connections.map((conn) => {
          const isConnExpanded = expandedConnections[conn.id];
          const isActive = conn.id === activeConnectionId;

          return (
            <div key={conn.id} className="mb-0.5">
              {/* Connection Node */}
              <div
                className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer rounded-sm hover:bg-[#2a2d2e] ${
                  isActive ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc]'
                }`}
                onClick={() => toggleConnection(conn.id)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[#858585] group-hover:text-white">
                    {isConnExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>

                  {/* Engine Icon Badge */}
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

                  {/* Status Indicator */}
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

                {/* Connection Action Menu */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTableClick(conn.id);
                    }}
                    title="Create Table"
                    aria-label={`Create Table in ${conn.name}`}
                    className="p-0.5 hover:bg-[#454545] rounded text-emerald-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSqlEditor(conn.id);
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
                      onOpenERDiagram(conn.id);
                    }}
                    title="ER Diagram"
                    aria-label={`Open ER Diagram for ${conn.name}`}
                    className="p-0.5 hover:bg-[#454545] rounded text-sky-300"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  {connections.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConnection(conn.id);
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

              {/* Schemas & Tables */}
              {isConnExpanded && (
                <div className="pl-4">
                  {conn.schemas.map((schema) => {
                    const schemaKey = `${conn.id}_${schema.name}`;
                    const isSchemaExpanded = expandedSchemas[schemaKey] ?? true;

                    // Filter tables if search is active
                    const filteredTables = schema.tables.filter((t) =>
                      searchTerm
                        ? t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.columns.some((c) =>
                            c.name.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                        : true
                    );

                    return (
                      <div key={schema.name} className="mt-0.5">
                        {/* Schema Node (with Right Click) */}
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#b0b0b0]"
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
                          <Database className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-medium text-[#cccccc]">{schema.name}</span>
                          <span className="text-[10px] text-[#6b6b6b]">
                            ({filteredTables.length} tables)
                          </span>
                        </div>

                        {/* Tables List */}
                        {isSchemaExpanded && (
                          <div className="pl-4">
                            {filteredTables.map((tbl) => {
                              const isTblExpanded = expandedTables[tbl.name];

                              return (
                                <div key={tbl.name} className="mt-0.5">
                                  {/* Table Row (with Right Click) */}
                                  <div
                                    className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
                                    onClick={() => onOpenTable(conn.id, tbl.name)}
                                    onContextMenu={(e) =>
                                      handleTableContextMenu(e, conn.id, tbl)
                                    }
                                    title={`Right-click to manage "${tbl.name}" (Drop, Alter, Truncate, DDL)`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTable(tbl.name);
                                        }}
                                        className="text-[#858585] hover:text-white p-0.5"
                                        aria-label={`Toggle columns for ${tbl.name}`}
                                      >
                                        {isTblExpanded ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3" />
                                        )}
                                      </button>
                                      <Table className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                      <span className="truncate">{tbl.name}</span>
                                      <span className="text-[10px] text-[#6b6b6b]">
                                        {tbl.rowCount} rows
                                      </span>
                                    </div>

                                    {/* Action buttons on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditColumns(conn.id, tbl);
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
                                          onDropTableClick(conn.id, tbl.name);
                                        }}
                                        title="Drop Table"
                                        aria-label={`Drop table ${tbl.name}`}
                                        className="text-[10px] text-rose-400 hover:underline px-1"
                                      >
                                        Drop
                                      </button>
                                    </div>
                                  </div>

                                  {/* Table Columns Expansion (with Right Click) */}
                                  {isTblExpanded && (
                                    <div className="pl-6 py-0.5 space-y-0.5 border-l border-[#333333] ml-2">
                                      {tbl.columns.map((col) => (
                                        <div
                                          key={col.name}
                                          onContextMenu={(e) =>
                                            handleColumnContextMenu(e, conn.id, tbl, col)
                                          }
                                          className="flex items-center justify-between py-0.5 text-[11px] text-[#999999] hover:text-[#cccccc] hover:bg-[#282828] px-1 rounded cursor-context-menu"
                                          title={`Right-click to manage column "${col.name}"`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            {col.primaryKey ? (
                                              <span title="Primary Key">
                                                <Key className="w-3 h-3 text-amber-400 shrink-0" />
                                              </span>
                                            ) : col.foreignKey ? (
                                              <span
                                                title={`Foreign Key -> ${col.foreignKey.targetTable}.${col.foreignKey.targetColumn}`}
                                              >
                                                <Link className="w-3 h-3 text-sky-400 shrink-0" />
                                              </span>
                                            ) : (
                                              <span className="w-3 h-3 inline-block" />
                                            )}
                                            <span
                                              className={
                                                col.primaryKey
                                                  ? 'font-medium text-amber-200'
                                                  : ''
                                              }
                                            >
                                              {col.name}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-[#666666] font-mono">
                                            {col.type}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
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
              )}
            </div>
          );
        })}
      </div>

      {/* Navigator Footer Help Note */}
      <div className="p-2 border-t border-[#333333] bg-[#1e1e1e] flex items-center justify-between text-[11px] text-[#858585]">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>Right-click objects to manage</span>
        </div>
        <button
          onClick={() => onCreateTableClick(activeConn?.id || 'conn_sqlite_wasm')}
          className="text-emerald-400 hover:underline font-medium"
        >
          + New Table
        </button>
      </div>

      {/* Floating Context Menu */}
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
