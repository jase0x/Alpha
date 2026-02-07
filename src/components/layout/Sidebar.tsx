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
      className={`flex flex-col h-full bg-xdex-menu-bg border-r border-xdex-border transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-xdex-border">
        {/* XDEX Hexagon X Logo */}
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 3L93 27V73L50 97L7 73V27L50 3Z" stroke="url(#hex-grad)" strokeWidth="6" fill="none"/>
            <path d="M30 30L45 50L30 70" stroke="url(#x-grad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M70 30L55 50L70 70" stroke="url(#x-grad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="hex-grad" x1="10" y1="10" x2="90" y2="90">
                <stop offset="0%" stopColor="#0566ea"/>
                <stop offset="100%" stopColor="#22a6f5"/>
              </linearGradient>
              <linearGradient id="x-grad" x1="30" y1="30" x2="70" y2="70">
                <stop offset="0%" stopColor="#0566ea"/>
                <stop offset="100%" stopColor="#22a6f5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        {!collapsed && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-white tracking-tight">Alpha</span>
            <span className="text-[9px] text-xdex-text-muted uppercase tracking-widest">
              XDEX
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-2.5 pt-3 pb-1.5">
        <button
          onClick={onSearchOpen}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xdex-text-muted hover:text-xdex-text transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Search size={15} />
          {!collapsed && (
            <>
              <span className="text-sm">Search...</span>
              <span className="ml-auto text-[10px] text-xdex-text-muted opacity-60">
                /
              </span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = pairCounts[item.id];
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-[13px] transition-colors ${
                isActive
                  ? 'text-xdex-accent'
                  : 'text-xdex-text-secondary hover:text-xdex-text'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
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

      {/* Chain indicators */}
      <div className="px-3 pb-3 pt-2 border-t border-xdex-border">
        <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'flex-col gap-1'}`}>
          <div className="flex items-center gap-2 px-1 py-1 text-xs text-xdex-text-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-xdex-accent" />
            {!collapsed && <span>X1</span>}
          </div>
          <div className="flex items-center gap-2 px-1 py-1 text-xs text-xdex-text-secondary">
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
