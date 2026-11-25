import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Shield, Terminal } from 'lucide-react';
import { SshAuthMethod } from '../../types/database';
import { CollapsibleCard, ConnectionFormState } from './ConnectionFormCards';

const INPUT_CLASS =
  'w-full bg-[#19191b] border border-[#3a3a3e] focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30 rounded px-2.5 py-1.5 text-[#f1f1f1] placeholder-[#6e6e73] outline-none transition-all text-xs';

const AUTH_OPTIONS: ReadonlyArray<{ id: SshAuthMethod; label: string }> = [
  { id: 'privateKey', label: 'Private Key' },
  { id: 'agent', label: 'SSH Agent' },
  { id: 'password', label: 'Password' },
];

function SshSecretInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[#a1a1aa] mb-1 font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${INPUT_CLASS} font-mono pr-9`}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-white rounded"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function SshAuthDetails({
  form,
  onChange,
}: {
  form: ConnectionFormState;
  onChange: (patch: Partial<ConnectionFormState>) => void;
}) {
  if (form.sshAuthMethod === 'agent') {
    return (
      <div className="p-2.5 rounded-md bg-[#19191b] border border-white/10 text-[11px] text-[#a1a1aa] flex items-start gap-2">
        <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
        <span>
          Uses your local SSH agent (Windows OpenSSH Agent pipe or{' '}
          <code className="text-[#e6e6e6] font-mono">SSH_AUTH_SOCK</code> on macOS/Linux).
        </span>
      </div>
    );
  }

  if (form.sshAuthMethod === 'password') {
    return (
      <SshSecretInput
        id="ssh_pwd_input"
        label="SSH Password"
        value={form.sshSecret}
        placeholder="Enter bastion SSH password"
        onChange={(sshSecret) => onChange({ sshSecret })}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label htmlFor="ssh_key_path_input" className="block text-[#a1a1aa] mb-1 font-medium">
          Private Key Path
        </label>
        <input
          id="ssh_key_path_input"
          type="text"
          value={form.sshPrivateKeyPath}
          onChange={(e) => onChange({ sshPrivateKeyPath: e.target.value })}
          placeholder="~/.ssh/id_ed25519"
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>

      <SshSecretInput
        id="ssh_passphrase_input"
        label="Key Passphrase (optional)"
        value={form.sshSecret}
        placeholder="Leave blank if key has no passphrase"
        onChange={(sshSecret) => onChange({ sshSecret })}
      />
    </div>
  );
}

export function SshTunnelCard({
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
  const badge = form.sshEnabled
    ? form.sshHost
      ? `${form.sshHost}:${form.sshPort}`
      : 'Enabled'
    : 'Direct';

  return (
    <CollapsibleCard
      title="SSH Tunnel (Bastion Host)"
      icon={<KeyRound className="w-3.5 h-3.5 text-purple-400" />}
      badge={badge}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[#e6e6e6] font-medium">Use SSH Tunnel / Bastion Host</p>
            <p className="text-[11px] text-[#8e8e93]">
              Forward database traffic through a jump host over SSH.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.sshEnabled}
          aria-label="Use SSH Tunnel / Bastion Host"
          onClick={() => onChange({ sshEnabled: !form.sshEnabled })}
          className={`w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
            form.sshEnabled ? 'bg-[#007acc]' : 'bg-[#3a3a3e]'
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
              form.sshEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {form.sshEnabled && (
        <div className="space-y-2.5 pt-2.5 border-t border-white/5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="ssh_host_input" className="block text-[#a1a1aa] mb-1 font-medium">
                Bastion Host
              </label>
              <input
                id="ssh_host_input"
                type="text"
                value={form.sshHost}
                onChange={(e) => onChange({ sshHost: e.target.value })}
                placeholder="bastion.example.com"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="ssh_port_input" className="block text-[#a1a1aa] mb-1 font-medium">
                SSH Port
              </label>
              <input
                id="ssh_port_input"
                type="number"
                value={form.sshPort}
                onChange={(e) => onChange({ sshPort: Number(e.target.value) })}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ssh_user_input" className="block text-[#a1a1aa] mb-1 font-medium">
              SSH Username
            </label>
            <input
              id="ssh_user_input"
              type="text"
              value={form.sshUsername}
              onChange={(e) => onChange({ sshUsername: e.target.value })}
              placeholder="bastion"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[#a1a1aa] mb-1 font-medium">
              <Lock className="w-3 h-3" />
              Authentication Method
            </span>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#19191b] border border-[#3a3a3e] rounded-md">
              {AUTH_OPTIONS.map((opt) => {
                const active = form.sshAuthMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ sshAuthMethod: opt.id, sshSecret: '' })}
                    className={`py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#007acc] text-white shadow-sm'
                        : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <SshAuthDetails form={form} onChange={onChange} />
        </div>
      )}
    </CollapsibleCard>
  );
}
