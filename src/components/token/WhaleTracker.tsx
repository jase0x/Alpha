'use client';

import { useState, useEffect } from 'react';
import { Fish, TrendingUp, TrendingDown, Zap, ArrowDown, ArrowUp } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { getWhaleActivity, WhaleActivity, WhaleStats } from '@/services/whaleStore';
import { formatUsd } from '@/utils/format';

interface Props {
  token: TokenPair;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function ActivityRow({ a }: { a: WhaleActivity }) {
  const isPositive = a.type === 'buy' || a.type === 'add_lp';
  const explorerBase = 'https://explorer.x1.xyz';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-xdex-border/20 last:border-0">
      {/* Type indicator */}
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
        isPositive ? 'bg-xdex-green/15' : 'bg-xdex-red/15'
      }`}>
        {isPositive ? (
          <ArrowUp size={10} className="text-xdex-green" />
        ) : (
          <ArrowDown size={10} className="text-xdex-red" />
        )}
      </div>

      {/* Wallet + smart money badge */}
      <div className="flex items-center gap-1 min-w-0">
        <a
          href={`${explorerBase}/address/${a.walletShort}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-xdex-accent font-mono truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {a.walletShort}
        </a>
        {a.isSmartMoney && (
          <Zap size={8} fill="#DFFF00" color="#DFFF00" className="flex-shrink-0" />
        )}
      </div>

      {/* Type */}
      <span className={`text-[9px] font-semibold uppercase flex-shrink-0 ${
        isPositive ? 'text-xdex-green' : 'text-xdex-red'
      }`}>
        {a.type === 'add_lp' ? '+LP' : a.type === 'remove_lp' ? '-LP' : a.type}
      </span>

      {/* Amount */}
      <span className="text-[10px] text-white font-mono ml-auto flex-shrink-0">
        {formatUsd(a.amountUsd)}
      </span>

      {/* PnL for sells */}
      {a.pnlPercent !== undefined && (
        <span className={`text-[9px] font-mono flex-shrink-0 ${
          a.pnlPercent >= 0 ? 'text-xdex-green' : 'text-xdex-red'
        }`}>
          {a.pnlPercent >= 0 ? '+' : ''}{a.pnlPercent.toFixed(0)}%
        </span>
      )}

      {/* Time */}
      <span className="text-[9px] text-xdex-text-muted flex-shrink-0">{timeAgo(a.timestamp)}</span>
    </div>
  );
}

const EMPTY_STATS: WhaleStats = {
  totalWhaleVolume: 0,
  smartMoneyInflow: 0,
  largestBuy: 0,
  largestSell: 0,
  whaleCount: 0,
  recentActivity: [],
};

export default function WhaleTracker({ token }: Props) {
  const [stats, setStats] = useState<WhaleStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWhaleActivity(token).then((data) => {
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.address, token.chain]);

  return (
    <div className="px-5 py-3 border-b border-xdex-border">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Fish size={12} className="text-xdex-accent" />
        <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">Whale Tracker</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-xdex-accent/10 text-xdex-accent font-medium ml-auto">
          {loading ? '...' : `${stats.whaleCount} whales`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-xs text-xdex-text-muted">
          <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
          Loading on-chain whale data...
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="p-2 rounded bg-xdex-card/20 border border-xdex-border/30">
              <div className="text-[9px] text-xdex-text-muted uppercase">Smart Money Flow</div>
              <div className={`text-xs font-bold font-mono mt-0.5 ${
                stats.smartMoneyInflow >= 0 ? 'text-xdex-green' : 'text-xdex-red'
              }`}>
                {stats.smartMoneyInflow >= 0 ? '+' : ''}{formatUsd(stats.smartMoneyInflow)}
              </div>
            </div>
            <div className="p-2 rounded bg-xdex-card/20 border border-xdex-border/30">
              <div className="text-[9px] text-xdex-text-muted uppercase">Whale Volume</div>
              <div className="text-xs font-bold font-mono mt-0.5 text-white">
                {formatUsd(stats.totalWhaleVolume)}
              </div>
            </div>
          </div>

          {/* Largest txns */}
          <div className="flex items-center gap-3 mb-2">
            {stats.largestBuy > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp size={9} className="text-xdex-green" />
                <span className="text-[9px] text-xdex-text-muted">Largest buy:</span>
                <span className="text-[9px] text-xdex-green font-mono font-medium">{formatUsd(stats.largestBuy)}</span>
              </div>
            )}
            {stats.largestSell > 0 && (
              <div className="flex items-center gap-1">
                <TrendingDown size={9} className="text-xdex-red" />
                <span className="text-[9px] text-xdex-text-muted">Largest sell:</span>
                <span className="text-[9px] text-xdex-red font-mono font-medium">{formatUsd(stats.largestSell)}</span>
              </div>
            )}
          </div>

          {/* Activity list */}
          <div className="max-h-[180px] overflow-y-auto">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))
            ) : (
              <div className="text-center py-4 text-[10px] text-xdex-text-muted">
                No whale activity detected
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
