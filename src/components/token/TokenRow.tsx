'use client';

import { Star, ArrowLeftRight } from 'lucide-react';
import { TokenPair } from '@/types/token';
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
}

// Inline XDEX logo mark (small, 14px)
function XdexMark() {
  return (
    <svg width={14} height={14} viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
      <defs>
        <linearGradient id="xdex-row" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#0566ea" />
        </linearGradient>
      </defs>
      <path d="M18 22L38 50L18 78H30L44 58L58 78H70L50 50L70 22H58L44 42L30 22H18Z" fill="url(#xdex-row)" />
    </svg>
  );
}

export default function TokenRow({
  token,
  rank,
  isFavorited,
  onFavorite,
  onClick,
  onSwap,
}: TokenRowProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(token.address);
  };

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwap(token);
  };

  return (
    <tr
      className="token-row border-b border-xdex-border/50 cursor-pointer"
      onClick={() => onClick(token)}
    >
      {/* Token info: rank | XDEX logo | image | symbol/pair | name */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {/* Rank number */}
          <span className="text-[11px] text-xdex-text-muted font-mono w-5 text-right flex-shrink-0">
            {rank}
          </span>

          {/* XDEX logo */}
          <XdexMark />

          {/* Favorite star */}
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
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-white truncate">
                {token.baseToken.symbol}
              </span>
              <span className="text-xdex-text-muted text-xs">/</span>
              <span className="text-xs text-xdex-text-muted truncate">
                {token.quoteToken.symbol}
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

      {/* Swap button */}
      <td className="px-2 py-3 text-center">
        <button
          onClick={handleSwap}
          className="p-1.5 rounded-md text-xdex-text-muted hover:text-xdex-green hover:bg-xdex-green/10 transition-colors"
          title={`Swap ${token.baseToken.symbol}`}
        >
          <ArrowLeftRight size={14} />
        </button>
      </td>
    </tr>
  );
}
