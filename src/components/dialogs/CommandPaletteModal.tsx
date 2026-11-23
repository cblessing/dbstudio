import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 p-4 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-xs"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <Search className="w-4 h-4 text-[#858585] mr-2 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search database actions... (e.g. New Connection, ER Diagram)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-white outline-none text-sm placeholder-[#6e6e6e]"
            aria-label="Command search input"
          />
          <span className="text-[10px] text-[#858585] bg-[#2d2d2d] px-1.5 py-0.5 rounded border border-[#3c3c3c]">
            ESC
          </span>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[#858585]">No matching commands found.</div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-white' : 'text-[#858585]'}>
                      {cmd.icon}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-black/20 text-sky-200' : 'bg-[#1e1e1e] text-[#858585]'
                      }`}>
                        {cmd.category}
                      </span>
                      <span className="font-medium truncate">{cmd.title}</span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-[#1e1e1e] text-[#858585]'
                      }`}
                    >
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
