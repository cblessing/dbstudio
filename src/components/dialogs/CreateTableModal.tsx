import React, { useState } from 'react';
import { ColumnDefinition, TableDefinition } from '../../types/database';
import { generateCreateTableSql } from '../../utils/tableManagement';
import {
  X,
  Plus,
  Trash2,
  Table as TableIcon,
  Code2,
  Check,
  AlertCircle,
  Key,
} from 'lucide-react';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (tableDef: TableDefinition, ddl: string) => Promise<void>;
}

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onCreateTable,
}) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
    { name: 'name', type: 'VARCHAR(100)', primaryKey: false, nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: true, defaultValue: 'CURRENT_TIMESTAMP' },
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleAddColumnRow = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: `column_${prev.length + 1}`,
        type: 'VARCHAR(100)',
        primaryKey: false,
        nullable: true,
      },
    ]);
  };

  const handleRemoveColumnRow = (index: number) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColumnField = (index: number, field: keyof ColumnDefinition, value: any) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, [field]: value } : col))
    );
  };

  const generatedDdl = tableName.trim()
    ? generateCreateTableSql(tableName.trim(), columns)
    : '-- Enter a table name to preview CREATE TABLE DDL';

  const handleSubmit = async () => {
    if (!tableName.trim()) {
      setErrorMessage('Please provide a table name.');
      return;
    }

    if (columns.some((c) => !c.name.trim())) {
      setErrorMessage('All columns must have a valid name.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const tableDef: TableDefinition = {
      name: tableName.trim(),
      schema: 'public',
      rowCount: 0,
      columns,
      ddl: generatedDdl,
    };

    try {
      await onCreateTable(tableDef, generatedDdl);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create table in WebAssembly engine.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d2d2d] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Create New Table (Table Designer)</h3>
              <p className="text-[11px] text-[#858585]">
                Design and provision a new table with column constraints in the WebAssembly database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-800/40 text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[#858585] mb-1 font-mono text-[11px]">Table Name</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. inventory_logs, customers_backup, telemetry"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
            />
          </div>

          {/* Columns Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-white">Table Columns</span>
              <button
                onClick={handleAddColumnRow}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="border border-[#3c3c3c] rounded-lg overflow-hidden bg-[#1e1e1e]">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead className="bg-[#2d2d2d] border-b border-[#3c3c3c] text-[#858585]">
                  <tr>
                    <th className="py-1.5 px-3">Column Name</th>
                    <th className="py-1.5 px-3">Data Type</th>
                    <th className="py-1.5 px-2 text-center">PK</th>
                    <th className="py-1.5 px-2 text-center">Nullable</th>
                    <th className="py-1.5 px-3">Default</th>
                    <th className="py-1.5 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, idx) => (
                    <tr key={idx} className="border-b border-[#2d2d2d] hover:bg-[#252526]">
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateColumnField(idx, 'name', e.target.value)}
                          className="w-full bg-[#111111] border border-[#3c3c3c] rounded px-2 py-0.5 text-white font-mono text-xs outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={col.type}
                          onChange={(e) => updateColumnField(idx, 'type', e.target.value)}
                          className="bg-[#111111] border border-[#3c3c3c] rounded px-2 py-0.5 text-emerald-400 font-mono text-xs outline-none"
                        >
                          <option value="INTEGER">INTEGER</option>
                          <option value="VARCHAR(100)">VARCHAR(100)</option>
                          <option value="VARCHAR(255)">VARCHAR(255)</option>
                          <option value="TEXT">TEXT</option>
                          <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={col.primaryKey}
                          onChange={(e) => {
                            // If making this PK, disable nullable
                            updateColumnField(idx, 'primaryKey', e.target.checked);
                            if (e.target.checked) {
                              updateColumnField(idx, 'nullable', false);
                            }
                          }}
                          className="rounded bg-[#111111] border-[#3c3c3c] text-amber-500"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          disabled={col.primaryKey}
                          checked={col.nullable}
                          onChange={(e) => updateColumnField(idx, 'nullable', e.target.checked)}
                          className="rounded bg-[#111111] border-[#3c3c3c] text-[#007acc]"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={col.defaultValue ?? ''}
                          placeholder="NULL"
                          onChange={(e) => updateColumnField(idx, 'defaultValue', e.target.value)}
                          className="w-full bg-[#111111] border border-[#3c3c3c] rounded px-2 py-0.5 text-zinc-300 font-mono text-xs outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {columns.length > 1 && (
                          <button
                            onClick={() => handleRemoveColumnRow(idx)}
                            className="p-1 hover:bg-rose-900/60 rounded text-[#858585] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DDL Preview */}
          <div>
            <span className="block text-[#858585] mb-1 font-mono text-[11px]">
              Generated DDL (WASM Execution Preview)
            </span>
            <pre className="bg-[#111111] border border-[#333333] rounded p-3 text-sky-300 font-mono text-xs select-text leading-5 overflow-auto max-h-32">
              {generatedDdl}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#2d2d2d] border-t border-[#3c3c3c]">
          <span className="text-[11px] text-[#858585]">
            Will be instantiated immediately in WASM memory space
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCreating || !tableName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white font-medium rounded transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Creating...' : 'Create Table'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
