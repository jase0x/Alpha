'use client';

import { useState, useCallback } from 'react';
import { X, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp, Shield } from 'lucide-react';

export interface ScreenerFilterValues {
  minLiquidity: number | null;
  maxLiquidity: number | null;
  minMcap: number | null;
  maxMcap: number | null;
  minVolume: number | null;
  maxVolume: number | null;
  minAge: number | null; // hours
  maxAge: number | null; // hours
  minSafety: number | null;
  maxSafety: number | null;
  minChange24h: number | null;
  maxChange24h: number | null;
  minMakers: number | null;
  minTxns: number | null;
  verifiedOnly: boolean;
  hideRugRisk: boolean;
}

export const DEFAULT_FILTERS: ScreenerFilterValues = {
  minLiquidity: null,
  maxLiquidity: null,
  minMcap: null,
  maxMcap: null,
  minVolume: null,
  maxVolume: null,
  minAge: null,
  maxAge: null,
  minSafety: null,
  maxSafety: null,
  minChange24h: null,
  maxChange24h: null,
  minMakers: null,
  minTxns: null,
  verifiedOnly: false,
  hideRugRisk: false,
};

export function isFiltersActive(f: ScreenerFilterValues): boolean {
  return (
    f.minLiquidity !== null || f.maxLiquidity !== null ||
    f.minMcap !== null || f.maxMcap !== null ||
    f.minVolume !== null || f.maxVolume !== null ||
    f.minAge !== null || f.maxAge !== null ||
    f.minSafety !== null || f.maxSafety !== null ||
    f.minChange24h !== null || f.maxChange24h !== null ||
    f.minMakers !== null || f.minTxns !== null ||
    f.verifiedOnly || f.hideRugRisk
  );
}

const PRESETS: { label: string; filters: Partial<ScreenerFilterValues> }[] = [
  { label: 'Safe Bets', filters: { minLiquidity: 10000, minSafety: 60, minMakers: 10, minTxns: 20 } },
  { label: 'Degen Plays', filters: { maxAge: 24, maxLiquidity: 5000, minChange24h: 10 } },
  { label: 'High Volume', filters: { minVolume: 50000, minLiquidity: 10000 } },
  { label: 'Fresh Pairs', filters: { maxAge: 6, minLiquidity: 500 } },
  { label: 'Blue Chips', filters: { minLiquidity: 100000, minMcap: 1000000, minSafety: 70 } },
];

interface Props {
  filters: ScreenerFilterValues;
  onChange: (f: ScreenerFilterValues) => void;
  onClose: () => void;
  matchCount: number;
}

function RangeInput({
  label,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
  prefix = '',
  suffix = '',
  placeholder = ['Min', 'Max'],
}: {
  label: string;
  minVal: number | null;
  maxVal: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: [string, string];
}) {
  return (
    <div>
      <label className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-1 block">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
          {prefix && <span className="text-[10px] text-xdex-text-muted">{prefix}</span>}
          <input
            type="number"
            placeholder={placeholder[0]}
            value={minVal ?? ''}
            onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : null)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0 no-spin"
            style={{ boxShadow: 'none' }}
          />
          {suffix && <span className="text-[10px] text-xdex-text-muted">{suffix}</span>}
        </div>
        <span className="text-[10px] text-xdex-text-muted">to</span>
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
          {prefix && <span className="text-[10px] text-xdex-text-muted">{prefix}</span>}
          <input
            type="number"
            placeholder={placeholder[1]}
            value={maxVal ?? ''}
            onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : null)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0 no-spin"
            style={{ boxShadow: 'none' }}
          />
          {suffix && <span className="text-[10px] text-xdex-text-muted">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ScreenerFilters({ filters, onChange, onClose, matchCount }: Props) {
  const [expanded, setExpanded] = useState(true);

  const update = useCallback(
    (patch: Partial<ScreenerFilterValues>) => onChange({ ...filters, ...patch }),
    [filters, onChange],
  );

  const applyPreset = (preset: Partial<ScreenerFilterValues>) => {
    onChange({ ...DEFAULT_FILTERS, ...preset });
  };

  return (
    <div className="border-b border-xdex-border bg-black/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-xdex-accent" />
          <span className="text-xs font-semibold text-white">Screener Filters</span>
          {isFiltersActive(filters) && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-xdex-accent/15 text-xdex-accent font-medium">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isFiltersActive(filters) && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={10} />
              Clear
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.filters)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-xdex-card/50 border border-xdex-border/40 text-xdex-text-secondary hover:border-xdex-accent/40 hover:text-xdex-accent transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RangeInput
              label="Liquidity"
              prefix="$"
              minVal={filters.minLiquidity}
              maxVal={filters.maxLiquidity}
              onMinChange={(v) => update({ minLiquidity: v })}
              onMaxChange={(v) => update({ maxLiquidity: v })}
            />
            <RangeInput
              label="Market Cap"
              prefix="$"
              minVal={filters.minMcap}
              maxVal={filters.maxMcap}
              onMinChange={(v) => update({ minMcap: v })}
              onMaxChange={(v) => update({ maxMcap: v })}
            />
            <RangeInput
              label="Volume 24h"
              prefix="$"
              minVal={filters.minVolume}
              maxVal={filters.maxVolume}
              onMinChange={(v) => update({ minVolume: v })}
              onMaxChange={(v) => update({ maxVolume: v })}
            />
            <RangeInput
              label="Age (hours)"
              suffix="h"
              minVal={filters.minAge}
              maxVal={filters.maxAge}
              onMinChange={(v) => update({ minAge: v })}
              onMaxChange={(v) => update({ maxAge: v })}
            />
            <RangeInput
              label="Safety Score"
              minVal={filters.minSafety}
              maxVal={filters.maxSafety}
              onMinChange={(v) => update({ minSafety: v })}
              onMaxChange={(v) => update({ maxSafety: v })}
              placeholder={['0', '100']}
            />
            <RangeInput
              label="24h Change %"
              suffix="%"
              minVal={filters.minChange24h}
              maxVal={filters.maxChange24h}
              onMinChange={(v) => update({ minChange24h: v })}
              onMaxChange={(v) => update({ maxChange24h: v })}
              placeholder={['-100', '+1000']}
            />
            <div>
              <label className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-1 block">Min Makers</label>
              <div className="flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minMakers ?? ''}
                  onChange={(e) => update({ minMakers: e.target.value ? Number(e.target.value) : null })}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0 no-spin"
                  style={{ boxShadow: 'none' }}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-1 block">Min Txns 24h</label>
              <div className="flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minTxns ?? ''}
                  onChange={(e) => update({ minTxns: e.target.value ? Number(e.target.value) : null })}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0 no-spin"
                  style={{ boxShadow: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Toggle filters */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => update({ verifiedOnly: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-xdex-border bg-black accent-xdex-accent"
              />
              <span className="text-[10px] text-xdex-text-secondary font-medium">Verified only</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hideRugRisk}
                onChange={(e) => update({ hideRugRisk: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-xdex-border bg-black accent-xdex-accent"
              />
              <Shield size={10} className="text-xdex-red" />
              <span className="text-[10px] text-xdex-text-secondary font-medium">Hide rug risk</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
