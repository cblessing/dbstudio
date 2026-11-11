import React from 'react';
import {
  Folder,
  FileCode,
  Search,
  Boxes,
  CheckCircle,
  Download,
  Star,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ExplorerPanelProps {
  onOpenQuery: (title: string, sql: string) => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({ onOpenQuery }) => {
  const workspaces = [
    {
      name: 'SQL Workspaces',
      files: [
        {
          name: 'revenue_analysis.sql',
          sql: 'SELECT c.name, SUM(oi.subtotal) FROM categories c JOIN products p ON c.id = p.category_id JOIN order_items oi ON p.id = oi.product_id GROUP BY c.name;',
        },
        {
          name: 'customer_retention.sql',
          sql: 'SELECT loyalty_tier, COUNT(*) as members FROM customers GROUP BY loyalty_tier ORDER BY members DESC;',
        },
        {
          name: 'schema_migration_v2.sql',
          sql: 'CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date);',
        },
      ],
    },
    {
      name: 'Saved Bookmarks',
      files: [
        {
          name: 'top_orders_daily.sql',
          sql: 'SELECT * FROM orders WHERE total_amount > 500 ORDER BY total_amount DESC;',
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] text-xs select-none">
      <div className="px-3 py-2 border-b border-[#333333] bg-[#2d2d2d] font-semibold text-[11px] uppercase tracking-wider text-[#969696]">
        Workspace Explorer
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {workspaces.map((ws) => (
          <div key={ws.name}>
            <div className="flex items-center gap-1.5 text-[#a0a0a0] font-semibold py-1">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>{ws.name}</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {ws.files.map((f) => (
                <div
                  key={f.name}
                  onClick={() => onOpenQuery(f.name, f.sql)}
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#2a2d2e] cursor-pointer text-[#cccccc] hover:text-white"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExtensionsPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] text-xs select-none">
      <div className="px-3 py-2 border-b border-[#333333] bg-[#2d2d2d] font-semibold text-[11px] uppercase tracking-wider text-[#969696]">
        Installed Extensions
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="p-3 bg-[#1e1e1e] border border-[#007acc] rounded-lg space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#007acc] text-white font-bold flex items-center justify-center text-sm shadow">
                DB
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Database Studio for VS Code</h4>
                <p className="text-[11px] text-[#858585]">WebAssembly Edition v24.2.0</p>
              </div>
            </div>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/50 text-[10px] px-2 py-0.5 rounded font-medium">
              Enabled
            </span>
          </div>

          <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
            Universal Database Manager with WebAssembly SQL Engine, interactive ER diagram visualizer,
            and high-performance data grid.
          </p>

          <div className="pt-2 border-t border-[#2d2d2d] flex items-center justify-between text-[11px] text-[#858585]">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>5.0 (42.5k reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>WASM SIMD Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
