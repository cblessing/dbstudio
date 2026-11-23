import React, { useState } from 'react';
import {
  DatabaseDriverInfo,
  DatabaseConnection,
} from '../../types/database';
import {
  DATABASE_DRIVERS,
  buildDefaultSchemaForType,
} from '../../engine/sqlEngineCore';
import {
  isVsCodeWebview,
  testLiveConnection,
  saveLiveConnection,
  introspectLiveSchema,
  LiveConnectionPayload,
} from '../../utils/liveBridge';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { DriverPickerStep } from './DriverPickerStep';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConnection: (newConn: DatabaseConnection) => void;
}

interface TestConnectionStatus {
  testing: boolean;
  success?: boolean;
  latencyMs?: number;
  message?: string;
}

function TestStatusBanner({ status }: { status: TestConnectionStatus }) {
  const styleClass = status.testing
    ? 'bg-sky-950/20 border-sky-800/40 text-sky-200'
    : status.success
    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
    : 'bg-rose-950/20 border-rose-800/40 text-rose-200';

  return (
    <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${styleClass}`}>
      {status.testing ? (
        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
      ) : status.success ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {status.testing ? 'Testing Connection...' : 'Connection Test'}
        </p>
        {status.message && (
          <p className="text-[11px] text-[#a0a0a0] mt-0.5">{status.message}</p>
        )}
      </div>
    </div>
  );
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
}: {
  step: 'pick' | 'configure';
  driverName: string;
}) {
  const isPick = step === 'pick';
  return (
    <div>
      <h3 className="font-bold text-white text-sm">
        {isPick ? 'Create New Database Connection' : `Configure ${driverName}`}
      </h3>
      <p className="text-[11px] text-[#858585]">
        {isPick
          ? 'Select a database engine to connect'
          : 'Specify connection parameters and driver properties'}
      </p>
    </div>
  );
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  onClose,
  onAddConnection,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<DatabaseDriverInfo>(DATABASE_DRIVERS[0]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'relational' | 'analytical' | 'nosql'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<'pick' | 'configure'>('pick');

  const [connectionName, setConnectionName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(0);
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(true);
  const [allowSelfSigned, setAllowSelfSigned] = useState(false);
  const [testStatus, setTestStatus] = useState<TestConnectionStatus | null>(null);

  if (!isOpen) return null;

  const handleSelectDriver = (driver: DatabaseDriverInfo) => {
    setSelectedDriver(driver);
    setConnectionName(driver.name);
    setPort(driver.defaultPort);
    setSsl(driver.defaultPort > 0);
    setAllowSelfSigned(false);
    setDatabase('');
    setTestStatus(null);
    setStep('configure');
  };

  const filteredDrivers = filterDriversByQuery(DATABASE_DRIVERS, categoryFilter, searchQuery);
  const canUseLiveDriver = isVsCodeWebview() && selectedDriver.defaultPort > 0;

  const buildLivePayload = (connId: string): LiveConnectionPayload => ({
    id: connId,
    type: selectedDriver.id,
    host: host.trim() || 'localhost',
    port: Number(port) || selectedDriver.defaultPort,
    database: database.trim() || selectedDriver.id,
    username: username.trim(),
    ssl,
    rejectUnauthorized: !allowSelfSigned,
  });

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    if (canUseLiveDriver) {
      try {
        const res = await testLiveConnection(buildLivePayload(`test_${selectedDriver.id}`), password);
        setTestStatus({
          testing: false,
          success: res.success,
          latencyMs: res.latencyMs,
          message: res.version ? `${res.message} ${res.version}` : res.message,
        });
      } catch (err) {
        setTestStatus({
          testing: false,
          success: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    setTimeout(() => {
      const isEmbedded = selectedDriver.defaultPort === 0;
      const latency = isEmbedded ? 0.4 : 12.5;
      setTestStatus({
        testing: false,
        success: true,
        latencyMs: latency,
        message: isEmbedded
          ? `Connected locally in ${latency}ms.`
          : `Local workspace mode: ${selectedDriver.name} (${host}:${port}, SSL: ${ssl ? 'On' : 'Off'}).`,
      });
    }, 300);
  };

  const handleSaveConnection = async () => {
    const connId = `conn_${Date.now()}_${selectedDriver.id}`;
    const defaultSchema = buildDefaultSchemaForType(selectedDriver.id);
    let schemas = [defaultSchema];
    let connectionMode: 'local' | 'live' = 'local';

    if (canUseLiveDriver) {
      await saveLiveConnection(buildLivePayload(connId), password);
      connectionMode = 'live';
      const liveTables = await introspectLiveSchema(connId).catch(() => []);
      if (liveTables.length > 0) {
        schemas = [{ ...defaultSchema, tables: liveTables }];
      }
    }

    const newConn: DatabaseConnection = {
      id: connId,
      name: connectionName ? connectionName : `${selectedDriver.name} Connection`,
      type: selectedDriver.id,
      host,
      port,
      database: database ? database : selectedDriver.id,
      username,
      ssl,
      rejectUnauthorized: !allowSelfSigned,
      connectionMode,
      colorBadge: selectedDriver.color,
      status: 'connected',
      pingMs: testStatus?.latencyMs ?? 1.2,
      version: selectedDriver.name,
      schemas,
    };

    onAddConnection(newConn);
    onClose();
  };

  const portSummary =
    selectedDriver.defaultPort > 0
      ? ` • Default Port: ${selectedDriver.defaultPort}`
      : ' • Embedded / In-Process';

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
            <ModalHeaderTitle step={step} driverName={selectedDriver.name} />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'pick' ? (
          <DriverPickerStep
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            drivers={filteredDrivers}
            onSelectDriver={handleSelectDriver}
          />
        ) : (
          <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded-lg border border-[#333333]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                  style={{ backgroundColor: selectedDriver.color }}
                >
                  {selectedDriver.id.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{selectedDriver.name}</h4>
                  <p className="text-[11px] text-[#858585] capitalize">
                    Category: {selectedDriver.category}
                    {portSummary}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep('pick')}
                className="text-sky-400 hover:underline text-[11px]"
              >
                Change Database Engine
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[#969696] mb-1 font-medium">Connection Name</label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none"
                  aria-label="Connection Name"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[#969696] mb-1 font-medium">Host / Server</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
                    aria-label="Host"
                  />
                </div>
                <div>
                  <label className="block text-[#969696] mb-1 font-medium">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
                    aria-label="Port"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#969696] mb-1 font-medium">Database / Catalog</label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
                    aria-label="Database Name"
                  />
                </div>
                <div>
                  <label className="block text-[#969696] mb-1 font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
                    aria-label="Username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[#969696] mb-1 font-medium">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
                    aria-label="Password"
                  />
                </div>

                <div className="pt-5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ssl_toggle"
                      checked={ssl}
                      onChange={(e) => setSsl(e.target.checked)}
                      className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#007acc] focus:ring-0"
                    />
                    <label
                      htmlFor="ssl_toggle"
                      className="text-[#cccccc] cursor-pointer flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Use SSL / TLS Encryption</span>
                    </label>
                  </div>
                  {ssl && (
                    <label className="flex items-center gap-2 text-[11px] text-[#969696] cursor-pointer pl-5">
                      <input
                        type="checkbox"
                        checked={allowSelfSigned}
                        onChange={(e) => setAllowSelfSigned(e.target.checked)}
                        className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#007acc] focus:ring-0"
                      />
                      <span>Allow self-signed certificate</span>
                    </label>
                  )}
                </div>
              </div>

              {testStatus && <TestStatusBanner status={testStatus} />}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 bg-[#2d2d2d] border-t border-[#3c3c3c]">
          {step === 'configure' ? (
            <button
              onClick={handleTestConnection}
              disabled={testStatus?.testing}
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
              onClick={onClose}
              className="px-3 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
            >
              Cancel
            </button>

            {step === 'configure' && (
              <button
                onClick={handleSaveConnection}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium rounded transition-colors"
                aria-label="Connect and Save Database"
              >
                <span>Connect</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
