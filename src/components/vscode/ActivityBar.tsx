import React from 'react';
import {
  Database,
  Files,
  Search,
  GitBranch,
  Boxes,
  Settings,
  HelpCircle,
  Code2,
} from 'lucide-react';

interface ActivityBarProps {
  activeView: 'database' | 'explorer' | 'search' | 'extensions';
  setActiveView: (view: 'database' | 'explorer' | 'search' | 'extensions') => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  setActiveView,
  onOpenCommandPalette,
  onOpenSettings,
}) => {
  return (
    <div
      className="w-12 bg-[#181818] border-r border-[#2b2b2b] flex flex-col justify-between items-center py-2 select-none z-20 shrink-0"
      role="navigation"
      aria-label="Activity Bar"
    >
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Database Navigator Icon (Primary) */}
        <button
          onClick={() => setActiveView('database')}
          title="Database Navigator (Ctrl+Shift+D)"
          aria-label="Database Navigator"
          className={`relative w-10 h-10 rounded flex items-center justify-center transition-colors group ${
            activeView === 'database'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeView === 'database' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#007acc] rounded-r" />
          )}
          <div className="relative">
            <Database className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-[#e056fd] text-white px-1 rounded-full scale-75">
              W
            </span>
          </div>
        </button>

        {/* Files / Workspace Explorer */}
        <button
          onClick={() => setActiveView('explorer')}
          title="Explorer (SQL Scripts & Workspaces)"
          aria-label="Explorer"
          className={`relative w-10 h-10 rounded flex items-center justify-center transition-colors ${
            activeView === 'explorer'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeView === 'explorer' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#007acc] rounded-r" />
          )}
          <Files className="w-5 h-5" />
        </button>

        {/* Search */}
        <button
          onClick={() => setActiveView('search')}
          title="Search Database Objects (Ctrl+Shift+F)"
          aria-label="Search Database Objects"
          className={`relative w-10 h-10 rounded flex items-center justify-center transition-colors ${
            activeView === 'search'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeView === 'search' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#007acc] rounded-r" />
          )}
          <Search className="w-5 h-5" />
        </button>

        {/* Extensions */}
        <button
          onClick={() => setActiveView('extensions')}
          title="Extensions: WebAssembly Database Studio"
          aria-label="Extensions"
          className={`relative w-10 h-10 rounded flex items-center justify-center transition-colors ${
            activeView === 'extensions'
              ? 'text-white'
              : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {activeView === 'extensions' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#007acc] rounded-r" />
          )}
          <Boxes className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        {/* Quick Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+P / F1)"
          aria-label="Command Palette"
          className="w-10 h-10 rounded flex items-center justify-center text-[#858585] hover:text-[#cccccc] transition-colors"
        >
          <Code2 className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Manage Database Preferences"
          aria-label="Settings"
          className="w-10 h-10 rounded flex items-center justify-center text-[#858585] hover:text-[#cccccc] transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
