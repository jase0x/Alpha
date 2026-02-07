'use client';

import { useState } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
  TrendingDown,
  Bookmark,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FilterView } from '@/types/token';
import AlphaLogo from '@/components/ui/AlphaLogo';
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
  activeColor: string;
}[] = [
  { id: 'all', label: 'All Pairs', icon: Layers, activeColor: 'text-xdex-accent' },
  { id: 'new', label: 'New Pairs', icon: Flame, activeColor: 'text-orange-400' },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp, activeColor: 'text-xdex-green' },
  { id: 'losers', label: 'Losers', icon: TrendingDown, activeColor: 'text-xdex-red' },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark, activeColor: 'text-yellow-400' },
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
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center px-3 h-14 border-b border-xdex-border">
        <AlphaLogo size={collapsed ? 26 : 30} collapsed={collapsed} />
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <button
          onClick={onSearchOpen}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg bg-xdex-card border border-xdex-border/50 text-xdex-text-muted hover:text-xdex-text hover:border-xdex-border transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <Search size={14} className="flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs">Search tokens...</span>
              <span className="ml-auto text-[10px] bg-xdex-border/50 px-1.5 py-0.5 rounded text-xdex-text-muted">/</span>
            </>
          )}
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pb-1.5 pt-1">
          <span className="text-[10px] font-semibold text-xdex-text-muted uppercase tracking-widest">
            Screener
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = pairCounts[item.id];
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-lg mb-0.5 transition-all ${
                isActive
                  ? `${item.activeColor} bg-white/5`
                  : 'text-xdex-text-secondary hover:text-xdex-text hover:bg-white/[0.03]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.6} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {count > 0 && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/10'
                        : 'bg-xdex-border/40 text-xdex-text-muted'
                    }`}>
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Degen LaunchPad button */}
      <div className="px-3 pb-3">
        <button
          className={`flex items-center gap-2 w-full py-2.5 text-[13px] font-semibold text-white transition-all rounded-lg bg-gradient-to-r from-xdex-accent/20 to-xdex-accent/10 border border-xdex-accent/30 hover:border-xdex-accent/60 hover:from-xdex-accent/30 hover:to-xdex-accent/15 ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <DegenLogo size={18} color="#ffffff" />
          {!collapsed && <span>Degen LaunchPad</span>}
        </button>
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
