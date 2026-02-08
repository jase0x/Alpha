'use client';

import { useMemo } from 'react';
import { Star, AlertTriangle, Zap, Shield, RefreshCw } from 'lucide-react';
import { TokenPair, TimeFilter } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { ColumnId } from '@/utils/columnPrefs';
import { computeSafetyScore } from '@/utils/safetyScore';
import {
  formatPrice,
  formatUsd,
  formatNumber,
  formatPercent,
  formatAge,
  getPercentColor,
} from '@/utils/format';

interface TokenRowProps {
  token: TokenPair;
  rank: number;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
  onClick: (token: TokenPair) => void;
  onSwap: (token: TokenPair) => void;
  boost?: ActiveBoost | null;
  visibleColumns?: Set<ColumnId>;
  isSelected?: boolean;
  timeFilter?: TimeFilter;
}

function getChangeForFilter(token: TokenPair, tf: TimeFilter): number {
  switch (tf) {
    case '5m': return token.priceChange5m;
    case '1h': return token.priceChange1h;
    case '6h': return token.priceChange6h;
    case '24h': return token.priceChange24h;
  }
}

/** Mini sparkline SVG with interpolated points for squiggly look */
function Sparkline({ token }: { token: TokenPair }) {
  const points = useMemo(() => {
    const now = token.priceUsd;
    if (now <= 0) return null;
    const safe = (pct: number) => { const v = now / (1 + pct / 100); return isFinite(v) && v > 0 ? v : now; };
    // 5 anchor points from real data
    const anchors = [safe(token.priceChange24h), safe(token.priceChange6h), safe(token.priceChange1h), safe(token.priceChange5m), now];

    // Interpolate to 20 points with micro-variation for squiggly look
    const numPoints = 20;
    const expanded: number[] = [];
    // Use token address as a seed for deterministic "randomness"
    const seed = token.address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1); // 0 to 1
      const anchorIdx = t * (anchors.length - 1);
      const lo = Math.floor(anchorIdx);
      const hi = Math.min(lo + 1, anchors.length - 1);
      const frac = anchorIdx - lo;
      const base = anchors[lo] + (anchors[hi] - anchors[lo]) * frac;
      // Deterministic micro-noise based on position + seed
      const noise = Math.sin(seed * 0.1 + i * 2.7) * 0.015 + Math.cos(seed * 0.3 + i * 1.3) * 0.01;
      expanded.push(base * (1 + noise));
    }

    const min = Math.min(...expanded);
    const max = Math.max(...expanded);
    const range = max - min;
    // When data is truly flat, create gentle movement
    if (range === 0) {
      return expanded.map((_, i) => ({
        x: (i / (numPoints - 1)) * 110,
        y: 16 + Math.sin(seed * 0.1 + i * 0.7) * 8 + Math.cos(seed * 0.3 + i * 1.1) * 4,
      }));
    }
    return expanded.map((p, i) => ({
      x: (i / (numPoints - 1)) * 110,
      y: 2 + (1 - (p - min) / range) * 28,
    }));
  }, [token.priceUsd, token.priceChange24h, token.priceChange6h, token.priceChange1h, token.priceChange5m, token.address]);

  if (!points) return <div className="w-[110px] h-[32px]" />;

  const isUp = token.priceChange24h >= 0;
  const color = isUp ? '#00e676' : '#ff1744';
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={110} height={32} viewBox="0 0 110 32" className="flex-shrink-0">
      <defs>
        <linearGradient id={`spark-${isUp ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L110,32 L0,32 Z`} fill={`url(#spark-${isUp ? 'up' : 'dn'})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TokenRow({
  token,
  isFavorited,
  onFavorite,
  onClick,
  onSwap,
  boost,
  visibleColumns,
  isSelected,
  timeFilter = '24h',
}: TokenRowProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(token.address);
  };

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwap(token);
  };

  const show = (col: ColumnId) => !visibleColumns || visibleColumns.has(col);

  const isLowLiquidity = token.liquidity < 1000;
  const isNew = (Date.now() - token.createdAt) < 7 * 86400000;

  const safety = useMemo(() => computeSafetyScore(token), [token]);
  const priceChange = getChangeForFilter(token, timeFilter);

  return (
    <tr
      className={`token-row border-b border-xdex-accent/15 cursor-pointer ${
        boost?.tierConfig.hasGlow ? 'boosted-row' : ''
      } ${isSelected ? 'token-row-selected' : ''}`}
      onClick={() => onClick(token)}
      style={boost?.tierConfig.hasGlow ? { '--boost-color': boost.tierConfig.color } as React.CSSProperties : undefined}
    >
      {/* Token info — no rank numbers */}
      {show('token') && (
        <td className="px-3 py-3 overflow-hidden">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {boost && (
              <span className="inline-flex items-center flex-shrink-0" title={boost.tierConfig.name}>
                {Array.from({ length: boost.tierConfig.boltCount }).map((_, i) => (
                  <Zap key={i} size={12} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -3 : 0 }} />
                ))}
              </span>
            )}

            <button onClick={handleFavorite} className={`star-btn flex-shrink-0 ${isFavorited ? 'favorited' : 'text-xdex-text-muted'}`}>
              <Star size={15} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>

            {token.baseToken.imageUrl ? (
              <img src={token.baseToken.imageUrl} alt={token.baseToken.symbol} className="w-8 h-8 rounded-full bg-xdex-card border border-xdex-border flex-shrink-0 object-cover" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.nextElementSibling?.classList.remove('hidden'); }} />
            ) : null}
            <div className={`w-8 h-8 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center flex-shrink-0 ${token.baseToken.imageUrl ? 'hidden' : ''}`}>
              <span className="text-xs font-bold text-xdex-accent">{token.baseToken.symbol.charAt(0)}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{token.baseToken.symbol}</span>
                {token.isVerified && <span className="text-xdex-accent text-[10px]" title="Verified">&#10003;</span>}
                <span className="text-xs text-xdex-text-secondary truncate">{token.baseToken.name}</span>
                <span className="text-xdex-text-muted text-xs">/</span>
                <span className="text-xs text-xdex-text-muted">{token.quoteToken.symbol}</span>
                {isLowLiquidity && <span title="Low liquidity" className="flex-shrink-0"><AlertTriangle size={10} className="text-xdex-yellow/70" /></span>}
                {isNew && <span className="text-[9px] px-1 py-0.5 rounded bg-xdex-accent/15 text-xdex-accent font-semibold flex-shrink-0">NEW</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-xdex-text-muted">{formatAge(token.createdAt)}</span>
              </div>
            </div>
          </div>
        </td>
      )}

      {/* Price + % change stacked */}
      {show('price') && (
        <td className="px-2 py-3 text-right">
          <div className="text-sm text-white font-mono font-medium">{formatPrice(token.priceUsd)}</div>
          <div className={`text-xs font-mono font-medium mt-0.5 ${getPercentColor(priceChange)}`}>{formatPercent(priceChange)}</div>
        </td>
      )}

      {show('volume') && (
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-white font-mono font-medium">{formatUsd(token.volume24h)}</span>
        </td>
      )}

      {show('txns') && (
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-white font-mono">{formatNumber(token.txns24h)}</span>
        </td>
      )}

      {show('liquidity') && (
        <td className="px-2 py-3 text-right">
          <span className={`text-sm font-mono ${isLowLiquidity ? 'text-xdex-yellow/70' : 'text-white'}`}>{formatUsd(token.liquidity)}</span>
        </td>
      )}

      {show('marketCap') && (
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-white font-mono font-medium">{formatUsd(token.marketCap)}</span>
        </td>
      )}

      {show('makers') && (
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-white font-mono">{formatNumber(token.makers)}</span>
        </td>
      )}

      {show('safety') && (
        <td className="px-2 py-3 text-center">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${safety.color} ${safety.bgColor}`}
            title={safety.risks.length > 0 ? safety.risks.join(', ') : 'No risks detected'}
          >
            <Shield size={9} />
            {safety.score}
          </span>
        </td>
      )}

      {/* Mini sparkline chart */}
      <td className="px-1 py-3 text-center">
        <Sparkline token={token} />
      </td>

      {/* Swap button — far right */}
      <td className="px-2 py-3 text-center">
        <button onClick={handleSwap} className="flex items-center justify-center w-8 h-8 rounded-lg bg-xdex-accent/10 border border-xdex-accent/20 hover:bg-xdex-accent/20 hover:border-xdex-accent/40 transition-all mx-auto" title={`Swap ${token.baseToken.symbol}`}>
          <RefreshCw size={14} className="text-xdex-accent" />
        </button>
      </td>
    </tr>
  );
}
