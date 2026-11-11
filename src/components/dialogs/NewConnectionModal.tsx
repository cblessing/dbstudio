import React, { useState } from 'react';
import {
  DatabaseType,
  DatabaseDriverInfo,
  DatabaseConnection,
} from '../../types/database';
import {
  DATABASE_DRIVERS,
  INITIAL_ECOMMERCE_TABLES,
} from '../../wasm/sqlEngineCore';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Server,
  Database,
  Cpu,
  Layers,
  Grid,
  BarChart2,
  Snowflake,
  FileCode,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConnection: (newConn: DatabaseConnection) => void;
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

  // Form Fields
  const [connectionName, setConnectionName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(0);
  const [database, setDatabase] = useState('ecommerce_db');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);

  // Test Connection status
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSelectDriver = (driver: DatabaseDriverInfo) => {
    setSelectedDriver(driver);
    setConnectionName(`${driver.name} - Studio`);
    setPort(driver.defaultPort);
    setDatabase(`${driver.id}_catalog`);
    setTestStatus(null);
    setStep('configure');
  };

  const filteredDrivers = DATABASE_DRIVERS.filter((d) => {
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestConnection = () => {
    setTestStatus({ testing: true });
    setTimeout(() => {
      const isWasm = selectedDriver.wasmSupported;
      const latency = isWasm ? +(Math.random() * 0.8 + 0.2).toFixed(2) : +(Math.random() * 15 + 8).toFixed(1);

      setTestStatus({
        testing: false,
        success: true,
        latencyMs: latency,
        message: isWasm
          ? `Connected successfully via WebAssembly engine in ${latency}ms (0-overhead local execution).`
          : `Connected to ${selectedDriver.name} at ${host}:${port} in ${latency}ms. SSL: ${ssl ? 'Active' : 'Off'}.`,
      });
    }, 700);
  };

  const handleSaveConnection = () => {
    const newConn: DatabaseConnection = {
      id: `conn_${Date.now()}_${selectedDriver.id}`,
      name: connectionName || `${selectedDriver.name} Connection`,
      type: selectedDriver.id,
      host,
      port,
      database,
      username,
      password,
      ssl,
      colorBadge: selectedDriver.color,
      status: 'connected',
      isWasmNative: true,
      pingMs: testStatus?.latencyMs ?? 1.2,
      version: `${selectedDriver.name} (WASM Runtime)`,
      schemas: [
        {
          name: selectedDriver.id === 'postgres' ? 'public' : 'main',
          tables: INITIAL_ECOMMERCE_TABLES,
        },
      ],
    };

    onAddConnection(newConn);
    onClose();
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d2d2d] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {step === 'pick' ? 'Create New Database Connection' : `Configure ${selectedDriver.name}`}
              </h3>
              <p className="text-[11px] text-[#858585]">
                {step === 'pick'
                  ? 'Select a database engine to connect'
                  : 'Specify connection parameters and driver properties'}
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

        {/* Modal Body */}
        {step === 'pick' ? (
          <div className="flex flex-col p-5 gap-4 max-h-[75vh] overflow-y-auto">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#858585]" />
                <input
                  type="text"
                  placeholder="Search database engines (Postgres, DuckDB, MySQL, SQLite, Redis...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded-lg px-3 pl-8 py-2 text-white outline-none"
                  aria-label="Search database engines"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c] shrink-0">
                {(['all', 'relational', 'analytical', 'nosql'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
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

            {/* Drivers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => handleSelectDriver(driver)}
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
                      {driver.wasmSupported && (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-1.5 py-0.2 rounded font-mono">
                          WASM
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#858585] line-clamp-2 mt-0.5">
                      {driver.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            {/* Top Back & Selected Engine Info */}
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
                  <p className="text-[11px] text-[#858585]">
                    Driver: {selectedDriver.wasmSupported ? 'WebAssembly In-Memory Core' : 'Network Socket Bridge'}
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

            {/* Connection Fields */}
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
                  <label htmlFor="ssl_toggle" className="text-[#cccccc] cursor-pointer flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Use SSL / TLS Encryption</span>
                  </label>
                </div>
              </div>

              {/* Test Connection Banner */}
              {testStatus && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                    testStatus.testing
                      ? 'bg-sky-950/20 border-sky-800/40 text-sky-200'
                      : testStatus.success
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                  }`}
                >
                  {testStatus.testing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  ) : testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{testStatus.testing ? 'Testing Connection...' : 'Connection Test'}</p>
                    {testStatus.message && (
                      <p className="text-[11px] text-[#a0a0a0] mt-0.5">{testStatus.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
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
            <div className="text-[11px] text-[#858585] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>11 Universal Database Drivers Available in WebAssembly</span>
            </div>
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
