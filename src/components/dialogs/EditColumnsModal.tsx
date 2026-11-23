import React, { useState } from 'react';
import { TableDefinition, ColumnDefinition, DatabaseType } from '../../types/database';
import {
  COMMON_COLUMN_TYPES,
  generateAddColumnSql,
  generateRenameColumnSql,
  generateDropColumnSql,
  generateRenameTableSql,
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
} from 'lucide-react';

interface EditColumnsModalProps {
  isOpen: boolean;
  table: TableDefinition;
  dialect?: DatabaseType;
  onClose: () => void;
  onExecuteAlter: (
    ddlSql: string,
    updatedTable: TableDefinition,
    oldTableName?: string
  ) => Promise<void>;
}

function TableNameHeaderEditor({
  isRenaming,
  currentName,
  draft,
  onDraftChange,
  onStartRename,
  onConfirmRename,
  onCancelRename,
}: {
  isRenaming: boolean;
  currentName: string;
  draft: string;
  onDraftChange: (val: string) => void;
  onStartRename: () => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}) {
  if (isRenaming) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirmRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          className="bg-[#111111] border border-[#007acc] text-white px-2 py-0.5 rounded outline-none text-xs font-mono"
        />
        <button
          onClick={onConfirmRename}
          className="text-emerald-400 p-1 hover:bg-[#3c3c3c] rounded"
          title="Confirm Rename Table"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sky-400 font-mono">{currentName}</span>
      <button
        onClick={onStartRename}
        className="text-[#858585] hover:text-white p-0.5 rounded hover:bg-[#3c3c3c]"
        title="Rename Table"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function ExistingColumnRow({
  col,
  isRenaming,
  renameDraft,
  onDraftChange,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDropColumn,
}: {
  col: ColumnDefinition;
  isRenaming: boolean;
  renameDraft: string;
  onDraftChange: (val: string) => void;
  onStartRename: () => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onDropColumn: () => void;
}) {
  return (
    <tr className="border-b border-[#2d2d2d] hover:bg-[#252526] transition-colors">
      <td className="py-2 px-3 font-semibold text-white">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={renameDraft}
              autoFocus
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              className="bg-[#111111] border border-[#007acc] text-white px-1.5 py-0.5 rounded outline-none text-xs"
            />
            <button
              onClick={onConfirmRename}
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
      <td className="py-2 px-3 text-[#858585]">{col.nullable ? 'YES' : 'NO'}</td>
      <td className="py-2 px-3 font-mono text-[#858585]">{col.defaultValue ?? '-'}</td>
      <td className="py-2 px-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onStartRename}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white"
            title="Rename Column"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!col.primaryKey && (
            <button
              onClick={onDropColumn}
              className="p-1 hover:bg-rose-900/60 rounded text-[#858585] hover:text-rose-400"
              title={`Drop Column ${col.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export const EditColumnsModal: React.FC<EditColumnsModalProps> = ({
  isOpen,
  table,
  dialect = 'sqlite',
  onClose,
  onExecuteAlter,
}) => {
  const [currentTableName, setCurrentTableName] = useState(table.name);
  const [tableNameDraft, setTableNameDraft] = useState(table.name);
  const [isRenamingTable, setIsRenamingTable] = useState(false);
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

  const runAlterAction = async (
    ddl: string,
    updatedTable: TableDefinition,
    successText: string,
    onSuccess: () => void
  ) => {
    setIsExecuting(true);
    setStatusMessage(null);
    try {
      await onExecuteAlter(ddl, updatedTable, currentTableName);
      onSuccess();
      setStatusMessage({ text: successText });
    } catch (err: any) {
      const msg = err ? String(err.message || err) : 'Failed to alter table';
      setStatusMessage({ text: msg, error: true });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRenameTable = async () => {
    const newTblName = tableNameDraft.trim();
    if (!newTblName || newTblName === currentTableName) {
      setIsRenamingTable(false);
      return;
    }

    const ddl = generateRenameTableSql(currentTableName, newTblName, dialect);
    const updatedTable: TableDefinition = { ...table, name: newTblName, columns };
    await runAlterAction(
      ddl,
      updatedTable,
      `Renamed table to "${newTblName}" (${ddl})`,
      () => {
        setCurrentTableName(newTblName);
        setIsRenamingTable(false);
      }
    );
  };

  const handleAddColumn = async () => {
    const cleanName = newColName.trim();
    if (!cleanName) {
      setStatusMessage({ text: 'Column name cannot be empty', error: true });
      return;
    }
    if (columns.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      setStatusMessage({ text: 'A column with this name already exists', error: true });
      return;
    }

    const defaultVal = newColDefault.trim();
    const newCol: ColumnDefinition = {
      name: cleanName,
      type: newColType,
      nullable: newColNullable,
      primaryKey: false,
      defaultValue: defaultVal ? defaultVal : undefined,
    };

    const ddl = generateAddColumnSql(currentTableName, newCol, dialect);
    const updatedCols = [...columns, newCol];
    const updatedTable: TableDefinition = { ...table, name: currentTableName, columns: updatedCols };
    await runAlterAction(ddl, updatedTable, `Added column "${newCol.name}".`, () => {
      setColumns(updatedCols);
      setNewColName('');
      setNewColDefault('');
    });
  };

  const handleRenameColumn = async (colIdx: number) => {
    const oldCol = columns[colIdx];
    const newName = renameDraft.trim();
    if (!newName || newName === oldCol.name) {
      setRenamingIdx(null);
      return;
    }

    const ddl = generateRenameColumnSql(currentTableName, oldCol.name, newName, dialect);
    const updatedCols = columns.map((c, i) => (i === colIdx ? { ...c, name: newName } : c));
    const updatedTable: TableDefinition = { ...table, name: currentTableName, columns: updatedCols };
    await runAlterAction(
      ddl,
      updatedTable,
      `Renamed column "${oldCol.name}" to "${newName}".`,
      () => {
        setColumns(updatedCols);
        setRenamingIdx(null);
      }
    );
  };

  const handleDropColumn = async (colName: string) => {
    if (columns.length <= 1) {
      setStatusMessage({ text: 'Cannot drop the only remaining column in table', error: true });
      return;
    }

    const ddl = generateDropColumnSql(currentTableName, colName, dialect);
    const updatedCols = columns.filter((c) => c.name !== colName);
    const updatedTable: TableDefinition = { ...table, name: currentTableName, columns: updatedCols };
    await runAlterAction(ddl, updatedTable, `Dropped column "${colName}".`, () => {
      setColumns(updatedCols);
    });
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
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d2d2d] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Edit Table Structure:</span>
                <TableNameHeaderEditor
                  isRenaming={isRenamingTable}
                  currentName={currentTableName}
                  draft={tableNameDraft}
                  onDraftChange={setTableNameDraft}
                  onStartRename={() => {
                    setTableNameDraft(currentTableName);
                    setIsRenamingTable(true);
                  }}
                  onConfirmRename={handleRenameTable}
                  onCancelRename={() => setIsRenamingTable(false)}
                />
              </h3>
              <p className="text-[11px] text-[#858585]">
                Rename table or add, rename, and drop columns
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

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center justify-between">
              <span>Existing Columns ({columns.length})</span>
              <span className="text-[11px] text-[#858585] font-normal">
                Click edit to rename
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
                    <ExistingColumnRow
                      key={col.name}
                      col={col}
                      isRenaming={renamingIdx === idx}
                      renameDraft={renameDraft}
                      onDraftChange={setRenameDraft}
                      onStartRename={() => {
                        setRenamingIdx(idx);
                        setRenameDraft(col.name);
                      }}
                      onConfirmRename={() => handleRenameColumn(idx)}
                      onCancelRename={() => setRenamingIdx(null)}
                      onDropColumn={() => handleDropColumn(col.name)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add New Column (ALTER TABLE ADD COLUMN)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[#858585] mb-1 font-mono text-[11px]">
                  Column Name
                </label>
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
                  {COMMON_COLUMN_TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#858585] mb-1 font-mono text-[11px]">
                  Default Value
                </label>
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
