import React from 'react';
import { Search } from 'lucide-react';
import { DatabaseDriverInfo } from '../../types/database';

export function DriverPickerStep({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  drivers,
  onSelectDriver,
}: {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: 'all' | 'relational' | 'analytical' | 'nosql';
  onCategoryChange: (cat: 'all' | 'relational' | 'analytical' | 'nosql') => void;
  drivers: DatabaseDriverInfo[];
  onSelectDriver: (driver: DatabaseDriverInfo) => void;
}) {
  return (
    <div className="flex flex-col p-5 gap-4 max-h-[75vh] overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#858585]" />
          <input
            type="text"
            placeholder="Search database engines (Postgres, DuckDB, MySQL, SQLite, Redis...)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded-lg px-3 pl-8 py-2 text-white outline-none"
            aria-label="Search database engines"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c] shrink-0">
          {(['all', 'relational', 'analytical', 'nosql'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            onClick={() => onSelectDriver(driver)}
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
                <span className="bg-[#252526] text-[#858585] border border-[#3c3c3c] text-[9px] px-1.5 py-0.2 rounded capitalize">
                  {driver.category}
                </span>
              </div>
              <p className="text-[11px] text-[#858585] line-clamp-2 mt-0.5">
                {driver.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
