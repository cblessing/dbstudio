import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Server } from 'lucide-react';
import { ParsedConnectionUri } from '../../utils/connectionUri';
import { isNetworkDatabaseType } from '../../utils/liveBridge';
import {
  CollapsibleCard,
  ConnectionFormState,
  GeneralCard,
  ServerAuthCard,
  SecurityTlsCard,
} from './ConnectionFormCards';
import { SshTunnelCard } from './SshTunnelCard';

function EmbeddedDatabaseCard({
  form,
  isOpen,
  onToggle,
  onChange,
}: {
  form: ConnectionFormState;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ConnectionFormState>) => void;
}) {
  return (
    <CollapsibleCard
      title="Local Database"
      icon={<Server className="w-3.5 h-3.5 text-amber-400" />}
      badge={form.database || ':memory:'}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div>
        <label htmlFor="conn_embedded_db_input" className="block text-[#a1a1aa] mb-1 font-medium">
          Database File / Name
        </label>
        <input
          id="conn_embedded_db_input"
          type="text"
          value={form.database}
          onChange={(e) => onChange({ database: e.target.value })}
          placeholder=":memory: or local_database.db"
          className="w-full bg-[#19191b] border border-[#3a3a3e] focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30 rounded px-2.5 py-1.5 text-[#f1f1f1] placeholder-[#6e6e73] outline-none transition-all text-xs font-mono"
        />
        <p className="text-[11px] text-[#8e8e93] mt-1">
          Runs locally in-process with preloaded sample tables and views.
        </p>
      </div>
    </CollapsibleCard>
  );
}

export type { ConnectionFormState };

export interface TestConnectionStatus {
  testing: boolean;
  success?: boolean;
  latencyMs?: number;
  message?: string;
}

function TestStatusBanner({ status }: { status: TestConnectionStatus }) {
  const styleClass = status.testing
    ? 'bg-sky-950/30 border-sky-700/40 text-sky-200'
    : status.success
    ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-200'
    : 'bg-rose-950/30 border-rose-700/40 text-rose-200';

  return (
    <div role="status" className={`p-3 rounded-lg border flex items-center gap-2.5 ${styleClass}`}>
      {status.testing ? (
        <RefreshCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
      ) : status.success ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs">
          {status.testing ? 'Testing Connection...' : status.success ? 'Connection Succeeded' : 'Connection Failed'}
        </p>
        {status.message && (
          <p className="text-[11px] text-[#c7c7cc] mt-0.5 break-words">{status.message}</p>
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
  onApplyUri,
  onResolveSavedPassword,
}: {
  form: ConnectionFormState;
  isEditing: boolean;
  testStatus: TestConnectionStatus | null;
  onChange: (patch: Partial<ConnectionFormState>) => void;
  onChangeDriver: () => void;
  onApplyUri: (parsed: ParsedConnectionUri) => void;
  onResolveSavedPassword?: () => Promise<string>;
}) {
  const [openSections, setOpenSections] = useState({
    general: true,
    server: true,
    security: true,
    ssh: form.sshEnabled,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const isNetwork = isNetworkDatabaseType(form.selectedDriver.id);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10">
      <GeneralCard
        form={form}
        isOpen={openSections.general}
        onToggle={() => toggleSection('general')}
        onChange={onChange}
        onChangeDriver={onChangeDriver}
      />

      {isNetwork ? (
        <>
          <ServerAuthCard
            form={form}
            isEditing={isEditing}
            isOpen={openSections.server}
            onToggle={() => toggleSection('server')}
            onChange={onChange}
            onApplyUri={onApplyUri}
            onResolveSavedPassword={onResolveSavedPassword}
          />

          <SecurityTlsCard
            form={form}
            isOpen={openSections.security}
            onToggle={() => toggleSection('security')}
            onChange={onChange}
          />

          <SshTunnelCard
            form={form}
            isOpen={openSections.ssh}
            onToggle={() => toggleSection('ssh')}
            onChange={onChange}
          />
        </>
      ) : (
        <EmbeddedDatabaseCard
          form={form}
          isOpen={openSections.server}
          onToggle={() => toggleSection('server')}
          onChange={onChange}
        />
      )}

      {testStatus && (
        <div className="p-3">
          <TestStatusBanner status={testStatus} />
        </div>
      )}
    </div>
  );
}
