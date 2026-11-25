import React, { useEffect, useState } from 'react';
import {
  DatabaseDriverInfo,
  DatabaseConnection,
  DatabaseType,
  SshTunnelConfig,
} from '../../types/database';
import { DATABASE_DRIVERS, buildDefaultSchemaForType } from '../../engine/sqlEngineCore';
import { groupTablesIntoSchemas } from '../../utils/connectionProfiles';
import {
  isNetworkDatabaseType,
  testLiveConnection,
  saveLiveConnection,
  introspectLiveSchema,
  getLiveConnectionPassword,
  LiveConnectionPayload,
} from '../../utils/liveBridge';
import { ParsedConnectionUri } from '../../utils/connectionUri';
import { toSshFormFields } from '../../utils/connectionLabels';
import { X, Zap, RefreshCw } from 'lucide-react';
import { DriverPickerStep } from './DriverPickerStep';
import {
  ConnectionConfigStep,
  ConnectionFormState,
  TestConnectionStatus,
} from './ConnectionConfigStep';
import { HeaderBadgeColorPicker } from './HeaderBadgeColorPicker';

interface NewConnectionModalProps {
  isOpen: boolean;
  editingConnection?: DatabaseConnection | null;
  onClose: () => void;
  onAddConnection: (newConn: DatabaseConnection) => void;
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

function findDriverById(typeId: DatabaseConnection['type']): DatabaseDriverInfo {
  return DATABASE_DRIVERS.find((d) => d.id === typeId) ?? DATABASE_DRIVERS[0];
}

function buildSshConfigFromForm(form: ConnectionFormState): SshTunnelConfig | undefined {
  if (!form.sshEnabled) return undefined;
  return {
    enabled: true,
    host: form.sshHost.trim(),
    port: Number(form.sshPort) || 22,
    username: form.sshUsername.trim(),
    authMethod: form.sshAuthMethod,
    privateKeyPath: form.sshPrivateKeyPath.trim() || undefined,
  };
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
      ...toSshFormFields(),
      colorBadge: DATABASE_DRIVERS[0].color,
    };
  }
  const driver = findDriverById(editing.type);
  return {
    selectedDriver: driver,
    step: 'configure',
    connectionName: editing.name,
    host: editing.host,
    port: editing.port,
    database: editing.database,
    username: editing.username,
    password: '',
    ssl: editing.ssl,
    allowSelfSigned: editing.rejectUnauthorized === false,
    ...toSshFormFields(editing.ssh),
    colorBadge: editing.colorBadge || driver.color,
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
    ssh: buildSshConfigFromForm(form),
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
    ssh: buildSshConfigFromForm(form),
    colorBadge: form.colorBadge || form.selectedDriver.color,
    status: 'connected',
    pingMs: testStatus?.latencyMs ?? editing?.pingMs ?? 1.2,
    version: editing?.version ?? form.selectedDriver.name,
    schemas,
  };
}

async function persistLiveConnectionAndSchema(
  connId: string,
  payload: LiveConnectionPayload,
  password: string,
  sshSecret: string
): Promise<DatabaseConnection['schemas']> {
  await saveLiveConnection(payload, password, sshSecret);
  const liveTables = await introspectLiveSchema(connId).catch(() => []);
  const fallbackName = defaultSchemaNameFor(payload.type, payload.database);
  return groupTablesIntoSchemas(liveTables, fallbackName);
}

function mergeParsedUriIntoForm(
  prev: ConnectionFormState,
  parsed: ParsedConnectionUri
): ConnectionFormState {
  const nextDriver = parsed.type ? findDriverById(parsed.type) : prev.selectedDriver;
  return {
    ...prev,
    selectedDriver: nextDriver,
    colorBadge: parsed.type ? nextDriver.color : prev.colorBadge,
    host: parsed.host,
    port: parsed.port ?? prev.port,
    database: parsed.database ?? prev.database,
    username: parsed.username ?? prev.username,
    password: parsed.password ?? prev.password,
    ssl: parsed.ssl ?? prev.ssl,
    allowSelfSigned: parsed.allowSelfSigned ?? prev.allowSelfSigned,
  };
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
      <h3 id="connection-modal-title" className="font-semibold text-[#f1f1f1] text-sm">
        {heading}
      </h3>
      <p className="text-[11px] text-[#8e8e93]">
        {isPick
          ? 'Select a database engine to connect'
          : 'Configure connection parameters, credentials, and TLS'}
      </p>
    </div>
  );
}

const FOOTER_BTN_BASE =
  'h-7 min-w-[78px] px-3 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';

function ModalFooter({
  isConfigure,
  isEditing,
  isTesting,
  isSaving,
  onTest,
  onCancel,
}: {
  isConfigure: boolean;
  isEditing: boolean;
  isTesting: boolean;
  isSaving: boolean;
  onTest: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#26262a] border-t border-white/10">
      {isConfigure ? (
        <button
          type="button"
          onClick={onTest}
          disabled={isTesting || isSaving}
          className={`${FOOTER_BTN_BASE} rounded-md border border-white/10 bg-[#313136] hover:bg-[#3c3c42] text-[#f1f1f1]`}
          aria-label="Test Database Connection"
        >
          {isTesting ? (
            <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
          ) : (
            <Zap className="w-3 h-3 text-amber-400" />
          )}
          <span>{isTesting ? 'Testing' : 'Test'}</span>
        </button>
      ) : (
        <div />
      )}

      <div
        role="group"
        aria-label="Connection dialog actions"
        className="inline-flex rounded-md overflow-hidden border border-white/10 divide-x divide-white/10"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={`${FOOTER_BTN_BASE} bg-[#313136] hover:bg-[#3c3c42] text-[#e4e4e7]`}
        >
          Cancel
        </button>

        {isConfigure && (
          <button
            type="submit"
            disabled={isSaving}
            className={`${FOOTER_BTN_BASE} bg-[#007acc] hover:bg-[#0066ad] text-white`}
            aria-label="Connect and Save Database"
          >
            {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{isSaving ? 'Saving' : isEditing ? 'Save' : 'Connect'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function resolveBadgeLabelSource(form: ConnectionFormState): string {
  return form.connectionName || form.selectedDriver.name;
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
  const [isSaving, setIsSaving] = useState(false);

  const openSessionKey = isOpen ? `open:${editingConnection?.id ?? 'new'}` : 'closed';
  const [prevSessionKey, setPrevSessionKey] = useState(openSessionKey);
  if (openSessionKey !== prevSessionKey) {
    setPrevSessionKey(openSessionKey);
    if (isOpen) {
      setForm(createFormState(editingConnection));
      setTestStatus(null);
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !editingConnection || !isNetworkDatabaseType(editingConnection.type)) return;
    let active = true;
    void getLiveConnectionPassword(editingConnection.id)
      .then((saved) => {
        if (active && saved) setForm((prev) => (prev.password ? prev : { ...prev, password: saved }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, editingConnection]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
      colorBadge: driver.color,
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
      const res = await testLiveConnection(
        buildLivePayload(testConnId, form),
        form.password,
        form.sshSecret
      );
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

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.step !== 'configure' || isSaving) return;
    setIsSaving(true);

    const connId = editingConnection ? editingConnection.id : `conn_${Date.now()}_${form.selectedDriver.id}`;
    let schemas: DatabaseConnection['schemas'] = editingConnection
      ? editingConnection.schemas
      : isNetworkDriver
      ? [{ name: defaultSchemaNameFor(form.selectedDriver.id, form.database), tables: [], views: [], procedures: [] }]
      : [buildDefaultSchemaForType(form.selectedDriver.id)];

    if (isNetworkDriver) {
      try {
        schemas = await persistLiveConnectionAndSchema(
          connId,
          buildLivePayload(connId, form),
          form.password,
          form.sshSecret
        );
      } catch (err) {
        setTestStatus({ testing: false, success: false, message: err instanceof Error ? err.message : String(err) });
        setIsSaving(false);
        return;
      }
    }

    onAddConnection(buildSavedConnectionRecord(connId, form, editingConnection, testStatus, schemas));
    setIsSaving(false);
    onClose();
  };

  const resolveSavedPassword = async (): Promise<string> => {
    if (!editingConnection) return '';
    return getLiveConnectionPassword(editingConnection.id).catch(() => '');
  };

  const filteredDrivers = filterDriversByQuery(DATABASE_DRIVERS, categoryFilter, searchQuery);

  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 font-sans select-none"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-modal-title"
        onSubmit={handleSaveConnection}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#232325] border border-white/10 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col text-xs"
      >
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: form.colorBadge }} />

        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-[#26262a] border-b border-white/10">
          <div className="flex items-center gap-3">
            <HeaderBadgeColorPicker
              labelSource={resolveBadgeLabelSource(form)}
              color={form.colorBadge}
              onSelectColor={(colorBadge) => updateForm({ colorBadge })}
            />
            <ModalHeaderTitle
              step={form.step}
              driverName={form.selectedDriver.name}
              isEditing={Boolean(editingConnection)}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center text-[#8e8e93] hover:text-white rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
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
            key={openSessionKey}
            form={form}
            isEditing={Boolean(editingConnection)}
            testStatus={testStatus}
            onChange={updateForm}
            onChangeDriver={() => updateForm({ step: 'pick' })}
            onApplyUri={(parsed) => setForm((prev) => mergeParsedUriIntoForm(prev, parsed))}
            onResolveSavedPassword={resolveSavedPassword}
          />
        )}

        <ModalFooter
          isConfigure={form.step === 'configure'}
          isEditing={Boolean(editingConnection)}
          isTesting={Boolean(testStatus?.testing)}
          isSaving={isSaving}
          onTest={handleTestConnection}
          onCancel={onClose}
        />
      </form>
    </div>
  );
};
