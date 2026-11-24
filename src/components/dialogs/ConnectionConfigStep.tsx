import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ParsedConnectionUri } from '../../utils/connectionUri';
import {
  ConnectionFormState,
  GeneralCard,
  ServerAuthCard,
  SecurityTlsCard,
} from './ConnectionFormCards';

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
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10">
      <GeneralCard
        form={form}
        isOpen={openSections.general}
        onToggle={() => toggleSection('general')}
        onChange={onChange}
        onChangeDriver={onChangeDriver}
      />

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

      {testStatus && (
        <div className="p-3">
          <TestStatusBanner status={testStatus} />
        </div>
      )}
    </div>
  );
}
