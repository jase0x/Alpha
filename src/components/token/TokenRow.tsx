'use client';

import { Star } from 'lucide-react';
import { TokenPair } from '@/types/token';
import {
  formatPrice,
  formatUsd,
  formatNumber,
  formatPercent,
  formatAge,
  getPercentColor,
  getChainColor,
  getChainLabel,
} from '@/utils/format';

interface TokenRowProps {
  token: TokenPair;
  rank: number;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
  onClick: (token: TokenPair) => void;
}

export default function TokenRow({
  token,
  rank,
  isFavorited,
  onFavorite,
  onClick,
}: TokenRowProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(token.address);
  };

  return (
    <tr
      className="token-row border-b border-xdex-border/50 cursor-pointer"
      onClick={() => onClick(token)}
    >
      {/* Rank */}
      <td className="px-3 py-3 text-center">
        <span className="text-xs text-xdex-text-muted">#{rank}</span>
      </td>

      {/* Token info */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFavorite}
            className={`star-btn flex-shrink-0 ${isFavorited ? 'favorited' : 'text-xdex-text-muted'}`}
          >
            <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>

          {/* Token icon */}
          {token.baseToken.imageUrl ? (
            <img
              src={token.baseToken.imageUrl}
              alt={token.baseToken.symbol}
              className="w-7 h-7 rounded-full bg-xdex-card border border-xdex-border flex-shrink-0 object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-7 h-7 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center flex-shrink-0 ${token.baseToken.imageUrl ? 'hidden' : ''}`}>
            <span className="text-[10px] font-bold text-xdex-accent">
              {token.baseToken.symbol.charAt(0)}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white truncate">
                {token.baseToken.symbol}
              </span>
              <span className={`chain-badge ${getChainColor(token.chain)}`}>
                {getChainLabel(token.chain)}
              </span>
              {token.isVerified && (
                <span className="text-xdex-accent text-[10px]" title="Verified">
                  &#10003;
                </span>
              )}
            </div>
            <div className="text-[11px] text-xdex-text-muted truncate max-w-[160px]">
              {token.baseToken.name}
            </div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-white font-mono font-medium">
          {formatPrice(token.priceUsd)}
        </span>
      </td>

      {/* Age */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-xdex-text-secondary">
          {formatAge(token.createdAt)}
        </span>
      </td>

      {/* TXNS */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-xdex-accent font-mono">
          {formatNumber(token.txns24h)}
        </span>
      </td>

      {/* Volume */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-xdex-green font-mono font-medium">
          {formatUsd(token.volume24h)}
        </span>
      </td>

      {/* Makers */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-xdex-accent font-mono">
          {formatNumber(token.makers)}
        </span>
      </td>

      {/* 5m change */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange5m)}`}>
          {formatPercent(token.priceChange5m)}
        </span>
      </td>

      {/* 1h change */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange1h)}`}>
          {formatPercent(token.priceChange1h)}
        </span>
      </td>

      {/* 6h change */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange6h)}`}>
          {formatPercent(token.priceChange6h)}
        </span>
      </td>

      {/* 24h change */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm font-mono font-medium ${getPercentColor(token.priceChange24h)}`}>
          {formatPercent(token.priceChange24h)}
        </span>
      </td>

      {/* Liquidity */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-xdex-accent font-mono">
          {formatUsd(token.liquidity)}
        </span>
      </td>

      {/* Market cap */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-white font-mono font-medium">
          {formatUsd(token.marketCap)}
        </span>
      </td>
    </tr>
  );
}
