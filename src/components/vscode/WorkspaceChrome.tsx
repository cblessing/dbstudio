import React from 'react';
import {
  DatabaseConnection,
  DatabaseType,
  EditorTab,
  TableDefinition,
} from '../../types/database';
import { NewConnectionModal } from '../dialogs/NewConnectionModal';
import { EditColumnsModal } from '../dialogs/EditColumnsModal';
import { CreateTableModal } from '../dialogs/CreateTableModal';
import { ConfirmActionModal } from '../dialogs/ConfirmActionModal';
import {
  CommandPaletteModal,
  CommandItem,
} from '../dialogs/CommandPaletteModal';
import {
  Table,
  FileCode,
  LayoutGrid,
  Plus,
  X,
  Terminal,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  description: string;
  sqlStatement?: string;
  confirmButtonLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

const TAB_TYPE_ICONS: Record<EditorTab['type'], React.ReactNode> = {
  query: <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  table: <Table className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
  erd: <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  ddl: <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
};

export function StandaloneTabBar({
  tabs,
  activeTabId,
  isSidebarVisible,
  isBottomPanelOpen,
  hasConnection = true,
  onToggleSidebar,
  onSelectTab,
  onCloseTab,
  onNewSqlTab,
  onOpenErdTab,
  onToggleBottomPanel,
}: {
  tabs: EditorTab[];
  activeTabId: string;
  isSidebarVisible: boolean;
  isBottomPanelOpen: boolean;
  hasConnection?: boolean;
  onToggleSidebar: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewSqlTab: () => void;
  onOpenErdTab: () => void;
  onToggleBottomPanel: () => void;
}) {
  return (
    <div className="h-9 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between overflow-x-auto select-none shrink-0 scrollbar-none">
      <div className="flex items-center h-full min-w-0">
        <button
          onClick={onToggleSidebar}
          className="px-2.5 h-full text-[#858585] hover:text-white hover:bg-[#2d2d2d] border-r border-[#2d2d2d] transition-colors shrink-0"
          title={isSidebarVisible ? 'Hide Database Navigator' : 'Show Database Navigator'}
          aria-label="Toggle Database Navigator"
        >
          {isSidebarVisible ? (
            <PanelLeftClose className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          )}
        </button>

        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`h-full flex items-center gap-2 px-3.5 border-r border-[#2d2d2d] cursor-pointer text-xs font-sans transition-colors group shrink-0 ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc] font-medium'
                  : 'bg-[#2d2d2d] text-[#858585] hover:text-[#cccccc] hover:bg-[#282828]'
              }`}
            >
              {TAB_TYPE_ICONS[tab.type]}
              <span className="truncate max-w-[160px]">{tab.title}</span>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => onCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c] rounded p-0.5 text-[#858585] hover:text-white transition-opacity"
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onNewSqlTab}
          disabled={!hasConnection}
          className="p-1.5 ml-1 text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed rounded shrink-0"
          title={hasConnection ? 'New SQL Script' : 'Connect to a database first'}
          aria-label="New SQL Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 pr-2 shrink-0">
        <button
          onClick={onOpenErdTab}
          disabled={!hasConnection}
          className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={hasConnection ? 'Open ER Diagram Tab' : 'Connect to a database first'}
          aria-label="Open ER Diagram"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleBottomPanel}
          className={`p-1.5 rounded transition-colors ${
            isBottomPanelOpen
              ? 'text-[#007acc] bg-[#333333]'
              : 'text-[#858585] hover:text-white hover:bg-[#333333]'
          }`}
          title="Toggle Query Output Log"
          aria-label="Toggle Terminal Panel"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function QueryOutputLogPanel({
  logs,
  onClose,
}: {
  logs: string[];
  onClose: () => void;
}) {
  return (
    <div className="h-40 bg-[#181818] border-t border-[#2d2d2d] flex flex-col font-mono text-xs select-none">
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-4 text-[11px]">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            OUTPUT: Query Execution Log
          </span>
          <span className="text-[#858585]">
            Status: <span className="text-emerald-400">ONLINE</span>
          </span>
        </div>
        <button onClick={onClose} className="text-[#858585] hover:text-white p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 p-2 overflow-y-auto space-y-1 text-[#a0a0a0] leading-relaxed">
        {logs.map((log, i) => {
          const colorClass = log.includes('ERROR')
            ? 'text-rose-400'
            : log.includes('Executed:')
            ? 'text-emerald-300'
            : '';
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-zinc-600 select-none">❯</span>
              <span className={colorClass}>{log}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function buildWorkspaceCommands({
  onNewConnection,
  onNewQuery,
  onOpenErd,
  onExportDatabase,
}: {
  onNewConnection: () => void;
  onNewQuery: () => void;
  onOpenErd: () => void;
  onExportDatabase: () => void;
}): CommandItem[] {
  return [
    {
      id: 'cmd_new_conn',
      title: 'Database: New Connection (All Drivers)',
      category: 'Connection',
      shortcut: 'Ctrl+Shift+N',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      action: onNewConnection,
    },
    {
      id: 'cmd_new_query',
      title: 'Database: Open New SQL Query Editor',
      category: 'SQL Editor',
      shortcut: 'Ctrl+N',
      icon: <FileCode className="w-4 h-4 text-amber-400" />,
      action: onNewQuery,
    },
    {
      id: 'cmd_open_erd',
      title: 'Database: View Interactive ER Diagram',
      category: 'Schema Tools',
      shortcut: 'Ctrl+Shift+E',
      icon: <LayoutGrid className="w-4 h-4 text-sky-400" />,
      action: onOpenErd,
    },
    {
      id: 'cmd_export_db',
      title: 'Database: Export Database Binary (.sqlite file)',
      category: 'Tools',
      icon: <Download className="w-4 h-4 text-purple-400" />,
      action: onExportDatabase,
    },
  ];
}

export function WorkspaceModals({
  isNewConnectionOpen,
  editingConnection,
  onCloseNewConnection,
  onAddConnection,
  isCommandPaletteOpen,
  onCloseCommandPalette,
  commands,
  editingColumnsTable,
  editingDialect,
  onCloseEditColumns,
  onExecuteAlter,
  isCreateTableOpen,
  createTableDialect,
  onCloseCreateTable,
  onCreateTable,
  confirmModal,
  onCloseConfirmModal,
}: {
  isNewConnectionOpen: boolean;
  editingConnection?: DatabaseConnection | null;
  onCloseNewConnection: () => void;
  onAddConnection: (newConn: DatabaseConnection) => void;
  isCommandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  commands: CommandItem[];
  editingColumnsTable: { connectionId: string; table: TableDefinition } | null;
  editingDialect: DatabaseType;
  onCloseEditColumns: () => void;
  onExecuteAlter: (
    ddlSql: string,
    updatedTable: TableDefinition,
    oldTableName?: string
  ) => Promise<void>;
  isCreateTableOpen: boolean;
  createTableDialect: DatabaseType;
  onCloseCreateTable: () => void;
  onCreateTable: (tableDef: TableDefinition, ddl: string) => Promise<void>;
  confirmModal: ConfirmModalConfig | null;
  onCloseConfirmModal: () => void;
}) {
  return (
    <>
      <NewConnectionModal
        isOpen={isNewConnectionOpen}
        editingConnection={editingConnection}
        onClose={onCloseNewConnection}
        onAddConnection={onAddConnection}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
        commands={commands}
      />

      {editingColumnsTable && (
        <EditColumnsModal
          isOpen={true}
          table={editingColumnsTable.table}
          dialect={editingDialect}
          onClose={onCloseEditColumns}
          onExecuteAlter={onExecuteAlter}
        />
      )}

      <CreateTableModal
        isOpen={isCreateTableOpen}
        dialect={createTableDialect}
        onClose={onCloseCreateTable}
        onCreateTable={onCreateTable}
      />

      {confirmModal && (
        <ConfirmActionModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          sqlStatement={confirmModal.sqlStatement}
          confirmButtonLabel={confirmModal.confirmButtonLabel}
          isDestructive={confirmModal.isDestructive}
          onClose={onCloseConfirmModal}
          onConfirm={confirmModal.onConfirm}
        />
      )}
    </>
  );
}
