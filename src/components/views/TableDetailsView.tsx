import React, { useState, useEffect } from 'react';
import { TableDefinition, QueryResult } from '../../types/database';
import { mergePaginatedResults } from '../../utils/exportData';
import { DataGrid } from '../grid/DataGrid';
import {
  Table,
  Columns,
  Code2,
  Link,
  Copy,
  Check,
  Key,
  RefreshCw,
} from 'lucide-react';

interface TableDetailsViewProps {
  table: TableDefinition;
  onFetchTableData: (tableName: string, offset?: number) => Promise<QueryResult>;
  onUpdateRow?: (rowIndex: number, colName: string, newValue: any) => void;
  onAddRow?: (newRow: Record<string, any>) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

function TableColumnsPanel({ table }: { table: TableDefinition }) {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <table className="w-full border-collapse font-sans text-xs">
        <thead>
          <tr className="border-b border-[#3c3c3c] text-left text-[#969696] font-semibold">
            <th className="py-2 px-3">#</th>
            <th className="py-2 px-3">Column Name</th>
            <th className="py-2 px-3">Data Type</th>
            <th className="py-2 px-3">Nullable</th>
            <th className="py-2 px-3">Key</th>
            <th className="py-2 px-3">Default Value</th>
          </tr>
        </thead>
        <tbody>
          {table.columns.map((col, idx) => (
            <tr
              key={col.name}
              className="border-b border-[#2d2d2d] hover:bg-[#252526] transition-colors"
            >
              <td className="py-2 px-3 text-[#6b6b6b]">{idx + 1}</td>
              <td className="py-2 px-3 font-semibold text-white flex items-center gap-2">
                {col.primaryKey && (
                  <span title="Primary Key">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                )}
                {col.foreignKey && (
                  <span title="Foreign Key">
                    <Link className="w-3.5 h-3.5 text-sky-400" />
                  </span>
                )}
                <span>{col.name}</span>
              </td>
              <td className="py-2 px-3 font-mono text-emerald-400">{col.type}</td>
              <td className="py-2 px-3">
                {col.nullable ? (
                  <span className="text-[#858585]">YES</span>
                ) : (
                  <span className="text-amber-400 font-bold">NO</span>
                )}
              </td>
              <td className="py-2 px-3">
                {col.primaryKey ? (
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    PRIMARY KEY
                  </span>
                ) : col.foreignKey ? (
                  <span className="bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    FK: {col.foreignKey.targetTable}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="py-2 px-3 font-mono text-[#858585]">
                {col.defaultValue ?? 'NULL'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableForeignKeysPanel({ table }: { table: TableDefinition }) {
  const fks = table.foreignKeys ?? [];
  return (
    <div className="p-4 overflow-y-auto h-full space-y-3">
      <h4 className="font-semibold text-white">Foreign Key Constraints</h4>
      {fks.length > 0 ? (
        <div className="space-y-2">
          {fks.map((fk) => (
            <div
              key={fk.name}
              className="p-3 bg-[#252526] border border-[#3c3c3c] rounded flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-sky-400" />
                <div>
                  <p className="font-semibold text-white">{fk.name}</p>
                  <p className="text-[#858585] text-[11px] font-mono">
                    {table.name}({fk.column}) → {fk.foreignTable}({fk.foreignColumn})
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded">
                Enforced (ON DELETE RESTRICT)
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-[#858585] border border-dashed border-[#333333] rounded">
          No foreign keys defined for this table.
        </div>
      )}
    </div>
  );
}

function TableDdlPanel({
  table,
  copiedDdl,
  onCopyDdl,
}: {
  table: TableDefinition;
  copiedDdl: boolean;
  onCopyDdl: () => void;
}) {
  const ddlText = table.ddl ? table.ddl : `-- DDL not generated for ${table.name}`;
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#858585]">Table DDL:</span>
        <button
          onClick={onCopyDdl}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
        >
          {copiedDdl ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy DDL</span>
            </>
          )}
        </button>
      </div>
      <pre className="flex-1 bg-[#181818] border border-[#2d2d2d] rounded p-4 font-mono text-xs text-sky-300 overflow-auto select-text leading-5">
        {ddlText}
      </pre>
    </div>
  );
}

export const TableDetailsView: React.FC<TableDetailsViewProps> = ({
  table,
  onFetchTableData,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'columns' | 'foreignKeys' | 'ddl'>('data');
  const [gridData, setGridData] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await onFetchTableData(table.name, 0);
      setGridData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMoreData = async () => {
    if (!gridData?.hasMore || gridData.nextOffset === undefined) return;
    const nextRes = await onFetchTableData(table.name, gridData.nextOffset);
    setGridData((prev) => mergePaginatedResults(prev, nextRes));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await onFetchTableData(table.name, 0);
        if (active) setGridData(res);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, [table.name, onFetchTableData]);

  const copyDdl = () => {
    if (table.ddl) {
      navigator.clipboard.writeText(table.ddl);
      setCopiedDdl(true);
      setTimeout(() => setCopiedDdl(false), 2000);
    }
  };

  const renderDataPanel = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-[#858585] gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#007acc]" />
          <span>Loading rows...</span>
        </div>
      );
    }
    if (!gridData) {
      return <div className="p-8 text-center text-[#858585]">Failed to load table data.</div>;
    }
    if (gridData.error) {
      return (
        <div className="p-4 m-4 rounded border border-rose-800/50 bg-rose-950/30 text-rose-200 font-mono text-xs space-y-1">
          <p className="font-semibold text-rose-300">Failed to load rows from {table.name}:</p>
          <pre className="whitespace-pre-wrap break-words">{gridData.error}</pre>
        </div>
      );
    }
    return (
      <DataGrid
        columns={gridData.columns}
        rows={gridData.rows}
        tableName={table.name}
        executionTimeMs={gridData.executionTimeMs}
        fetchTimeMs={gridData.fetchTimeMs}
        hasMore={gridData.hasMore}
        onLoadMore={handleLoadMoreData}
        onRefresh={loadData}
        onUpdateRow={onUpdateRow}
        onAddRow={onAddRow}
        onDeleteRow={onDeleteRow}
      />
    );
  };

  const renderActivePanel = () => {
    if (activeTab === 'columns') return <TableColumnsPanel table={table} />;
    if (activeTab === 'foreignKeys') return <TableForeignKeysPanel table={table} />;
    if (activeTab === 'ddl') {
      return <TableDdlPanel table={table} copiedDdl={copiedDdl} onCopyDdl={copyDdl} />;
    }
    return renderDataPanel();
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-sky-400" />
          <h3 className="font-bold text-white text-sm tracking-wide">{table.name}</h3>
          <span className="text-[11px] bg-[#333333] text-[#a0a0a0] px-2 py-0.5 rounded font-mono">
            {table.schema ? table.schema : 'public'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#1e1e1e] p-0.5 rounded border border-[#333333]">
          {(
            [
              { id: 'data', label: 'Data', icon: <Table className="w-3.5 h-3.5" /> },
              {
                id: 'columns',
                label: `Columns (${table.columns.length})`,
                icon: <Columns className="w-3.5 h-3.5" />,
              },
              {
                id: 'foreignKeys',
                label: 'Foreign Keys',
                icon: <Link className="w-3.5 h-3.5" />,
              },
              { id: 'ddl', label: 'DDL', icon: <Code2 className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#007acc] text-white font-medium'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">{renderActivePanel()}</div>
    </div>
  );
};
