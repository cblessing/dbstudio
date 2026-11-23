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
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

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

function DriverPickerStep({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  drivers,
  onSelectDriver,
}: {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: 'all' | 'relational' | 'analytical' | 'nosql';
  onCategoryChange: (cat: 'all' | 'relational' | 'analytical' | 'nosql') => void;
  drivers: DatabaseDriverInfo[];
  onSelectDriver: (driver: DatabaseDriverInfo) => void;
}) {
  return (
    <div className="flex flex-col p-5 gap-4 max-h-[75vh] overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#858585]" />
          <input
            type="text"
            placeholder="Search database engines (Postgres, DuckDB, MySQL, SQLite, Redis...)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded-lg px-3 pl-8 py-2 text-white outline-none"
            aria-label="Search database engines"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c] shrink-0">
          {(['all', 'relational', 'analytical', 'nosql'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#007acc] text-white'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            onClick={() => onSelectDriver(driver)}
            className="flex items-start gap-3 p-3 bg-[#1e1e1e] border border-[#333333] hover:border-[#007acc] hover:bg-[#2a2d2e] rounded-lg cursor-pointer transition-all group shadow-sm"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-white text-xs shadow-md"
              style={{ backgroundColor: driver.color }}
            >
              {driver.id.slice(0, 3).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-white group-hover:text-sky-300">
                  {driver.name}
                </span>
                <span className="bg-[#252526] text-[#858585] border border-[#3c3c3c] text-[9px] px-1.5 py-0.2 rounded capitalize">
                  {driver.category}
                </span>
              </div>
              <p className="text-[11px] text-[#858585] line-clamp-2 mt-0.5">
                {driver.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [testStatus, setTestStatus] = useState<TestConnectionStatus | null>(null);

  if (!isOpen) return null;

  const handleSelectDriver = (driver: DatabaseDriverInfo) => {
    setSelectedDriver(driver);
    setConnectionName(driver.name);
    setPort(driver.defaultPort);
    setSsl(driver.defaultPort > 0);
    setDatabase('');
    setTestStatus(null);
    setStep('configure');
  };

  const filteredDrivers = filterDriversByQuery(DATABASE_DRIVERS, categoryFilter, searchQuery);

  const handleTestConnection = () => {
    setTestStatus({ testing: true });
    setTimeout(() => {
      const isEmbedded = selectedDriver.defaultPort === 0;
      const latency = isEmbedded
        ? +(Math.random() * 0.8 + 0.2).toFixed(2)
        : +(Math.random() * 15 + 8).toFixed(1);
      const sslState = ssl ? 'Active' : 'Off';

      setTestStatus({
        testing: false,
        success: true,
        latencyMs: latency,
        message: isEmbedded
          ? `Connected successfully in ${latency}ms.`
          : `Connected to ${selectedDriver.name} at ${host}:${port} in ${latency}ms. SSL: ${sslState}.`,
      });
    }, 700);
  };

  const handleSaveConnection = () => {
    const newConn: DatabaseConnection = {
      id: `conn_${Date.now()}_${selectedDriver.id}`,
      name: connectionName ? connectionName : `${selectedDriver.name} Connection`,
      type: selectedDriver.id,
      host,
      port,
      database: database ? database : selectedDriver.id,
      username,
      ssl,
      colorBadge: selectedDriver.color,
      status: 'connected',
      pingMs: testStatus?.latencyMs ?? 1.2,
      version: selectedDriver.name,
      schemas: [buildDefaultSchemaForType(selectedDriver.id)],
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

                <div className="pt-5 flex items-center gap-2">
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
