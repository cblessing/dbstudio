import React, { useState } from 'react';
import { DatabaseDriverInfo, DatabaseConnection, DatabaseType } from '../../types/database';
import { DATABASE_DRIVERS } from '../../engine/sqlEngineCore';
import {
  isNetworkDatabaseType,
  testLiveConnection,
  saveLiveConnection,
  introspectLiveSchema,
  LiveConnectionPayload,
} from '../../utils/liveBridge';
import { X, Zap, ArrowRight } from 'lucide-react';
import { DriverPickerStep } from './DriverPickerStep';
import {
  ConnectionConfigStep,
  ConnectionFormState,
  TestConnectionStatus,
} from './ConnectionConfigStep';

interface NewConnectionModalProps {
  isOpen: boolean;
  editingConnection?: DatabaseConnection | null;
  onClose: () => void;
  onAddConnection: (newConn: DatabaseConnection) => void;
}

function filterDriversByQuery(
  drivers: DatabaseDriverInfo[],
  categoryFilter: 'all' | 'relational' | 'analytical' | 'nosql',
  searchQuery: string
): DatabaseDriverInfo[] {
  const q = searchQuery.toLowerCase();
  return drivers.filter((d) => {
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesSearch =
      d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
}

function ModalHeaderTitle({
  step,
  driverName,
  isEditing,
}: {
  step: 'pick' | 'configure';
  driverName: string;
  isEditing: boolean;
}) {
  const isPick = step === 'pick';
  const heading = isEditing
    ? `Edit ${driverName} Connection`
    : isPick
    ? 'Create New Database Connection'
    : `Configure ${driverName}`;

  return (
    <div>
      <h3 className="font-bold text-white text-sm">{heading}</h3>
      <p className="text-[11px] text-[#858585]">
        {isPick
          ? 'Select a database engine to connect'
          : 'Specify connection parameters and driver properties'}
      </p>
    </div>
  );
}

function ModalFooter({
  isConfigure,
  isEditing,
  isTesting,
  onTest,
  onCancel,
  onSave,
}: {
  isConfigure: boolean;
  isEditing: boolean;
  isTesting: boolean;
  onTest: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-[#2d2d2d] border-t border-[#3c3c3c]">
      {isConfigure ? (
        <button
          onClick={onTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
          aria-label="Test Database Connection"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Test Connection</span>
        </button>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
        >
          Cancel
        </button>
        {isConfigure && (
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium rounded transition-colors"
            aria-label="Connect and Save Database"
          >
            <span>{isEditing ? 'Save Changes' : 'Connect'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function findDriverById(typeId: DatabaseConnection['type']): DatabaseDriverInfo {
  return DATABASE_DRIVERS.find((d) => d.id === typeId) ?? DATABASE_DRIVERS[0];
}

function createFormState(editing: DatabaseConnection | null): ConnectionFormState {
  if (!editing) {
    return {
      selectedDriver: DATABASE_DRIVERS[0],
      step: 'pick',
      connectionName: '',
      host: 'localhost',
      port: 0,
      database: '',
      username: 'admin',
      password: '',
      ssl: true,
      allowSelfSigned: false,
    };
  }
  return {
    selectedDriver: findDriverById(editing.type),
    step: 'configure',
    connectionName: editing.name,
    host: editing.host,
    port: editing.port,
    database: editing.database,
    username: editing.username,
    password: '',
    ssl: editing.ssl,
    allowSelfSigned: editing.rejectUnauthorized === false,
  };
}

function buildLivePayload(connId: string, form: ConnectionFormState): LiveConnectionPayload {
  return {
    id: connId,
    type: form.selectedDriver.id,
    host: form.host.trim() || 'localhost',
    port: Number(form.port) || form.selectedDriver.defaultPort,
    database: form.database.trim() || form.selectedDriver.id,
    username: form.username.trim(),
    ssl: form.ssl,
    rejectUnauthorized: !form.allowSelfSigned,
  };
}

function buildSavedConnectionRecord(
  connId: string,
  form: ConnectionFormState,
  editing: DatabaseConnection | null,
  testStatus: TestConnectionStatus | null,
  schemas: DatabaseConnection['schemas']
): DatabaseConnection {
  return {
    id: connId,
    name: form.connectionName || `${form.selectedDriver.name} Connection`,
    type: form.selectedDriver.id,
    host: form.host,
    port: form.port,
    database: form.database || form.selectedDriver.id,
    username: form.username,
    ssl: form.ssl,
    rejectUnauthorized: !form.allowSelfSigned,
    colorBadge: form.selectedDriver.color,
    status: 'connected',
    pingMs: testStatus?.latencyMs ?? editing?.pingMs ?? 1.2,
    version: editing?.version ?? form.selectedDriver.name,
    schemas,
  };
}

const DEFAULT_USERNAMES: Partial<Record<DatabaseType, string>> = {
  postgres: 'postgres',
  mysql: 'root',
  mariadb: 'root',
  sqlserver: 'sa',
  oracle: 'system',
  clickhouse: 'default',
  mongodb: 'root',
  redis: '',
};

const DEFAULT_SCHEMA_NAMES: Partial<Record<DatabaseType, string>> = {
  postgres: 'public',
  sqlserver: 'dbo',
  oracle: 'SYSTEM',
  clickhouse: 'default',
  mongodb: 'admin',
  redis: 'db0',
};

function defaultSchemaNameFor(type: DatabaseType, database: string): string {
  if (type === 'mysql' || type === 'mariadb') return database || 'dbstudio';
  return DEFAULT_SCHEMA_NAMES[type] ?? (database || 'main');
}

async function persistLiveConnectionAndSchema(
  connId: string,
  payload: LiveConnectionPayload,
  password: string
): Promise<DatabaseConnection['schemas']> {
  await saveLiveConnection(payload, password);
  const liveTables = await introspectLiveSchema(connId).catch(() => []);
  const schemaName = liveTables[0]?.schema ?? defaultSchemaNameFor(payload.type, payload.database);
  return [{ name: schemaName, tables: liveTables, views: [], procedures: [] }];
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  editingConnection = null,
  onClose,
  onAddConnection,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'relational' | 'analytical' | 'nosql'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<ConnectionFormState>(() => createFormState(editingConnection));
  const [testStatus, setTestStatus] = useState<TestConnectionStatus | null>(null);

  const openSessionKey = isOpen ? `open:${editingConnection?.id ?? 'new'}` : 'closed';
  const [prevSessionKey, setPrevSessionKey] = useState(openSessionKey);
  if (openSessionKey !== prevSessionKey) {
    setPrevSessionKey(openSessionKey);
    if (isOpen) {
      setForm(createFormState(editingConnection));
      setTestStatus(null);
    }
  }

  if (!isOpen) return null;

  const updateForm = (patch: Partial<ConnectionFormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const isNetworkDriver = isNetworkDatabaseType(form.selectedDriver.id);

  const handleSelectDriver = (driver: DatabaseDriverInfo) => {
    updateForm({
      selectedDriver: driver,
      connectionName: driver.name,
      port: driver.defaultPort,
      username: DEFAULT_USERNAMES[driver.id] ?? '',
      ssl: driver.defaultPort > 0,
      allowSelfSigned: false,
      database: '',
      step: 'configure',
    });
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    if (!isNetworkDriver) {
      setTestStatus({ testing: false, success: true, latencyMs: 0.4, message: 'Connected to local embedded engine in 0.4ms.' });
      return;
    }
    const testConnId = editingConnection ? editingConnection.id : `test_${form.selectedDriver.id}`;
    try {
      const res = await testLiveConnection(buildLivePayload(testConnId, form), form.password);
      setTestStatus({
        testing: false,
        success: res.success,
        latencyMs: res.latencyMs,
        message: res.version ? `${res.message} ${res.version}` : res.message,
      });
    } catch (err) {
      setTestStatus({ testing: false, success: false, message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleSaveConnection = async () => {
    const connId = editingConnection ? editingConnection.id : `conn_${Date.now()}_${form.selectedDriver.id}`;
    const emptySchemaName = defaultSchemaNameFor(form.selectedDriver.id, form.database);
    let schemas: DatabaseConnection['schemas'] = editingConnection
      ? editingConnection.schemas
      : [{ name: emptySchemaName, tables: [], views: [], procedures: [] }];

    if (isNetworkDriver) {
      try {
        schemas = await persistLiveConnectionAndSchema(connId, buildLivePayload(connId, form), form.password);
      } catch (err) {
        setTestStatus({ testing: false, success: false, message: err instanceof Error ? err.message : String(err) });
        return;
      }
    }

    onAddConnection(buildSavedConnectionRecord(connId, form, editingConnection, testStatus, schemas));
    onClose();
  };

  const filteredDrivers = filterDriversByQuery(DATABASE_DRIVERS, categoryFilter, searchQuery);

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
            <div className="w-6 h-6 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <ModalHeaderTitle
              step={form.step}
              driverName={form.selectedDriver.name}
              isEditing={Boolean(editingConnection)}
            />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {form.step === 'pick' ? (
          <DriverPickerStep
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            drivers={filteredDrivers}
            onSelectDriver={handleSelectDriver}
          />
        ) : (
          <ConnectionConfigStep
            form={form}
            isEditing={Boolean(editingConnection)}
            testStatus={testStatus}
            onChange={updateForm}
            onChangeDriver={() => updateForm({ step: 'pick' })}
          />
        )}

        <ModalFooter
          isConfigure={form.step === 'configure'}
          isEditing={Boolean(editingConnection)}
          isTesting={Boolean(testStatus?.testing)}
          onTest={handleTestConnection}
          onCancel={onClose}
          onSave={handleSaveConnection}
        />
      </div>
    </div>
  );
};
