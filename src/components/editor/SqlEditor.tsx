import React, { useState, useEffect, useRef } from 'react';
import { QueryResult, DatabaseConnection } from '../../types/database';
import { INITIAL_CONNECTIONS } from '../../engine/sqlEngineCore';
import { formatSql } from '../../utils/sqlFormatter';
import { mergePaginatedResults } from '../../utils/exportData';
import {
  getSqlCompletions,
  SqlCompletionItem,
  SqlCompletionResult,
} from '../../utils/sqlCompletion';
import {
  CompletionPopup,
  SqlEditorToolbar,
  ResultsBottomPanel,
} from './SqlEditorPanels';

interface SqlEditorProps {
  initialQuery?: string;
  onExecuteQuery: (
    query: string,
    options?: { offset?: number; batchSize?: number }
  ) => Promise<QueryResult>;
  connectionName: string;
  databaseName: string;
  connections?: DatabaseConnection[];
  connectionId?: string;
  onSelectConnection?: (connectionId: string) => void;
}

function resolveCurrentConnection(
  connections: DatabaseConnection[] | undefined,
  connectionId: string | undefined,
  connectionName: string
): DatabaseConnection {
  if (connections && connections.length > 0) {
    const byId = connections.find((c) => c.id === connectionId);
    if (byId) return byId;
    const byName = connections.find((c) => c.name === connectionName);
    return byName ? byName : connections[0];
  }
  const initialByName = INITIAL_CONNECTIONS.find((c) => c.name === connectionName);
  return initialByName ? initialByName : INITIAL_CONNECTIONS[0];
}

const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

export const SqlEditor: React.FC<SqlEditorProps> = ({
  initialQuery = '',
  onExecuteQuery,
  connectionName,
  databaseName,
  connections,
  connectionId,
  onSelectConnection,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedText, setSelectedText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'grid' | 'explain' | 'messages'>('grid');
  const [editorHeight, setEditorHeight] = useState<number>(210);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [completionResult, setCompletionResult] = useState<SqlCompletionResult | null>(null);
  const [selectedCompletionIdx, setSelectedCompletionIdx] = useState<number>(0);
  const [completionCoords, setCompletionCoords] = useState<{ top: number; left: number }>({
    top: 28,
    left: 12,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const completionListRef = useRef<HTMLDivElement>(null);
  const activeRunIdRef = useRef<number>(0);

  const currentConnection = resolveCurrentConnection(connections, connectionId, connectionName);

  const updateCompletionPopup = (
    textValue: string,
    cursorOffset: number,
    forceTrigger = false
  ) => {
    const res = getSqlCompletions(textValue, cursorOffset, currentConnection, forceTrigger);
    if (res.items.length === 0) {
      setCompletionResult(null);
      return;
    }

    const lines = textValue.slice(0, res.replaceStart).split('\n');
    const lineIndex = lines.length - 1;
    const colIndex = lines[lineIndex].length;
    const scrollTop = textareaRef.current ? textareaRef.current.scrollTop : 0;
    const scrollLeft = textareaRef.current ? textareaRef.current.scrollLeft : 0;

    setCompletionCoords({
      top: Math.max(24, (lineIndex + 1) * 20 + 8 - scrollTop),
      left: Math.max(8, Math.min(360, colIndex * 7.2 + 8 - scrollLeft)),
    });
    setCompletionResult(res);
    setSelectedCompletionIdx(0);
  };

  const applyCompletion = (item: SqlCompletionItem) => {
    if (!completionResult) return;
    const before = query.slice(0, completionResult.replaceStart);
    const after = query.slice(completionResult.replaceEnd);
    const nextCursorPos = completionResult.replaceStart + item.insertText.length;

    setQuery(`${before}${item.insertText}${after}`);
    setCompletionResult(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = nextCursorPos;
        textareaRef.current.selectionEnd = nextCursorPos;
      }
    }, 0);
  };

  const updateSelection = () => {
    const el = textareaRef.current;
    if (!el || el.selectionStart === el.selectionEnd) {
      setSelectedText('');
      return;
    }
    const sel = el.value.substring(el.selectionStart, el.selectionEnd);
    setSelectedText(sel.trim() ? sel : '');
  };

  const getQueryToExecute = (explicitQuery?: string): string => {
    if (explicitQuery !== undefined) return explicitQuery.trim();
    const el = textareaRef.current;
    const liveSel =
      el && el.selectionStart !== el.selectionEnd
        ? el.value.substring(el.selectionStart, el.selectionEnd).trim()
        : '';
    if (liveSel) return liveSel;
    const savedSel = selectedText.trim();
    return savedSel ? savedSel : query.trim();
  };

  const applyQueryOutcome = (res: QueryResult, runId: number) => {
    if (activeRunIdRef.current !== runId) return;
    setResult(res);
    setActiveBottomTab(res.error ? 'messages' : 'grid');
  };

  const runQuery = async (queryToRun?: string) => {
    const targetQuery = getQueryToExecute(queryToRun);
    if (!targetQuery) return;
    const runId = ++activeRunIdRef.current;
    setIsExecuting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 15));
      const res = await onExecuteQuery(targetQuery);
      applyQueryOutcome(res, runId);
    } catch (err: any) {
      applyQueryOutcome(
        {
          columns: [],
          rows: [],
          executionTimeMs: 0,
          fetchTimeMs: 0,
          rowCount: 0,
          query: targetQuery,
          error: err ? String(err.message || err) : 'Execution error',
        },
        runId
      );
    } finally {
      if (activeRunIdRef.current === runId) {
        setIsExecuting(false);
      }
    }
  };

  const handleLoadMoreRows = async () => {
    if (!result?.hasMore || result.nextOffset === undefined) return;
    const nextRes = await onExecuteQuery(result.query, { offset: result.nextOffset });
    if (nextRes.error) return;
    setResult((prev) => mergePaginatedResults(prev, nextRes));
  };

  const stopQuery = () => {
    if (!isExecuting) return;
    activeRunIdRef.current += 1;
    setIsExecuting(false);
    setResult({
      columns: [],
      rows: [],
      executionTimeMs: 0,
      fetchTimeMs: 0,
      rowCount: 0,
      query,
      error: 'Query execution stopped by user.',
    });
    setActiveBottomTab('messages');
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const maxAllowed = Math.max(120, rect.height - 100);
      setEditorHeight(Math.max(80, Math.min(maxAllowed, e.clientY - rect.top)));
    };

    const handleMouseUp = () => setIsDraggingSplitter(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery && /^\s*SELECT\b/i.test(initialQuery)) {
      runQuery(initialQuery);
    }
  }, [initialQuery]);

  const moveCompletionSelection = (step: number, total: number) => {
    setSelectedCompletionIdx((prev) => {
      const next = (prev + step + total) % total;
      const itemEl = completionListRef.current?.children[next] as HTMLElement | undefined;
      itemEl?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  };

  const handleCompletionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    const items = completionResult?.items;
    if (!items?.length) return false;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveCompletionSelection(e.key === 'ArrowDown' ? 1 : -1, items.length);
      return true;
    }
    if (e.key === 'Tab' || (e.key === 'Enter' && !e.ctrlKey)) {
      e.preventDefault();
      applyCompletion(items[selectedCompletionIdx]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setCompletionResult(null);
      return true;
    }
    return false;
  };

  const insertTabIndentation = (el: HTMLTextAreaElement) => {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setQuery(query.substring(0, start) + '  ' + query.substring(end));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      updateCompletionPopup(query, e.currentTarget.selectionStart, true);
      return;
    }

    if (handleCompletionKeyDown(e)) return;

    const isRunKey = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter');
    if (isRunKey) {
      e.preventDefault();
      setCompletionResult(null);
      runQuery();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      insertTabIndentation(e.currentTarget);
    }
  };

  const lineCount = Math.max(query.split('\n').length, 8);
  const showCompletion = Boolean(completionResult && completionResult.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans text-xs">
      <SqlEditorToolbar
        isExecuting={isExecuting}
        hasSelection={Boolean(selectedText)}
        onRun={() => runQuery()}
        onStop={stopQuery}
        onExplain={async () => {
          await runQuery();
          setActiveBottomTab('explain');
        }}
        onFormat={() => {
          setQuery(formatSql(query));
          setCompletionResult(null);
        }}
        connections={connections}
        connectionId={connectionId}
        connectionName={connectionName}
        databaseName={databaseName}
        onSelectConnection={onSelectConnection}
      />

      <div
        ref={splitContainerRef}
        className={`flex-1 flex flex-col min-h-0 ${
          isDraggingSplitter ? 'select-none cursor-row-resize' : ''
        }`}
      >
        <div
          style={{ height: `${editorHeight}px` }}
          className="shrink-0 flex bg-[#1e1e1e] relative z-30"
        >
          <div className="w-10 bg-[#1e1e1e] border-r border-[#2d2d2d] py-2 text-right pr-2 text-[#5a5a5a] font-mono text-xs select-none overflow-hidden">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                const nextVal = e.target.value;
                setQuery(nextVal);
                updateSelection();
                updateCompletionPopup(nextVal, e.target.selectionStart);
              }}
              onSelect={updateSelection}
              onKeyUp={(e) => {
                updateSelection();
                if (NAV_KEYS.has(e.key)) {
                  updateCompletionPopup(e.currentTarget.value, e.currentTarget.selectionStart);
                }
              }}
              onMouseUp={() => {
                updateSelection();
                setCompletionResult(null);
              }}
              onBlur={() => setTimeout(() => setCompletionResult(null), 150)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-xs p-2 leading-5 resize-none outline-none selection:bg-[#264f78]"
              placeholder="Write SQL query..."
              aria-label="SQL Editor"
            />

            {showCompletion && (
              <CompletionPopup
                completionResult={completionResult!}
                coords={completionCoords}
                selectedIdx={selectedCompletionIdx}
                listRef={completionListRef}
                onSelectIdx={setSelectedCompletionIdx}
                onApply={applyCompletion}
              />
            )}
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize SQL editor and results pane"
          title="Drag to resize query editor and results area (double-click to reset)"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSplitter(true);
          }}
          onDoubleClick={() => setEditorHeight(210)}
          className={`h-1.5 shrink-0 cursor-row-resize flex items-center justify-center transition-colors z-20 ${
            isDraggingSplitter ? 'bg-[#007acc]' : 'bg-[#2d2d2d] hover:bg-[#007acc]'
          }`}
        >
          <div className="w-8 h-0.5 rounded-full bg-[#6b6b6b] pointer-events-none" />
        </div>

        <ResultsBottomPanel
          activeBottomTab={activeBottomTab}
          onSelectTab={setActiveBottomTab}
          result={result}
          onLoadMoreRows={handleLoadMoreRows}
          onRefresh={() => runQuery()}
          connectionName={connectionName}
          databaseName={databaseName}
        />
      </div>
    </div>
  );
};
