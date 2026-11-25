import React from 'react';
import { DatabaseConnection } from '../../types/database';
import { getConsoleActionLabel, supportsErDiagram } from '../../utils/connectionProfiles';
import {
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  Database,
  LayoutGrid,
  Code2,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Plus,
} from 'lucide-react';

export function NavigatorHeader({
  hasConnection,
  isRefreshing,
  onNewConnection,
  onRefreshAll,
  onCollapseAll,
  onImportClick,
  onExportConnections,
}: {
  hasConnection: boolean;
  isRefreshing: boolean;
  onNewConnection: () => void;
  onRefreshAll?: () => void;
  onCollapseAll: () => void;
  onImportClick: () => void;
  onExportConnections?: () => void;
}) {
  const iconBtn =
    'p-1 hover:bg-[#3c3c3c] disabled:opacity-40 disabled:cursor-not-allowed rounded text-[#cccccc] hover:text-white transition-colors';

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#333333] bg-[#2d2d2d]">
      <span className="font-semibold uppercase tracking-wider text-[11px] text-[#969696] flex items-center gap-1.5 truncate">
        <Database className="w-3.5 h-3.5 text-[#007acc] shrink-0" />
        <span className="truncate">Connections</span>
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onNewConnection} className={iconBtn} title="New Connection" aria-label="New Database Connection">
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
        </button>
        {onRefreshAll && (
          <button
            onClick={onRefreshAll}
            disabled={!hasConnection || isRefreshing}
            className={iconBtn}
            title="Refresh All Connections"
            aria-label="Refresh All Connections"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button onClick={onCollapseAll} disabled={!hasConnection} className={iconBtn} title="Collapse All" aria-label="Collapse All">
          <ChevronsDownUp className="w-3.5 h-3.5 text-[#cccccc]" />
        </button>
        <button onClick={onImportClick} className={iconBtn} title="Import Connections (JSON)" aria-label="Import Connections">
          <Upload className="w-3.5 h-3.5 text-amber-400" />
        </button>
        {onExportConnections && (
          <button
            onClick={onExportConnections}
            disabled={!hasConnection}
            className={iconBtn}
            title="Export Connections (JSON)"
            aria-label="Export Connections"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ConnectionTreeHeader({
  conn,
  isExpanded,
  isActive,
  isRefreshing = false,
  onToggleConnection,
  onContextMenu,
  onOpenSqlEditor,
  onRefreshConnection,
  onDeleteConnection,
}: {
  conn: DatabaseConnection;
  isExpanded: boolean;
  isActive: boolean;
  isRefreshing?: boolean;
  onToggleConnection: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenSqlEditor: () => void;
  onRefreshConnection?: () => void;
  onDeleteConnection: () => void;
}) {
  const consoleLabel = getConsoleActionLabel(conn.type);

  return (
    <div
      className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer rounded-sm hover:bg-[#2a2d2e] ${
        isActive ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc]'
      }`}
      onClick={onToggleConnection}
      onContextMenu={onContextMenu}
      title="Right-click for connection actions"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[#858585] group-hover:text-white">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            conn.status === 'connected' ? 'bg-emerald-400' : 'bg-zinc-500'
          }`}
          title={conn.status === 'connected' ? `Connected (${conn.pingMs ?? 1}ms)` : 'Disconnected'}
        />
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSqlEditor();
          }}
          title={consoleLabel}
          aria-label={`Open ${consoleLabel} for ${conn.name}`}
          className="p-0.5 hover:bg-[#454545] rounded text-amber-300"
        >
          <Code2 className="w-3 h-3" />
        </button>
        {onRefreshConnection && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshConnection();
            }}
            disabled={isRefreshing}
            title="Refresh Schema"
            aria-label={`Refresh Schema for ${conn.name}`}
            className="p-0.5 hover:bg-[#454545] disabled:opacity-50 rounded text-sky-400"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
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
      </div>
    </div>
  );
}

export function SchemaTreeRow({
  conn,
  schemaName,
  isExpanded,
  onToggle,
  onContextMenu,
  onOpenSqlEditor,
  onOpenERDiagram,
}: {
  conn: DatabaseConnection;
  schemaName: string;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenSqlEditor: () => void;
  onOpenERDiagram: () => void;
}) {
  const showErd = supportsErDiagram(conn.type);
  const consoleLabel = getConsoleActionLabel(conn.type);

  return (
    <div
      className="group flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#b0b0b0] rounded-sm"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      title={showErd ? 'Right-click for schema actions (Create Table, SQL, ERD)' : 'Right-click for schema actions'}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[#858585]">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="font-medium text-[#cccccc] truncate">{schemaName}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSqlEditor();
          }}
          title={consoleLabel}
          aria-label={`Open ${consoleLabel} for ${schemaName}`}
          className="p-0.5 hover:bg-[#454545] rounded text-amber-300"
        >
          <Code2 className="w-3 h-3" />
        </button>
        {showErd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenERDiagram();
            }}
            title="View Schema ER Diagram"
            aria-label={`Open ER Diagram for ${schemaName}`}
            className="p-0.5 hover:bg-[#454545] rounded text-sky-300"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
