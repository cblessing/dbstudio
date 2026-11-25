import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Server,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import {
  buildConnectionUri,
  parseConnectionUri,
  ParsedConnectionUri,
} from '../../utils/connectionUri';
import {
  ConnectionFormState,
  getConnectionFieldLabels,
} from '../../utils/connectionLabels';

export type { ConnectionFormState };

const INPUT_CLASS =
  'w-full bg-[#19191b] border border-[#3a3a3e] focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30 rounded px-2.5 py-1.5 text-[#f1f1f1] placeholder-[#6e6e73] outline-none transition-all text-xs';

export function CollapsibleCard({
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.04] transition-colors text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-[#e6e6e6] text-xs">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#8e8e93]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#8e8e93]" />
          )}
          {icon}
          <span>{title}</span>
        </span>
        {badge && (
          <span className="text-[11px] text-[#8e8e93] truncate max-w-[180px]">
            {badge}
          </span>
        )}
      </button>
      {isOpen && <div className="px-4 pb-3 pt-1 space-y-2.5">{children}</div>}
    </section>
  );
}

export function GeneralCard({
  form,
  isOpen,
  onToggle,
  onChange,
  onChangeDriver,
}: {
  form: ConnectionFormState;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ConnectionFormState>) => void;
  onChangeDriver: () => void;
}) {
  const { selectedDriver } = form;
  const portSummary = selectedDriver.defaultPort > 0 ? `Port ${selectedDriver.defaultPort}` : 'Embedded';

  return (
    <CollapsibleCard
      title="General"
      icon={<SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />}
      badge={selectedDriver.name}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex items-center justify-between p-2 bg-[#19191b] rounded-md border border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-[10px] shrink-0 shadow-sm"
            style={{ backgroundColor: form.colorBadge }}
          >
            {selectedDriver.id.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-[#f1f1f1] truncate">{selectedDriver.name}</h4>
            <p className="text-[11px] text-[#8e8e93] capitalize">
              {selectedDriver.category} • {portSummary}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onChangeDriver}
          title="Change Database Engine"
          aria-label="Change Database Engine"
          className="h-7 w-7 flex items-center justify-center rounded-md bg-[#2b2b2f] hover:bg-[#36363c] border border-white/10 text-[#d4d4d8] hover:text-white transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label htmlFor="conn_name_input" className="block text-[#a1a1aa] mb-1 font-medium">
          Connection Name
        </label>
        <input
          id="conn_name_input"
          type="text"
          value={form.connectionName}
          onChange={(e) => onChange({ connectionName: e.target.value })}
          placeholder={`e.g. Local ${selectedDriver.name}`}
          className={INPUT_CLASS}
        />
      </div>
    </CollapsibleCard>
  );
}

function ConnectionUriField({
  form,
  isEditing,
  label,
  placeholder,
  onApplyUri,
  onResolveSavedPassword,
}: {
  form: ConnectionFormState;
  isEditing: boolean;
  label: string;
  placeholder: string;
  onApplyUri: (parsed: ParsedConnectionUri) => void;
  onResolveSavedPassword?: () => Promise<string>;
}) {
  const uriInput = {
    type: form.selectedDriver.id,
    host: form.host,
    port: form.port,
    database: form.database,
    username: form.username,
    password: form.password,
    ssl: form.ssl,
    allowSelfSigned: form.allowSelfSigned,
    hasSavedPassword: isEditing,
  };
  const maskedUri = buildConnectionUri(uriInput, true);

  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [uriError, setUriError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const commitUriDraft = (raw: string) => {
    const result = parseConnectionUri(raw);
    if ('error' in result) {
      setUriError(result.error);
      return;
    }
    setUriError(null);
    onApplyUri(result.value);
  };

  const handleCopy = async () => {
    const pwd = form.password || (onResolveSavedPassword ? await onResolveSavedPassword() : '');
    const fullUri = buildConnectionUri({ ...uriInput, password: pwd }, false);
    await navigator.clipboard?.writeText(fullUri).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <label htmlFor="conn_uri_input" className="block text-[#a1a1aa] mb-1 font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id="conn_uri_input"
          type="text"
          value={draftUri ?? maskedUri}
          onFocus={() => setDraftUri(maskedUri)}
          onChange={(e) => {
            setDraftUri(e.target.value);
            commitUriDraft(e.target.value);
          }}
          onBlur={() => {
            setDraftUri(null);
            setUriError(null);
          }}
          placeholder={placeholder}
          className={`${INPUT_CLASS} font-mono pr-9`}
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy full connection URI"
          title={copied ? 'Copied!' : 'Copy full URI (including credentials)'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-white rounded"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      {uriError && <p className="text-[11px] text-rose-400 mt-1">{uriError}</p>}
    </div>
  );
}

function resolvePasswordDisplay(
  value: string,
  isEditing: boolean,
  showPassword: boolean,
  isFocused: boolean
): { inputType: 'text' | 'password'; displayValue: string; placeholder: string } {
  const showMaskedStars = !showPassword && !isFocused && (Boolean(value) || isEditing);
  return {
    inputType: showPassword || showMaskedStars ? 'text' : 'password',
    displayValue: showMaskedStars ? '*******' : value,
    placeholder: showPassword ? 'Enter password' : '*******',
  };
}

function PasswordField({
  value,
  isEditing,
  label,
  onChange,
  onResolveSavedPassword,
}: {
  value: string;
  isEditing: boolean;
  label: string;
  onChange: (password: string) => void;
  onResolveSavedPassword?: () => Promise<string>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { inputType, displayValue, placeholder } = resolvePasswordDisplay(
    value,
    isEditing,
    showPassword,
    isFocused
  );
  const toggleLabel = showPassword ? 'Hide password' : 'Show password';

  const handleToggleShow = async () => {
    const nextShow = !showPassword;
    if (nextShow && !value && onResolveSavedPassword) {
      const saved = await onResolveSavedPassword();
      if (saved) onChange(saved);
    }
    setShowPassword(nextShow);
  };

  return (
    <div>
      <label htmlFor="conn_pwd_input" className="block text-[#a1a1aa] mb-1 font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id="conn_pwd_input"
          type={inputType}
          value={displayValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${INPUT_CLASS} font-mono pr-9`}
        />
        <button
          type="button"
          onClick={handleToggleShow}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-white rounded"
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function ServerAuthCard({
  form,
  isEditing,
  isOpen,
  onToggle,
  onChange,
  onApplyUri,
  onResolveSavedPassword,
}: {
  form: ConnectionFormState;
  isEditing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ConnectionFormState>) => void;
  onApplyUri: (parsed: ParsedConnectionUri) => void;
  onResolveSavedPassword?: () => Promise<string>;
}) {
  const labels = getConnectionFieldLabels(form.selectedDriver.id);

  return (
    <CollapsibleCard
      title="Server & Authentication"
      icon={<Server className="w-3.5 h-3.5 text-amber-400" />}
      badge={form.host ? `${form.host}:${form.port}` : undefined}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <ConnectionUriField
        form={form}
        isEditing={isEditing}
        label={labels.uriLabel}
        placeholder={labels.uriPlaceholder}
        onApplyUri={onApplyUri}
        onResolveSavedPassword={onResolveSavedPassword}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="conn_host_input" className="block text-[#a1a1aa] mb-1 font-medium">
            {labels.hostLabel}
          </label>
          <input
            id="conn_host_input"
            type="text"
            value={form.host}
            onChange={(e) => onChange({ host: e.target.value })}
            placeholder={labels.hostPlaceholder}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="conn_port_input" className="block text-[#a1a1aa] mb-1 font-medium">
            {labels.portLabel}
          </label>
          <input
            id="conn_port_input"
            type="number"
            value={form.port}
            onChange={(e) => onChange({ port: Number(e.target.value) })}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="conn_db_input" className="block text-[#a1a1aa] mb-1 font-medium">
          {labels.databaseLabel}
        </label>
        <input
          id="conn_db_input"
          type="text"
          value={form.database}
          onChange={(e) => onChange({ database: e.target.value })}
          placeholder={labels.databasePlaceholder}
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="conn_user_input" className="block text-[#a1a1aa] mb-1 font-medium">
            {labels.usernameLabel}
          </label>
          <input
            id="conn_user_input"
            type="text"
            value={form.username}
            onChange={(e) => onChange({ username: e.target.value })}
            placeholder={labels.usernamePlaceholder}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>

        <PasswordField
          value={form.password}
          isEditing={isEditing}
          label={labels.passwordLabel}
          onChange={(password) => onChange({ password })}
          onResolveSavedPassword={onResolveSavedPassword}
        />
      </div>
    </CollapsibleCard>
  );
}

function SecurityToggleRow({
  icon,
  title,
  description,
  checked,
  onToggle,
  bordered = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        bordered ? 'pt-2.5 border-t border-white/5' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-[#e6e6e6] font-medium">{title}</p>
          <p className="text-[11px] text-[#8e8e93]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        className={`w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
          checked ? 'bg-[#007acc]' : 'bg-[#3a3a3e]'
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function SecurityTlsCard({
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
      title="Security (SSL / TLS)"
      icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
      badge={form.ssl ? 'TLS Enabled' : 'Unencrypted'}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SecurityToggleRow
        icon={<Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
        title="Use SSL / TLS Encryption"
        description="Encrypts traffic between VS Code and the database server."
        checked={form.ssl}
        onToggle={() => onChange({ ssl: !form.ssl })}
      />

      {form.ssl && (
        <SecurityToggleRow
          icon={<Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          title="Allow self-signed certificate"
          description="Enable for local Podman/dev containers. Keep disabled for production CA certificates."
          checked={form.allowSelfSigned}
          onToggle={() => onChange({ allowSelfSigned: !form.allowSelfSigned })}
          bordered
        />
      )}
    </CollapsibleCard>
  );
}
