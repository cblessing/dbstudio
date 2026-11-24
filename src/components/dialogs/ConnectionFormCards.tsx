import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Pencil,
  Server,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import { DatabaseDriverInfo } from '../../types/database';
import { parseConnectionUri, ParsedConnectionUri } from '../../utils/connectionUri';

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
  colorBadge: string;
}

const STANDARD_16_COLORS = [
  { label: 'Slate', color: '#64748b' },
  { label: 'Red', color: '#ef4444' },
  { label: 'Orange', color: '#f97316' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Yellow', color: '#eab308' },
  { label: 'Lime', color: '#84cc16' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Emerald', color: '#10b981' },
  { label: 'Teal', color: '#14b8a6' },
  { label: 'Cyan', color: '#06b6d4' },
  { label: 'Sky', color: '#0ea5e9' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Indigo', color: '#6366f1' },
  { label: 'Violet', color: '#8b5cf6' },
  { label: 'Purple', color: '#a855f7' },
  { label: 'Pink', color: '#ec4899' },
];

export function HeaderBadgeColorPicker({
  labelSource,
  color,
  onSelectColor,
}: {
  labelSource: string;
  color: string;
  onSelectColor: (color: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeText = (labelSource.trim() || 'DBS').slice(0, 3).toUpperCase();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Choose connection badge color"
        title="Choose badge color"
        className="relative w-9 h-9 rounded-md flex items-center justify-center text-white font-bold text-[11px] tracking-tight shadow-sm ring-1 ring-white/15 hover:brightness-110 transition-all"
        style={{ backgroundColor: color }}
      >
        <span>{badgeText}</span>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#26262a] border border-white/25 flex items-center justify-center text-[#e4e4e7]">
          <ChevronDown className="w-2.5 h-2.5" />
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Badge colors"
          className="absolute left-0 top-full mt-2 p-2 rounded-lg bg-[#1e1e20] border border-white/15 shadow-2xl z-50 grid grid-cols-4 gap-1.5 w-36"
        >
          {STANDARD_16_COLORS.map((swatch) => {
            const selected = color.toLowerCase() === swatch.color.toLowerCase();
            return (
              <button
                key={swatch.label}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={swatch.label}
                title={swatch.label}
                onClick={() => {
                  onSelectColor(swatch.color);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded transition-transform ${
                  selected
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1e1e20] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: swatch.color }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export function UriImportCard({
  isOpen,
  onToggle,
  onApplyUri,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onApplyUri: (parsed: ParsedConnectionUri) => void;
}) {
  const [uriText, setUriText] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleApply = () => {
    const result = parseConnectionUri(uriText);
    if ('error' in result) {
      setFeedback({ ok: false, text: result.error });
      return;
    }
    onApplyUri(result.value);
    setFeedback({ ok: true, text: `Populated settings for ${result.value.host}.` });
  };

  return (
    <CollapsibleCard
      title="Paste Connection URI"
      icon={<Link2 className="w-3.5 h-3.5 text-emerald-400" />}
      badge="Quick Fill"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={uriText}
          onChange={(e) => setUriText(e.target.value)}
          placeholder="postgresql://user:password@127.0.0.1:5432/dbstudio?sslmode=require"
          aria-label="Connection URI"
          className={`${INPUT_CLASS} font-mono flex-1`}
        />
        <button
          type="button"
          onClick={handleApply}
          className="h-8 px-3 rounded-md bg-[#2b2b2f] hover:bg-[#38383f] border border-white/10 text-[#f1f1f1] font-medium shrink-0 transition-colors"
        >
          Parse URI
        </button>
      </div>
      {feedback && (
        <p className={`text-[11px] ${feedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
          {feedback.text}
        </p>
      )}
    </CollapsibleCard>
  );
}

export function ServerAuthCard({
  form,
  isEditing,
  isOpen,
  onToggle,
  onChange,
}: {
  form: ConnectionFormState;
  isEditing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ConnectionFormState>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <CollapsibleCard
      title="Server & Authentication"
      icon={<Server className="w-3.5 h-3.5 text-amber-400" />}
      badge={form.host ? `${form.host}:${form.port}` : undefined}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="conn_host_input" className="block text-[#a1a1aa] mb-1 font-medium">
            Host / Server
          </label>
          <input
            id="conn_host_input"
            type="text"
            value={form.host}
            onChange={(e) => onChange({ host: e.target.value })}
            placeholder="127.0.0.1"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="conn_port_input" className="block text-[#a1a1aa] mb-1 font-medium">
            Port
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="conn_db_input" className="block text-[#a1a1aa] mb-1 font-medium">
            Database / Catalog
          </label>
          <input
            id="conn_db_input"
            type="text"
            value={form.database}
            onChange={(e) => onChange({ database: e.target.value })}
            placeholder="dbstudio"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="conn_user_input" className="block text-[#a1a1aa] mb-1 font-medium">
            Username
          </label>
          <input
            id="conn_user_input"
            type="text"
            value={form.username}
            onChange={(e) => onChange({ username: e.target.value })}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="conn_pwd_input" className="block text-[#a1a1aa] mb-1 font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="conn_pwd_input"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder={isEditing ? 'Leave blank to keep saved password' : 'Enter password'}
            className={`${INPUT_CLASS} font-mono pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-white rounded"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </CollapsibleCard>
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <p className="text-[#e6e6e6] font-medium">Use SSL / TLS Encryption</p>
            <p className="text-[11px] text-[#8e8e93]">Encrypts traffic between VS Code and the database server.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.ssl}
          aria-label="Use SSL / TLS Encryption"
          onClick={() => onChange({ ssl: !form.ssl })}
          className={`w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
            form.ssl ? 'bg-[#007acc]' : 'bg-[#3a3a3e]'
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
              form.ssl ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {form.ssl && (
        <label className="flex items-start gap-2.5 pt-2 border-t border-white/5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.allowSelfSigned}
            onChange={(e) => onChange({ allowSelfSigned: e.target.checked })}
            className="mt-0.5 rounded bg-[#19191b] border-[#3a3a3e] text-[#007acc] focus:ring-0"
          />
          <div>
            <span className="text-[#d4d4d8] font-medium block">Allow self-signed certificate</span>
            <span className="text-[11px] text-[#8e8e93]">
              Enable for local Podman/dev containers. Keep unchecked for production CA certificates.
            </span>
          </div>
        </label>
      )}
    </CollapsibleCard>
  );
}
