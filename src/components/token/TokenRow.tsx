'use client';

import { useMemo } from 'react';
import { Star, AlertTriangle, Zap, Shield } from 'lucide-react';
import { TokenPair } from '@/types/token';
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
}

export default function TokenRow({
  token,
  rank,
  isFavorited,
  onFavorite,
  onClick,
  onSwap,
  boost,
  visibleColumns,
  isSelected,
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

  // Risk indicators
  const isLowLiquidity = token.liquidity < 1000;
  const isNew = (Date.now() - token.createdAt) < 7 * 86400000;

  const safety = useMemo(() => computeSafetyScore(token), [token]);

  return (
    <tr
      className={`token-row border-b border-xdex-border/50 cursor-pointer ${
        boost?.tierConfig.hasGlow ? 'boosted-row' : ''
      } ${isSelected ? 'token-row-selected' : ''}`}
      onClick={() => onClick(token)}
      style={boost?.tierConfig.hasGlow ? { '--boost-color': boost.tierConfig.color } as React.CSSProperties : undefined}
    >
      {/* Token info */}
      {show('token') && (
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-xdex-text-muted font-mono w-5 text-right flex-shrink-0">
              {rank}
            </span>

            {/* Boost indicator — neon yellow bolts */}
            {boost && (
              <span className="inline-flex items-center flex-shrink-0" title={boost.tierConfig.name}>
                {Array.from({ length: boost.tierConfig.boltCount }).map((_, i) => (
                  <Zap key={i} size={11} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -3 : 0 }} />
                ))}
              </span>
            )}

            {/* XDEX logo as swap button */}
            <button onClick={handleSwap} className="flex-shrink-0 rounded-md hover:opacity-80 transition-opacity" title={`Swap ${token.baseToken.symbol}`}>
              <img src="https://app.xdex.xyz/logo/logo.png" alt="Swap" className="w-5 h-5 object-contain" />
            </button>

            <button onClick={handleFavorite} className={`star-btn flex-shrink-0 ${isFavorited ? 'favorited' : 'text-xdex-text-muted'}`}>
              <Star size={13} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>

            {token.baseToken.imageUrl ? (
              <img src={token.baseToken.imageUrl} alt={token.baseToken.symbol} className="w-6 h-6 rounded-full bg-xdex-card border border-xdex-border flex-shrink-0 object-cover" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.nextElementSibling?.classList.remove('hidden'); }} />
            ) : null}
            <div className={`w-6 h-6 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center flex-shrink-0 ${token.baseToken.imageUrl ? 'hidden' : ''}`}>
              <span className="text-[10px] font-bold text-xdex-accent">{token.baseToken.symbol.charAt(0)}</span>
            </div>

            <div className="min-w-0 flex items-center gap-1">
              <span className="font-semibold text-sm text-white truncate">{token.baseToken.symbol}</span>
              <span className="text-[10px] text-xdex-text-secondary truncate">{token.baseToken.name}</span>
              <span className="text-xdex-text-muted text-xs">/</span>
              <span className="text-xs text-xdex-text-muted">{token.quoteToken.symbol}</span>
              {token.isVerified && <span className="text-xdex-accent text-[10px]" title="Verified">&#10003;</span>}
              {isLowLiquidity && <span className="flex-shrink-0" title="Low liquidity"><AlertTriangle size={10} className="text-xdex-yellow/70" /></span>}
              {isNew && <span className="text-[8px] px-1 py-0.5 rounded bg-xdex-accent/15 text-xdex-accent font-semibold flex-shrink-0">NEW</span>}
            </div>
          </div>
        </td>
      )}

      {show('price') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-white font-mono font-medium">{formatPrice(token.priceUsd)}</span>
        </td>
      )}

      {show('age') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-xdex-text-secondary">{formatAge(token.createdAt)}</span>
        </td>
      )}

      {show('txns') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-white font-mono">{formatNumber(token.txns24h)}</span>
        </td>
      )}

      {show('volume') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-white font-mono font-medium">{formatUsd(token.volume24h)}</span>
        </td>
      )}

      {show('makers') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-white font-mono">{formatNumber(token.makers)}</span>
        </td>
      )}

      {show('priceChange5m') && (
        <td className="px-2 py-2.5 text-right">
          <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange5m)}`}>{formatPercent(token.priceChange5m)}</span>
        </td>
      )}

      {show('priceChange1h') && (
        <td className="px-2 py-2.5 text-right">
          <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange1h)}`}>{formatPercent(token.priceChange1h)}</span>
        </td>
      )}

      {show('priceChange6h') && (
        <td className="px-2 py-2.5 text-right">
          <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange6h)}`}>{formatPercent(token.priceChange6h)}</span>
        </td>
      )}

      {show('priceChange24h') && (
        <td className="px-2 py-2.5 text-right">
          <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange24h)}`}>{formatPercent(token.priceChange24h)}</span>
        </td>
      )}

      {show('liquidity') && (
        <td className="px-2 py-2.5 text-right">
          <span className={`text-sm font-mono ${isLowLiquidity ? 'text-xdex-yellow/70' : 'text-white'}`}>{formatUsd(token.liquidity)}</span>
        </td>
      )}

      {show('marketCap') && (
        <td className="px-2 py-2.5 text-right">
          <span className="text-sm text-white font-mono font-medium">{formatUsd(token.marketCap)}</span>
        </td>
      )}

      {/* Safety score */}
      {show('safety') && (
        <td className="px-2 py-2.5 text-center">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${safety.color} ${safety.bgColor}`}
            title={safety.risks.length > 0 ? safety.risks.join(', ') : 'No risks detected'}
          >
            <Shield size={9} />
            {safety.score}
          </span>
        </td>
      )}
    </tr>
  );
}
