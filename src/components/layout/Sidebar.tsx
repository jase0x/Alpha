'use client';

import { useState } from 'react';
import {
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Star,
  LayoutGrid,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FilterView } from '@/types/token';

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
  { id: 'all', label: 'All Pairs', icon: LayoutGrid },
  { id: 'new', label: 'New Pairs', icon: Sparkles },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp },
  { id: 'losers', label: 'Losers', icon: TrendingDown },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
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
      className={`flex flex-col h-full bg-xdex-surface border-r border-xdex-border transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-xdex-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-xdex-accent to-cyan-600 flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Alpha</span>
            <span className="text-[10px] text-xdex-text-muted ml-1.5 uppercase tracking-widest">
              by XDEX
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onSearchOpen}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-xdex-card border border-xdex-border text-xdex-text-secondary hover:border-xdex-accent/40 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Search size={16} />
          {!collapsed && (
            <>
              <span className="text-sm">Search pairs...</span>
              <span className="ml-auto text-[10px] text-xdex-text-muted border border-xdex-border rounded px-1.5 py-0.5">
                /
              </span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {!collapsed && (
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-xdex-text-muted font-semibold">
            Market
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = pairCounts[item.id];
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`sidebar-item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-xdex-accent/10 text-xdex-accent border-l-2 border-xdex-accent'
                  : 'text-xdex-text-secondary hover:text-xdex-text hover:bg-xdex-hover border-l-2 border-transparent'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                size={18}
                className={isActive ? 'text-xdex-accent' : ''}
              />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span
                      className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-xdex-accent/20 text-xdex-accent'
                          : 'bg-xdex-card text-xdex-text-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Chain filter at bottom */}
      <div className="px-3 pb-3 border-t border-xdex-border pt-3">
        {!collapsed && (
          <div className="px-1 pb-2 text-[10px] uppercase tracking-widest text-xdex-text-muted font-semibold">
            Chains
          </div>
        )}
        <div className={`flex ${collapsed ? 'flex-col items-center' : 'flex-col'} gap-1`}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-cyan-400 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition-colors">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            {!collapsed && <span>X1</span>}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-purple-400 bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            {!collapsed && <span>Solana</span>}
          </div>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-xdex-border text-xdex-text-muted hover:text-xdex-text transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
