import React from 'react';
import { Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { DatabaseDriverInfo } from '../../types/database';

export interface TestConnectionStatus {
  testing: boolean;
  success?: boolean;
  latencyMs?: number;
  message?: string;
}

export interface ConnectionFormState {
  selectedDriver: DatabaseDriverInfo;
  step: 'pick' | 'configure';
  connectionName: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  allowSelfSigned: boolean;
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

export function ConnectionConfigStep({
  form,
  isEditing,
  testStatus,
  onChange,
  onChangeDriver,
}: {
  form: ConnectionFormState;
  isEditing: boolean;
  testStatus: TestConnectionStatus | null;
  onChange: (patch: Partial<ConnectionFormState>) => void;
  onChangeDriver: () => void;
}) {
  const { selectedDriver } = form;
  const portSummary =
    selectedDriver.defaultPort > 0
      ? ` • Default Port: ${selectedDriver.defaultPort}`
      : ' • Embedded / In-Process';

  return (
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
        <button onClick={onChangeDriver} className="text-sky-400 hover:underline text-[11px]">
          Change Database Engine
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[#969696] mb-1 font-medium">Connection Name</label>
          <input
            type="text"
            value={form.connectionName}
            onChange={(e) => onChange({ connectionName: e.target.value })}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none"
            aria-label="Connection Name"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-[#969696] mb-1 font-medium">Host / Server</label>
            <input
              type="text"
              value={form.host}
              onChange={(e) => onChange({ host: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
              aria-label="Host"
            />
          </div>
          <div>
            <label className="block text-[#969696] mb-1 font-medium">Port</label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => onChange({ port: Number(e.target.value) })}
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
              value={form.database}
              onChange={(e) => onChange({ database: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
              aria-label="Database Name"
            />
          </div>
          <div>
            <label className="block text-[#969696] mb-1 font-medium">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => onChange({ username: e.target.value })}
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
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder={isEditing ? 'Leave blank to keep saved password' : '••••••••'}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded px-3 py-1.5 text-white outline-none font-mono"
              aria-label="Password"
            />
          </div>

          <div className="pt-5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ssl_toggle"
                checked={form.ssl}
                onChange={(e) => onChange({ ssl: e.target.checked })}
                className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#007acc] focus:ring-0"
              />
              <label htmlFor="ssl_toggle" className="text-[#cccccc] cursor-pointer flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Use SSL / TLS Encryption</span>
              </label>
            </div>
            {form.ssl && (
              <label className="flex items-center gap-2 text-[11px] text-[#969696] cursor-pointer pl-5">
                <input
                  type="checkbox"
                  checked={form.allowSelfSigned}
                  onChange={(e) => onChange({ allowSelfSigned: e.target.checked })}
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
  );
}
