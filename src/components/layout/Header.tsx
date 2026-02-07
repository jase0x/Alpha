'use client';

import { Activity } from 'lucide-react';
import { formatUsd, formatNumber } from '@/utils/format';
import { TokenPair, TimeFilter } from '@/types/token';

interface HeaderProps {
  tokens: TokenPair[];
  trendingTimeframe: TimeFilter;
  onTimeframeChange: (tf: TimeFilter) => void;
}

export default function Header({ tokens, trendingTimeframe, onTimeframeChange }: HeaderProps) {
  const totalVolume = tokens.reduce((sum, t) => sum + t.volume24h, 0);
  const totalTxns = tokens.reduce((sum, t) => sum + t.txns24h, 0);
  const totalLiquidity = tokens.reduce((sum, t) => sum + t.liquidity, 0);

  const timeframes: TimeFilter[] = ['5m', '1h', '6h', '24h'];

  return (
    <header className="flex items-center justify-between px-6 h-12 bg-xdex-surface border-b border-xdex-border">
      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-xdex-accent" />
          <span className="text-xdex-text-muted">24H Volume:</span>
          <span className="font-semibold text-white">{formatUsd(totalVolume)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xdex-text-muted">Pairs:</span>
          <span className="font-semibold text-white">{formatNumber(tokens.length)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xdex-text-muted">24H Txns:</span>
          <span className="font-semibold text-white">{formatNumber(totalTxns)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xdex-text-muted">TVL:</span>
          <span className="font-semibold text-white">{formatUsd(totalLiquidity)}</span>
        </div>
      </div>

      {/* Trending timeframe filter */}
      <div className="flex items-center gap-1">
        <span className="text-xdex-text-muted text-xs mr-2">Trending</span>
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              trendingTimeframe === tf
                ? 'bg-xdex-accent/20 text-xdex-accent'
                : 'text-xdex-text-muted hover:text-xdex-text hover:bg-xdex-hover'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </header>
  );
}
