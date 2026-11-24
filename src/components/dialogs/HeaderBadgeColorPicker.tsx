import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const STANDARD_16_COLORS = [
  { label: 'Slate', color: '#64748b' }, { label: 'Red', color: '#ef4444' },
  { label: 'Orange', color: '#f97316' }, { label: 'Amber', color: '#f59e0b' },
  { label: 'Yellow', color: '#eab308' }, { label: 'Lime', color: '#84cc16' },
  { label: 'Green', color: '#22c55e' }, { label: 'Emerald', color: '#10b981' },
  { label: 'Teal', color: '#14b8a6' }, { label: 'Cyan', color: '#06b6d4' },
  { label: 'Sky', color: '#0ea5e9' }, { label: 'Blue', color: '#3b82f6' },
  { label: 'Indigo', color: '#6366f1' }, { label: 'Violet', color: '#8b5cf6' },
  { label: 'Purple', color: '#a855f7' }, { label: 'Pink', color: '#ec4899' },
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
