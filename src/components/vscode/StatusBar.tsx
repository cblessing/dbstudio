import React from 'react';
import { Database, CheckCircle2, Clock } from 'lucide-react';
import { DatabaseConnection } from '../../types/database';

interface StatusBarProps {
  activeConnection: DatabaseConnection | null;
  executionStats: {
    lastTimeMs?: number;
    rowCount?: number;
    isExecuting?: boolean;
  };
  onOpenNewConnection: () => void;
  onOpenCommandPalette: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeConnection,
  executionStats,
  onOpenNewConnection,
  onOpenCommandPalette,
}) => {
  return (
    <footer
      className="h-6 bg-[#007acc] text-white text-xs flex items-center justify-between px-3 select-none z-20 shrink-0 font-sans"
      role="contentinfo"
      aria-label="Status Bar"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Active Connection & Status */}
        {activeConnection ? (
          <button
            onClick={onOpenNewConnection}
            className="flex items-center gap-1.5 hover:bg-[#005a9e] px-1.5 py-0.5 rounded transition-colors"
            title="Click to switch or manage database connections"
            aria-label={`Current connection: ${activeConnection.name}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <Database className="w-3.5 h-3.5" />
            <span className="font-medium truncate max-w-[200px]">
              {activeConnection.name}
            </span>
            <span className="opacity-75 text-[10px]">
              ({activeConnection.type.toUpperCase()})
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenNewConnection}
            className="flex items-center gap-1.5 hover:bg-[#005a9e] px-1.5 py-0.5 rounded transition-colors"
            aria-label="No database connected. Click to connect"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Connect to Database</span>
          </button>
        )}

        {/* Execution Timer if available */}
        {executionStats.isExecuting ? (
          <div className="flex items-center gap-1 text-[11px] text-amber-200 animate-pulse">
            <Clock className="w-3 h-3 animate-spin" />
            <span>Executing query...</span>
          </div>
        ) : executionStats.lastTimeMs !== undefined ? (
          <div className="flex items-center gap-1 text-[11px] text-sky-100">
            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
            <span>
              {executionStats.rowCount !== undefined ? `${executionStats.rowCount} rows` : ''}{' '}
              in {executionStats.lastTimeMs}ms
            </span>
          </div>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-[11px]">
        <button
          onClick={onOpenCommandPalette}
          className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded transition-colors opacity-90 hover:opacity-100"
          title="Press Ctrl+P or F1 for quick command palette"
        >
          UTF-8
        </button>
        <span className="opacity-75">SQL</span>
      </div>
    </footer>
  );
};
