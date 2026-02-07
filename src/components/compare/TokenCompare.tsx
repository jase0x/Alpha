'use client';

import { useState, useMemo } from 'react';
import { X, Search, Plus, Trash2, ArrowLeftRight, Shield } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { computeSafetyScore } from '@/utils/safetyScore';
import { analyzeRugRisk } from '@/utils/rugDetector';
import {
  formatPrice,
  formatUsd,
  formatNumber,
  formatPercent,
  formatAge,
  getPercentColor,
} from '@/utils/format';

interface Props {
  tokens: TokenPair[];
  onClose: () => void;
  initialToken?: TokenPair | null;
}

const MAX_COMPARE = 4;

interface MetricRow {
  label: string;
  getValue: (t: TokenPair) => string;
  getColor?: (t: TokenPair) => string;
}

export default function TokenCompare({ tokens, onClose, initialToken }: Props) {
  const [selected, setSelected] = useState<TokenPair[]>(initialToken ? [initialToken] : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(!initialToken);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return tokens
      .filter(
        (t) =>
          !selected.some((s) => s.address === t.address) &&
          (t.baseToken.symbol.toLowerCase().includes(q) ||
            t.baseToken.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, tokens, selected]);

  const addToken = (t: TokenPair) => {
    if (selected.length >= MAX_COMPARE) return;
    setSelected((prev) => [...prev, t]);
    setSearchQuery('');
    setShowSearch(false);
  };

  const removeToken = (address: string) => {
    setSelected((prev) => prev.filter((t) => t.address !== address));
  };

  const metrics: MetricRow[] = [
    { label: 'Price', getValue: (t) => formatPrice(t.priceUsd) },
    {
      label: '5M Change',
      getValue: (t) => t.priceChange5m === 0 ? '—' : formatPercent(t.priceChange5m),
      getColor: (t) => getPercentColor(t.priceChange5m),
    },
    {
      label: '1H Change',
      getValue: (t) => t.priceChange1h === 0 ? '—' : formatPercent(t.priceChange1h),
      getColor: (t) => getPercentColor(t.priceChange1h),
    },
    {
      label: '24H Change',
      getValue: (t) => t.priceChange24h === 0 ? '—' : formatPercent(t.priceChange24h),
      getColor: (t) => getPercentColor(t.priceChange24h),
    },
    { label: 'Liquidity', getValue: (t) => formatUsd(t.liquidity) },
    { label: 'Market Cap', getValue: (t) => formatUsd(t.marketCap) },
    { label: 'FDV', getValue: (t) => formatUsd(t.fdv) },
    { label: 'Volume 24h', getValue: (t) => formatUsd(t.volume24h) },
    { label: 'Txns 24h', getValue: (t) => formatNumber(t.txns24h) },
    { label: 'Makers', getValue: (t) => formatNumber(t.makers) },
    { label: 'Age', getValue: (t) => formatAge(t.createdAt) },
    {
      label: 'Safety Score',
      getValue: (t) => {
        const s = computeSafetyScore(t);
        return `${s.score}/100 (${s.label})`;
      },
      getColor: (t) => computeSafetyScore(t).color,
    },
    {
      label: 'Rug Risk',
      getValue: (t) => {
        const r = analyzeRugRisk(t);
        return `${r.riskScore}/100 (${r.riskLevel})`;
      },
      getColor: (t) => analyzeRugRisk(t).color,
    },
    { label: 'LP Holders', getValue: (t) => formatNumber(t.lpHolderCount ?? t.makers) },
    {
      label: 'Vol/Liq Ratio',
      getValue: (t) => t.liquidity > 0 ? `${(t.volume24h / t.liquidity).toFixed(1)}x` : '—',
    },
  ];

  // Best-in-class highlight for each metric
  const bestIdx = useMemo(() => {
    if (selected.length < 2) return new Map<number, number>();
    const map = new Map<number, number>();
    // For these metrics, higher is better
    const higherBetter = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14];
    // For these metrics, lower is better (rug risk, age — lower createdAt = older = better)
    const lowerBetter = [10, 12];

    for (const mi of higherBetter) {
      let bestI = 0;
      let bestVal = -Infinity;
      for (let i = 0; i < selected.length; i++) {
        const raw = getRawValue(selected[i], mi);
        if (raw > bestVal) {
          bestVal = raw;
          bestI = i;
        }
      }
      if (bestVal !== -Infinity) map.set(mi, bestI);
    }
    for (const mi of lowerBetter) {
      let bestI = 0;
      let bestVal = Infinity;
      for (let i = 0; i < selected.length; i++) {
        const raw = getRawValue(selected[i], mi);
        if (raw < bestVal) {
          bestVal = raw;
          bestI = i;
        }
      }
      if (bestVal !== Infinity) map.set(mi, bestI);
    }
    return map;
  }, [selected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-black border border-xdex-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-xdex-border">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={14} className="text-xdex-accent" />
            <span className="text-sm font-bold text-white">Compare Tokens</span>
            <span className="text-[10px] text-xdex-text-muted">(up to {MAX_COMPARE})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-xdex-text-muted hover:text-white hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Token selector bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-xdex-border/50">
          {selected.map((t) => (
            <div key={t.address} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-xdex-card/40 border border-xdex-border/50">
              <span className="text-xs font-semibold text-white">{t.baseToken.symbol}</span>
              <span className="text-[10px] text-xdex-text-muted">/{t.quoteToken.symbol}</span>
              <button
                onClick={() => removeToken(t.address)}
                className="ml-1 p-0.5 rounded text-xdex-text-muted hover:text-xdex-red"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}

          {selected.length < MAX_COMPARE && (
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-xdex-border/60 text-xdex-text-muted hover:border-xdex-accent/40 hover:text-xdex-accent transition-colors"
              >
                <Plus size={12} />
                <span className="text-[10px] font-medium">Add Token</span>
              </button>
            </div>
          )}

          {showSearch && (
            <div className="relative flex-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-xdex-card border border-xdex-border/50 focus-within:border-xdex-accent/40">
                <Search size={12} className="text-xdex-text-muted" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search token to compare..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white outline-none"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-xdex-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-20">
                  {searchResults.map((t) => (
                    <button
                      key={t.address}
                      onClick={() => addToken(t)}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-white">{t.baseToken.symbol}</span>
                      <span className="text-[10px] text-xdex-text-muted truncate">{t.baseToken.name}</span>
                      <span className="text-[10px] text-xdex-text-muted font-mono ml-auto">{formatPrice(t.priceUsd)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comparison table */}
        <div className="flex-1 overflow-auto">
          {selected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ArrowLeftRight size={32} className="text-xdex-border mb-3" />
              <span className="text-sm text-xdex-text-muted">Add tokens above to compare them side by side</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-xdex-surface z-10">
                <tr className="border-b border-xdex-border">
                  <th className="px-4 py-2.5 text-left text-[10px] text-xdex-text-muted font-semibold uppercase w-36">Metric</th>
                  {selected.map((t) => (
                    <th key={t.address} className="px-4 py-2.5 text-center text-xs font-bold text-white">
                      {t.baseToken.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, mi) => (
                  <tr key={m.label} className="border-b border-xdex-border/20 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-[11px] text-xdex-text-muted font-medium">{m.label}</td>
                    {selected.map((t, ti) => {
                      const isBest = bestIdx.get(mi) === ti && selected.length > 1;
                      const color = m.getColor ? m.getColor(t) : 'text-white';
                      return (
                        <td key={t.address} className="px-4 py-2 text-center">
                          <span className={`text-[11px] font-mono ${color} ${isBest ? 'font-bold underline underline-offset-2 decoration-xdex-accent/40' : ''}`}>
                            {m.getValue(t)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function getRawValue(t: TokenPair, metricIndex: number): number {
  switch (metricIndex) {
    case 0: return t.priceUsd;
    case 1: return t.priceChange5m;
    case 2: return t.priceChange1h;
    case 3: return t.priceChange24h;
    case 4: return t.liquidity;
    case 5: return t.marketCap;
    case 6: return t.fdv;
    case 7: return t.volume24h;
    case 8: return t.txns24h;
    case 9: return t.makers;
    case 10: return t.createdAt; // lower = older = generally better
    case 11: return computeSafetyScore(t).score;
    case 12: return analyzeRugRisk(t).riskScore;
    case 13: return t.lpHolderCount ?? t.makers;
    case 14: return t.liquidity > 0 ? t.volume24h / t.liquidity : 0;
    default: return 0;
  }
}
