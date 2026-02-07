'use client';

import { useState } from 'react';
import {
  Search,
  Flame,
  ArrowUpCircle,
  ArrowDownCircle,
  Bookmark,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FilterView } from '@/types/token';
import DegenLogo from '@/components/ui/DegenLogo';

interface SidebarProps {
  activeView: FilterView;
  onViewChange: (view: FilterView) => void;
  onSearchOpen: () => void;
  pairCounts: {
    all: number;
    new: number;
    gainers: number;
    losers: number;
    watchlist: number;
  };
}

const navItems: {
  id: FilterView;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { id: 'all', label: 'All Pairs', icon: Layers },
  { id: 'new', label: 'New Pairs', icon: Flame },
  { id: 'gainers', label: 'Gainers', icon: ArrowUpCircle },
  { id: 'losers', label: 'Losers', icon: ArrowDownCircle },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
];

export default function Sidebar({
  activeView,
  onViewChange,
  onSearchOpen,
  pairCounts,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col h-full bg-black border-r border-xdex-border transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-xdex-border">
        <DegenLogo size={collapsed ? 28 : 32} />
        {!collapsed && (
          <span className="text-base font-bold text-white tracking-tight">Alpha</span>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-xdex-border">
        <button
          onClick={onSearchOpen}
          className={`flex items-center gap-2 w-full text-xdex-text-muted hover:text-xdex-text transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Search size={15} className="flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="text-sm">Search...</span>
              <span className="ml-auto text-[10px] text-xdex-text-muted opacity-50">/</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = pairCounts[item.id];
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] transition-colors ${
                isActive
                  ? 'text-xdex-accent'
                  : 'text-xdex-text-secondary hover:text-xdex-text'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span className="ml-auto text-[11px] text-xdex-text-muted">
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Launch Token button */}
      <div className="px-3 pb-3">
        <button
          className={`flex items-center gap-2 w-full py-2.5 text-[13px] font-medium text-xdex-accent hover:text-white transition-colors border border-xdex-border rounded-lg hover:border-xdex-accent/40 ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <DegenLogo size={18} color="#0566ea" />
          {!collapsed && <span>Launch Token</span>}
        </button>
      </div>

      {/* Chain indicators */}
      <div className="px-4 pb-3 pt-3 border-t border-xdex-border">
        <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'flex-col gap-1.5'}`}>
          <div className="flex items-center gap-2 text-xs text-xdex-text-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-xdex-accent" />
            {!collapsed && <span>X1</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-xdex-text-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-xdex-text-muted" />
            {!collapsed && <span>Solana</span>}
          </div>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-9 border-t border-xdex-border text-xdex-text-muted hover:text-xdex-text transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
