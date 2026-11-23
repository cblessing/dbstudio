import React from 'react';
import {
  Play,
  Square,
  Wand2,
  GitCommit,
  Clock,
  Database,
  AlertCircle,
  CheckCircle2,
  Table,
  Eye,
  Cpu,
  Columns,
} from 'lucide-react';
import { QueryResult, DatabaseConnection } from '../../types/database';
import {
  SqlCompletionItem,
  SqlCompletionResult,
  SqlCompletionKind,
} from '../../utils/sqlCompletion';
import { DataGrid } from '../grid/DataGrid';
import { ExplainPlanView } from '../views/ExplainPlanView';

const COMPLETION_KIND_ICONS: Record<SqlCompletionKind, React.ReactNode> = {
  table: <Table className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  view: <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  procedure: <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  column: <Columns className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
};

export function CompletionPopup({
  completionResult,
  coords,
  selectedIdx,
  listRef,
  onSelectIdx,
  onApply,
}: {
  completionResult: SqlCompletionResult;
  coords: { top: number; left: number };
  selectedIdx: number;
  listRef: React.RefObject<HTMLDivElement | null>;
  onSelectIdx: (idx: number) => void;
  onApply: (item: SqlCompletionItem) => void;
}) {
  return (
    <div
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      role="listbox"
      aria-label="SQL Code Completions"
      className="absolute z-50 w-80 bg-[#252526] border border-[#454545] rounded-md shadow-2xl overflow-hidden font-sans text-xs select-none"
    >
      <div
        ref={listRef}
        className="max-h-48 overflow-y-auto divide-y divide-[#2d2d2d]/60"
      >
        {completionResult.items.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <div
              key={`${item.kind}-${item.name}-${idx}`}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                e.preventDefault();
                onApply(item);
              }}
              onMouseEnter={() => onSelectIdx(idx)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[#04395e] text-white'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {COMPLETION_KIND_ICONS[item.kind]}
                <span className="font-mono truncate font-medium">{item.name}</span>
              </div>
              <span
                className={`text-[10px] truncate shrink-0 ${
                  isSelected ? 'text-sky-200' : 'text-[#858585]'
                }`}
              >
                {item.detail}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-2.5 py-1 bg-[#1e1e1e] border-t border-[#333333] text-[10px] text-[#858585] flex items-center justify-between">
        <span>↑↓ navigate • Tab/Enter insert • Esc close</span>
        <span className="font-mono">{completionResult.items.length} suggestions</span>
      </div>
    </div>
  );
}

export function SqlEditorToolbar({
  isExecuting,
  hasSelection,
  onRun,
  onStop,
  onExplain,
  onFormat,
  connections,
  connectionId,
  connectionName,
  databaseName,
  onSelectConnection,
}: {
  isExecuting: boolean;
  hasSelection: boolean;
  onRun: () => void;
  onStop: () => void;
  onExplain: () => void;
  onFormat: () => void;
  connections?: DatabaseConnection[];
  connectionId?: string;
  connectionName: string;
  databaseName: string;
  onSelectConnection?: (id: string) => void;
}) {
  const runLabel = isExecuting
    ? 'Running...'
    : hasSelection
    ? 'Execute Selection'
    : 'Execute';
  const runTitle = hasSelection
    ? 'Execute Selected SQL (Ctrl+Enter / F5)'
    : 'Execute SQL Query (Ctrl+Enter / F5)';
  const canSwitchConn = Boolean(connections?.length) && Boolean(onSelectConnection);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d2d2d] bg-[#252526] gap-2 select-none">
      <div className="flex items-center gap-1.5">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRun}
          disabled={isExecuting}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white rounded font-medium shadow-sm transition-colors"
          title={runTitle}
          aria-label="Execute SQL Query"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{runLabel}</span>
          <span className="text-[10px] opacity-75 ml-1 font-mono">⌘↵</span>
        </button>

        <button
          onClick={onStop}
          disabled={!isExecuting}
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-colors ${
            isExecuting
              ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-sm cursor-pointer'
              : 'bg-[#333333] text-[#6b6b6b] opacity-50 cursor-not-allowed'
          }`}
          title="Stop Running Query"
          aria-label="Stop Running Query"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onExplain}
          className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
          title="Explain Query Execution Plan"
          aria-label="Explain"
        >
          <GitCommit className="w-3.5 h-3.5 text-purple-400" />
          <span>Explain</span>
        </button>

        <button
          onClick={onFormat}
          className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
          title="Format SQL (Indent & Capitalize)"
          aria-label="Format SQL Query"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Format</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#858585]">
        <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        {canSwitchConn ? (
          <select
            value={connectionId ? connectionId : connections![0].id}
            onChange={(e) => onSelectConnection!(e.target.value)}
            className="bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-0.5 text-[#cccccc] text-[11px] outline-none cursor-pointer"
            aria-label="Select Database Connection"
          >
            {connections!.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.database})
              </option>
            ))}
          </select>
        ) : (
          <>
            <span className="text-[#cccccc] font-medium">{connectionName}</span>
            <span>/</span>
            <span className="text-zinc-400 font-mono">{databaseName}</span>
          </>
        )}
      </div>
    </div>
  );
}

function ResultsMessagesPanel({
  result,
  connectionName,
  databaseName,
}: {
  result: QueryResult | null;
  connectionName: string;
  databaseName: string;
}) {
  if (!result) {
    return (
      <div className="p-4 font-mono text-xs h-full overflow-auto bg-[#181818]">
        <p className="text-[#858585]">No messages. Execute a query to see output.</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4 font-mono text-xs h-full overflow-auto bg-[#181818]">
        <div className="text-rose-400 bg-rose-950/20 p-3 rounded border border-rose-900/50">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-4 h-4" /> Query Failed:
          </p>
          <p className="text-rose-200">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 font-mono text-xs h-full overflow-auto bg-[#181818]">
      <div className="text-emerald-400 bg-emerald-950/20 p-3 rounded border border-emerald-900/50 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Query Completed Successfully
        </p>
        <p className="text-[#cccccc]">
          Returned <span className="text-white font-bold">{result.rowCount}</span> rows in{' '}
          <span className="text-white font-bold">{result.executionTimeMs}ms</span>.
        </p>
        <p className="text-zinc-500 text-[11px]">
          Connection: {connectionName} ({databaseName})
        </p>
      </div>
    </div>
  );
}

export function ResultsBottomPanel({
  activeBottomTab,
  onSelectTab,
  result,
  onLoadMoreRows,
  onRefresh,
  connectionName,
  databaseName,
}: {
  activeBottomTab: 'grid' | 'explain' | 'messages';
  onSelectTab: (tab: 'grid' | 'explain' | 'messages') => void;
  result: QueryResult | null;
  onLoadMoreRows: () => Promise<void>;
  onRefresh: () => void;
  connectionName: string;
  databaseName: string;
}) {
  const hasSuccessResult = Boolean(result) && !result?.error;

  const renderGridTab = () => {
    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[#858585]">
          <p>Execute a query to view results.</p>
        </div>
      );
    }
    if (result.error) {
      return (
        <div className="p-4 bg-rose-950/30 text-rose-300 font-mono text-xs flex items-start gap-2 h-full overflow-auto">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200 mb-1">SQL Execution Error:</p>
            <pre className="whitespace-pre-wrap">{result.error}</pre>
          </div>
        </div>
      );
    }
    return (
      <DataGrid
        columns={result.columns}
        rows={result.rows}
        executionTimeMs={result.executionTimeMs}
        fetchTimeMs={result.fetchTimeMs}
        hasMore={result.hasMore}
        onLoadMore={onLoadMoreRows}
        onRefresh={onRefresh}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-2">
        <div className="flex items-center">
          <button
            onClick={() => onSelectTab('grid')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeBottomTab === 'grid'
                ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <span>Results</span>
            {hasSuccessResult && (
              <span className="bg-[#333333] text-[#cccccc] text-[10px] px-1.5 py-0.2 rounded-full">
                {result!.rowCount}
                {result!.hasMore ? '+' : ''}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('explain')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeBottomTab === 'explain'
                ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
            <span>Explain</span>
          </button>

          <button
            onClick={() => onSelectTab('messages')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeBottomTab === 'messages'
                ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            {result?.error ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Messages</span>
          </button>
        </div>

        {hasSuccessResult && (
          <div className="text-[11px] text-[#858585] flex items-center gap-2 pr-2">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>
              Execution: <span className="text-white font-mono">{result!.executionTimeMs}ms</span>
            </span>
            <span>•</span>
            <span>
              Fetch: <span className="text-white font-mono">{result!.fetchTimeMs}ms</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeBottomTab === 'grid' && renderGridTab()}
        {activeBottomTab === 'explain' && (
          <ExplainPlanView steps={result?.explainPlan ?? []} />
        )}
        {activeBottomTab === 'messages' && (
          <ResultsMessagesPanel
            result={result}
            connectionName={connectionName}
            databaseName={databaseName}
          />
        )}
      </div>
    </div>
  );
}
