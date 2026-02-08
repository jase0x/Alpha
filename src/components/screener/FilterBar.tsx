'use client';

import { RefObject } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
  TrendingDown,
  Bookmark,
  Layers,
  Settings2,
  Download,
  SlidersHorizontal,
  Crosshair,
  ArrowLeftRight,
  Menu,
} from 'lucide-react';
import { FilterView, TimeFilter } from '@/types/token';

const filterTabs: {
  id: FilterView;
  label: string;
  icon: React.ComponentType<any>;
  activeColor: string;
}[] = [
  { id: 'all', label: 'All Pairs', icon: Layers, activeColor: 'text-xdex-accent bg-xdex-accent/10' },
  { id: 'new', label: 'New Pairs', icon: Flame, activeColor: 'text-xdex-orange bg-xdex-orange/10' },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp, activeColor: 'text-xdex-green bg-xdex-green/10' },
  { id: 'losers', label: 'Losers', icon: TrendingDown, activeColor: 'text-xdex-red bg-xdex-red/10' },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark, activeColor: 'text-xdex-yellow bg-xdex-yellow/10' },
];

interface FilterBarProps {
  activeView: FilterView;
  onViewChange: (view: FilterView) => void;
  pairCounts: Record<FilterView, number>;
  priceTimeFilter: TimeFilter;
  onTimeFilterChange: (tf: TimeFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  // Tool buttons
  isFiltersActive: boolean;
  showScreenerFilters: boolean;
  onToggleScreenerFilters: () => void;
  onCompare: () => void;
  onSniper: () => void;
  onExport: () => void;
  onColumnSettings: () => void;
  onMobileMenu: () => void;
}

export default function FilterBar({
  activeView,
  onViewChange,
  pairCounts,
  priceTimeFilter,
  onTimeFilterChange,
  searchQuery,
  onSearchChange,
  searchInputRef,
  isFiltersActive: filtersActive,
  showScreenerFilters,
  onToggleScreenerFilters,
  onCompare,
  onSniper,
  onExport,
  onColumnSettings,
  onMobileMenu,
}: FilterBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[#222] bg-xdex-bg">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenu}
          className="md:hidden p-1 rounded-md text-xdex-text-muted hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-white tracking-tight">Alpha</span>
        </div>
        <div className="flex items-center gap-1 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
          <span className="text-[11px] text-xdex-green font-medium">LIVE</span>
        </div>

        <div className="w-px h-5 bg-xdex-border/60 mx-1 hidden sm:block" />

        {/* Filter tabs */}
        <div className="hidden sm:flex items-center gap-1 bg-black rounded-xl p-1 border border-xdex-accent/25">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            const count = pairCounts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  isActive
                    ? `${tab.activeColor} border border-xdex-accent/30`
                    : 'text-xdex-text-secondary hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="hidden md:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-xdex-accent/15' : 'bg-xdex-accent/10'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-px h-6 bg-xdex-accent/20 mx-1.5 hidden sm:block" />

        {/* Timeframe toggle */}
        <div className="hidden sm:flex items-center bg-black rounded-xl p-1 border border-xdex-accent/25">
          {([
            { value: '5m' as TimeFilter, label: '5M' },
            { value: '1h' as TimeFilter, label: '1H' },
            { value: '6h' as TimeFilter, label: '6H' },
            { value: '24h' as TimeFilter, label: '24H' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTimeFilterChange(opt.value)}
              className={`px-3 py-1.5 text-[13px] font-bold rounded-lg transition-all ${
                priceTimeFilter === opt.value
                  ? 'bg-xdex-accent text-white'
                  : 'text-xdex-text-secondary hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Inline search */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black border border-xdex-accent/15 focus-within:border-xdex-accent/40 transition-colors">
          <Search size={12} className="text-xdex-text-muted flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-[13px] text-white placeholder:text-xdex-text-muted outline-none w-28 focus:w-40 transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="text-xdex-text-muted hover:text-white text-xs">
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Right: Tools */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleScreenerFilters}
          className={`p-1.5 rounded-lg transition-colors ${
            showScreenerFilters || filtersActive
              ? 'text-xdex-accent bg-xdex-accent/10'
              : 'text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10'
          }`}
          title="Screener filters"
        >
          <SlidersHorizontal size={14} />
        </button>
        <button onClick={onCompare} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors" title="Compare tokens">
          <ArrowLeftRight size={14} />
        </button>
        <button onClick={onSniper} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors" title="Pair Sniper">
          <Crosshair size={14} />
        </button>
        <button onClick={onExport} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors" title="Export CSV (E)">
          <Download size={14} />
        </button>
        <button onClick={onColumnSettings} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors" title="Column settings">
          <Settings2 size={14} />
        </button>
      </div>
    </div>
  );
}
