import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  isDestructive?: boolean;
  isDivider?: boolean;
  action?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Ensure menu stays within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 28 + 20));

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, adjustedX)}px`, top: `${Math.max(10, adjustedY)}px` }}
      className="fixed z-50 min-w-[210px] bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl py-1 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
      role="menu"
      aria-label="Context Menu"
    >
      {items.map((item, idx) => {
        if (item.isDivider) {
          return <div key={`div_${idx}`} className="h-px bg-[#333333] my-1" />;
        }

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.action) item.action();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors text-left ${
              item.isDestructive
                ? 'hover:bg-rose-900/60 text-rose-300 hover:text-white'
                : 'hover:bg-[#007acc] text-[#cccccc] hover:text-white'
            }`}
            role="menuitem"
          >
            <div className="flex items-center gap-2 truncate">
              {item.icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-[10px] text-[#777777] font-mono ml-3 shrink-0">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
