import React, { useState } from 'react';
import { TableDefinition, ColumnDefinition } from '../../types/database';
import {
  generateAddColumnSql,
  generateRenameColumnSql,
  generateDropColumnSql,
} from '../../utils/tableManagement';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Key,
  Columns,
  Check,
  AlertCircle,
  Code2,
} from 'lucide-react';

interface EditColumnsModalProps {
  isOpen: boolean;
  table: TableDefinition;
  onClose: () => void;
  onExecuteAlter: (ddlSql: string, updatedTable: TableDefinition) => Promise<void>;
}

export const EditColumnsModal: React.FC<EditColumnsModalProps> = ({
  isOpen,
  table,
  onClose,
  onExecuteAlter,
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([...table.columns]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('VARCHAR(100)');
  const [newColNullable, setNewColNullable] = useState(true);
  const [newColDefault, setNewColDefault] = useState('');
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const handleAddColumn = async () => {
    if (!newColName.trim()) {
      setStatusMessage({ text: 'Column name cannot be empty', error: true });
      return;
    }
    if (columns.some((c) => c.name.toLowerCase() === newColName.trim().toLowerCase())) {
      setStatusMessage({ text: 'A column with this name already exists', error: true });
      return;
    }

    const newCol: ColumnDefinition = {
      name: newColName.trim(),
      type: newColType,
      nullable: newColNullable,
      primaryKey: false,
      defaultValue: newColDefault.trim() || undefined,
    };

    const ddl = generateAddColumnSql(table.name, newCol);
    setIsExecuting(true);
    setStatusMessage(null);

    try {
      const updatedTable: TableDefinition = {
        ...table,
        columns: [...columns, newCol],
      };
      await onExecuteAlter(ddl, updatedTable);
      setColumns(updatedTable.columns);
      setNewColName('');
      setNewColDefault('');
      setStatusMessage({ text: `Added column "${newCol.name}" via WebAssembly ALTER TABLE.` });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Failed to alter table', error: true });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRenameColumn = async (colIdx: number) => {
    const oldCol = columns[colIdx];
    const newName = renameDraft.trim();
    if (!newName || newName === oldCol.name) {
      setRenamingIdx(null);
      return;
    }

    const ddl = generateRenameColumnSql(table.name, oldCol.name, newName);
    setIsExecuting(true);
    setStatusMessage(null);

    try {
      const updatedCols = columns.map((c, i) => (i === colIdx ? { ...c, name: newName } : c));
      const updatedTable: TableDefinition = {
        ...table,
        columns: updatedCols,
      };
      await onExecuteAlter(ddl, updatedTable);
      setColumns(updatedCols);
      setRenamingIdx(null);
      setStatusMessage({ text: `Renamed column "${oldCol.name}" to "${newName}".` });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Failed to rename column', error: true });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDropColumn = async (colName: string) => {
    if (columns.length <= 1) {
      setStatusMessage({ text: 'Cannot drop the only remaining column in table', error: true });
      return;
    }

    const ddl = generateDropColumnSql(table.name, colName);
    setIsExecuting(true);
    setStatusMessage(null);

    try {
      const updatedCols = columns.filter((c) => c.name !== colName);
      const updatedTable: TableDefinition = {
        ...table,
        columns: updatedCols,
      };
      await onExecuteAlter(ddl, updatedTable);
      setColumns(updatedCols);
      setStatusMessage({ text: `Dropped column "${colName}".` });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Failed to drop column', error: true });
    } finally {
      setIsExecuting(false);
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
            <Columns className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Edit Table Structure: <span className="text-sky-400 font-mono">{table.name}</span>
              </h3>
              <p className="text-[11px] text-[#858585]">
                Add, rename, or drop columns using live WebAssembly ALTER TABLE operations
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

        {/* Status message banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 border-b flex items-center gap-2 text-xs ${
              statusMessage.error
                ? 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
            }`}
          >
            {statusMessage.error ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Existing Columns Table */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center justify-between">
              <span>Existing Columns ({columns.length})</span>
              <span className="text-[11px] text-[#858585] font-normal">
                Double-click name or click edit to rename
              </span>
            </h4>

            <div className="border border-[#3c3c3c] rounded-lg overflow-hidden bg-[#1e1e1e]">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead className="bg-[#2d2d2d] border-b border-[#3c3c3c] text-[#858585]">
                  <tr>
                    <th className="py-1.5 px-3">Column Name</th>
                    <th className="py-1.5 px-3">Type</th>
                    <th className="py-1.5 px-3">Nullable</th>
                    <th className="py-1.5 px-3">Default</th>
                    <th className="py-1.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, idx) => (
                    <tr
                      key={col.name}
                      className="border-b border-[#2d2d2d] hover:bg-[#252526] transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-white">
                        {renamingIdx === idx ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={renameDraft}
                              autoFocus
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameColumn(idx);
                                if (e.key === 'Escape') setRenamingIdx(null);
                              }}
                              className="bg-[#111111] border border-[#007acc] text-white px-1.5 py-0.5 rounded outline-none text-xs"
                            />
                            <button
                              onClick={() => handleRenameColumn(idx)}
                              className="text-emerald-400 p-1 hover:bg-[#333333] rounded"
                              title="Confirm Rename"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {col.primaryKey && (
                              <span title="Primary Key">
                                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              </span>
                            )}
                            <span>{col.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{col.type}</td>
                      <td className="py-2 px-3 text-[#858585]">
                        {col.nullable ? 'YES' : 'NO'}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#858585]">
                        {col.defaultValue ?? '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setRenamingIdx(idx);
                              setRenameDraft(col.name);
                            }}
                            className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white"
                            title="Rename Column"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!col.primaryKey && (
                            <button
                              onClick={() => handleDropColumn(col.name)}
                              className="p-1 hover:bg-rose-900/60 rounded text-[#858585] hover:text-rose-400"
                              title={`Drop Column ${col.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add New Column Form */}
          <div className="p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add New Column (ALTER TABLE ADD COLUMN)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[#858585] mb-1 font-mono text-[11px]">Column Name</label>
                <input
                  type="text"
                  placeholder="e.g. phone, status, age"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2.5 py-1.5 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#858585] mb-1 font-mono text-[11px]">Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-1.5 text-white outline-none font-mono"
                >
                  <option value="VARCHAR(100)">VARCHAR(100)</option>
                  <option value="VARCHAR(255)">VARCHAR(255)</option>
                  <option value="INTEGER">INTEGER</option>
                  <option value="TEXT">TEXT</option>
                  <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                </select>
              </div>

              <div>
                <label className="block text-[#858585] mb-1 font-mono text-[11px]">Default Value</label>
                <input
                  type="text"
                  placeholder="NULL / 'Active'"
                  value={newColDefault}
                  onChange={(e) => setNewColDefault(e.target.value)}
                  className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-1.5 text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new_col_nullable"
                  checked={newColNullable}
                  onChange={(e) => setNewColNullable(e.target.checked)}
                  className="rounded bg-[#252526] border-[#3c3c3c] text-[#007acc]"
                />
                <label htmlFor="new_col_nullable" className="text-[#cccccc] cursor-pointer">
                  Nullable (allow NULL)
                </label>
              </div>

              <button
                onClick={handleAddColumn}
                disabled={isExecuting || !newColName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Execute Add Column</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-[#2d2d2d] border-t border-[#3c3c3c]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
