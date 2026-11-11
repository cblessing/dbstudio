import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  FastForward,
  Wand2,
  GitCommit,
  Clock,
  Database,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { QueryResult, EditorTab } from '../../types/database';
import { formatSql } from '../../utils/sqlFormatter';
import { DataGrid } from '../grid/DataGrid';
import { ExplainPlanView } from '../views/ExplainPlanView';

interface SqlEditorProps {
  initialQuery?: string;
  onExecuteQuery: (query: string) => Promise<QueryResult>;
  connectionName: string;
  databaseName: string;
}

const SAMPLE_QUERIES = [
  {
    name: 'Top Selling Products & Revenue',
    sql: `SELECT 
  p.title AS product_name,
  c.name AS category,
  p.price,
  SUM(oi.quantity) AS total_units_sold,
  ROUND(SUM(oi.subtotal), 2) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY p.id, p.title, c.name, p.price
ORDER BY total_revenue DESC;`,
  },
  {
    name: 'Customer Orders & Lifetime Value',
    sql: `SELECT 
  c.id,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.email,
  c.loyalty_tier,
  COUNT(o.id) AS total_orders,
  ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS lifetime_spend
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, customer_name, c.email, c.loyalty_tier
ORDER BY lifetime_spend DESC;`,
  },
  {
    name: 'Order Details (3-Way JOIN)',
    sql: `SELECT 
  o.id AS order_id,
  o.order_date,
  c.first_name || ' ' || c.last_name AS customer,
  p.title AS product,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  o.status
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
ORDER BY o.order_date DESC;`,
  },
  {
    name: 'Stock Inventory Alert (< 50 units)',
    sql: `SELECT 
  sku,
  title,
  stock_quantity,
  price,
  rating
FROM products
WHERE stock_quantity < 50
ORDER BY stock_quantity ASC;`,
  },
  {
    name: 'Product Reviews & Ratings',
    sql: `SELECT 
  p.title AS product,
  c.first_name || ' ' || c.last_name AS reviewer,
  r.rating,
  r.comment,
  r.review_date
FROM reviews r
JOIN products p ON r.product_id = p.id
JOIN customers c ON r.customer_id = c.id
ORDER BY r.rating DESC;`,
  },
  {
    name: 'Oracle: HR Department Salary Averages',
    sql: `SELECT 
  d.department_name,
  COUNT(e.employee_id) AS total_headcount,
  ROUND(AVG(e.salary), 2) AS average_salary,
  MAX(e.salary) AS highest_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
GROUP BY d.department_name
ORDER BY average_salary DESC;`,
  },
  {
    name: 'Oracle: DUAL & SYSDATE System Clock',
    sql: `SELECT 
  SYSDATE AS system_timestamp,
  'Oracle Database 23c Free' AS platform,
  'hr_admin' AS current_user
FROM dual;`,
  },
  {
    name: 'Oracle: Top Earners (ROWNUM)',
    sql: `SELECT 
  first_name,
  last_name,
  email,
  salary,
  job_id
FROM employees
WHERE ROWNUM <= 5
ORDER BY salary DESC;`,
  },
  {
    name: 'T-SQL: Top 5 Orders (TOP N)',
    sql: `SELECT TOP 5
  [o].[id] AS order_id,
  [o].[order_date],
  [o].[status],
  [o].[total_amount]
FROM [dbo].[orders] [o]
ORDER BY [o].[total_amount] DESC;`,
  },
  {
    name: 'T-SQL: Server @@VERSION & System Info',
    sql: `SELECT 
  @@VERSION AS [ServerVersion],
  @@SERVERNAME AS [ServerName];`,
  },
  {
    name: 'T-SQL: Inventory Log Audits [dbo]',
    sql: `SELECT 
  [log_id],
  [product_id],
  [change_qty],
  [reason],
  [logged_by],
  [log_time]
FROM [dbo].[inventory_logs]
ORDER BY [log_id] ASC;`,
  },
];

export const SqlEditor: React.FC<SqlEditorProps> = ({
  initialQuery = SAMPLE_QUERIES[0].sql,
  onExecuteQuery,
  connectionName,
  databaseName,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'grid' | 'explain' | 'messages'>('grid');
  const [sampleDropdownOpen, setSampleDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = async (queryToRun?: string) => {
    const targetQuery = (queryToRun ?? query).trim();
    if (!targetQuery) return;
    setIsExecuting(true);
    try {
      const res = await onExecuteQuery(targetQuery);
      setResult(res);
      if (res.error) {
        setActiveBottomTab('messages');
      } else {
        setActiveBottomTab('grid');
      }
    } catch (err: any) {
      setResult({
        columns: [],
        rows: [],
        executionTimeMs: 0,
        fetchTimeMs: 0,
        rowCount: 0,
        query: targetQuery,
        error: err?.message || String(err),
      });
      setActiveBottomTab('messages');
    } finally {
      setIsExecuting(false);
    }
  };

  // Sync and auto-run when initialQuery changes or mounts
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleFormat = () => {
    const formatted = formatSql(query);
    setQuery(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
    // Tab key indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = query;
      setQuery(val.substring(0, start) + '  ' + val.substring(end));
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lineCount = query.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans text-xs">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d2d2d] bg-[#252526] gap-2 select-none">
        <div className="flex items-center gap-1.5">
          {/* Run Button */}
          <button
            onClick={() => runQuery()}
            disabled={isExecuting}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white rounded font-medium shadow-sm transition-colors"
            title="Execute SQL Query (Ctrl+Enter / Cmd+Enter)"
            aria-label="Execute SQL Query"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Execute'}</span>
            <span className="text-[10px] opacity-75 ml-1 font-mono">⌘↵</span>
          </button>

          {/* Explain Execution Plan */}
          <button
            onClick={async () => {
              await runQuery();
              setActiveBottomTab('explain');
            }}
            className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
            title="Explain Execution Plan (WASM Query Optimizer)"
            aria-label="Explain Execution Plan"
          >
            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
            <span>Explain Plan</span>
          </button>

          {/* Format SQL */}
          <button
            onClick={handleFormat}
            className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded transition-colors"
            title="Format SQL (Indent & Capitalize)"
            aria-label="Format SQL Query"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Format</span>
          </button>

          {/* Sample Queries Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSampleDropdownOpen(!sampleDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-sky-400 rounded transition-colors"
              title="Load pre-built SQL query examples"
              aria-label="Sample Queries"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sample Queries</span>
            </button>

            {sampleDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl py-1 z-50 text-xs">
                {SAMPLE_QUERIES.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => {
                      setQuery(sample.sql);
                      setSampleDropdownOpen(false);
                      runQuery(sample.sql);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white text-[#cccccc] flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-white">{sample.name}</span>
                    <span className="text-[10px] text-[#858585] truncate font-mono">
                      {sample.sql.slice(0, 40)}...
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Connection info badge */}
        <div className="flex items-center gap-2 text-[11px] text-[#858585]">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[#cccccc] font-medium">{connectionName}</span>
          <span>/</span>
          <span className="text-zinc-400 font-mono">{databaseName}</span>
        </div>
      </div>

      {/* Editor & Results Split Layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top: SQL Code Text Area with Line Numbers */}
        <div className="h-48 border-b border-[#2d2d2d] flex bg-[#1e1e1e] relative">
          {/* Gutter / Line Numbers */}
          <div className="w-10 bg-[#1e1e1e] border-r border-[#2d2d2d] py-2 text-right pr-2 text-[#5a5a5a] font-mono text-xs select-none">
            {Array.from({ length: Math.max(lineCount, 8) }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-xs p-2 leading-5 resize-none outline-none selection:bg-[#264f78]"
              placeholder="Enter SQL query here... (e.g. SELECT * FROM products JOIN categories ON ...)"
              aria-label="SQL Editor"
            />
          </div>
        </div>

        {/* Bottom Panel Tabs (Data Grid, Explain Plan, Messages) */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-2">
            <div className="flex items-center">
              <button
                onClick={() => setActiveBottomTab('grid')}
                className={`px-3 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeBottomTab === 'grid'
                    ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                    : 'border-transparent text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <span>Result Set</span>
                {result && !result.error && (
                  <span className="bg-[#333333] text-[#cccccc] text-[10px] px-1.5 py-0.2 rounded-full">
                    {result.rowCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveBottomTab('explain')}
                className={`px-3 py-1.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeBottomTab === 'explain'
                    ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                    : 'border-transparent text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                <span>Explain Execution Plan</span>
              </button>

              <button
                onClick={() => setActiveBottomTab('messages')}
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
                <span>Execution Messages</span>
              </button>
            </div>

            {/* Performance Metric Badge */}
            {result && !result.error && (
              <div className="text-[11px] text-[#858585] flex items-center gap-2 pr-2">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>
                  Execution: <span className="text-white font-mono">{result.executionTimeMs}ms</span>
                </span>
                <span>•</span>
                <span>
                  Fetch: <span className="text-white font-mono">{result.fetchTimeMs}ms</span>
                </span>
              </div>
            )}
          </div>

          {/* Tab Content Viewport */}
          <div className="flex-1 min-h-0 relative">
            {activeBottomTab === 'grid' && (
              result?.error ? (
                <div className="p-4 bg-rose-950/30 text-rose-300 font-mono text-xs flex items-start gap-2 h-full overflow-auto">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-200 mb-1">SQL Execution Error:</p>
                    <pre className="whitespace-pre-wrap">{result.error}</pre>
                  </div>
                </div>
              ) : result ? (
                <DataGrid
                  columns={result.columns}
                  rows={result.rows}
                  executionTimeMs={result.executionTimeMs}
                  fetchTimeMs={result.fetchTimeMs}
                  onRefresh={() => runQuery()}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#858585]">
                  <p>Execute query to view results.</p>
                </div>
              )
            )}

            {activeBottomTab === 'explain' && (
              <ExplainPlanView steps={result?.explainPlan ?? []} query={query} />
            )}

            {activeBottomTab === 'messages' && (
              <div className="p-4 font-mono text-xs space-y-2 h-full overflow-auto bg-[#181818]">
                {result?.error ? (
                  <div className="text-rose-400 bg-rose-950/20 p-3 rounded border border-rose-900/50">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-4 h-4" /> Query Failed:
                    </p>
                    <p className="text-rose-200">{result.error}</p>
                  </div>
                ) : result ? (
                  <div className="text-emerald-400 bg-emerald-950/20 p-3 rounded border border-emerald-900/50 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Query Completed Successfully
                    </p>
                    <p className="text-[#cccccc]">
                      Fetched <span className="text-white font-bold">{result.rowCount}</span> rows in{' '}
                      <span className="text-white font-bold">{result.executionTimeMs}ms</span> (WASM
                      Engine).
                    </p>
                    <p className="text-zinc-500 text-[11px]">Database: {connectionName} ({databaseName})</p>
                  </div>
                ) : (
                  <p className="text-[#858585]">No messages. Run a query to see execution log.</p>
                )}

                <div className="p-3 bg-[#252526] rounded border border-[#333333] text-[#cccccc] space-y-1 text-[11px]">
                  <p className="font-semibold text-white">Engine Details:</p>
                  <p>• WebAssembly Runtime: SQLite 3.45 + WASM Vectorized Engine</p>
                  <p>• Memory Architecture: 32-bit linear address buffer with zero host-copy</p>
                  <p>• Supported Dialects: SQLite, PostgreSQL, MySQL, DuckDB, Oracle, SQL Server, ClickHouse</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
