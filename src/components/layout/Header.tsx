'use client';

import { useState, useEffect, useMemo } from 'react';
import { Flame, Rocket, TrendingUp, Zap } from 'lucide-react';
import { formatUsd, formatPrice, formatPercent, formatCompact } from '@/utils/format';
import { TokenPair } from '@/types/token';

interface HeaderProps {
  tokens: TokenPair[];
  allTokens: TokenPair[];
  trendingTimeframe: string;
  onTimeframeChange: (tf: any) => void;
  onTokenClick?: (token: TokenPair) => void;
}

interface BannerToken {
  symbol: string;
  value: string;
  color: string;
  imageUrl?: string;
  tokenRef?: TokenPair;
}

interface BannerItem {
  icon: React.ReactNode;
  label: string;
  tokens: BannerToken[];
}

export default function Header({ tokens, allTokens, onTokenClick }: HeaderProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const totalVolume = tokens.reduce((sum, t) => sum + t.volume24h, 0);
  const totalTxns = tokens.reduce((sum, t) => sum + t.txns24h, 0);
  const totalLiquidity = tokens.reduce((sum, t) => sum + t.liquidity, 0);

  const bannerItems = useMemo<BannerItem[]>(() => {
    const all = allTokens.length > 0 ? allTokens : tokens;

    const gainers = [...all]
      .filter((t) => t.priceChange24h > 0)
      .sort((a, b) => b.priceChange24h - a.priceChange24h)
      .slice(0, 5);

    const hot = [...all]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 5);

    const recent = [...all]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const losers = [...all]
      .filter((t) => t.priceChange24h < 0)
      .sort((a, b) => a.priceChange24h - b.priceChange24h)
      .slice(0, 5);

    return [
      {
        icon: <TrendingUp size={12} className="text-xdex-green" />,
        label: 'Trending',
        tokens: gainers.map((t) => ({
          symbol: t.baseToken.symbol,
          value: formatPercent(t.priceChange24h),
          color: 'text-xdex-green',
          imageUrl: t.baseToken.imageUrl,
          tokenRef: t,
        })),
      },
      {
        icon: <Flame size={12} className="text-xdex-orange" />,
        label: 'Hot',
        tokens: hot.map((t) => ({
          symbol: t.baseToken.symbol,
          value: formatUsd(t.volume24h),
          color: 'text-xdex-orange',
          imageUrl: t.baseToken.imageUrl,
          tokenRef: t,
        })),
      },
      {
        icon: <Rocket size={12} className="text-xdex-accent" />,
        label: 'New',
        tokens: recent.map((t) => ({
          symbol: t.baseToken.symbol,
          value: formatPrice(t.priceUsd),
          color: 'text-xdex-accent',
          imageUrl: t.baseToken.imageUrl,
          tokenRef: t,
        })),
      },
      {
        icon: <Zap size={12} className="text-xdex-yellow" />,
        label: 'Volume',
        tokens: [
          { symbol: '24H Vol', value: formatUsd(totalVolume), color: 'text-white' },
          { symbol: 'Pairs', value: formatCompact(tokens.length), color: 'text-white' },
          { symbol: 'Txns', value: formatCompact(totalTxns), color: 'text-white' },
          { symbol: 'TVL', value: formatUsd(totalLiquidity), color: 'text-xdex-accent' },
        ],
      },
      {
        icon: <TrendingUp size={12} className="text-xdex-red rotate-180" />,
        label: 'Losers',
        tokens: losers.map((t) => ({
          symbol: t.baseToken.symbol,
          value: formatPercent(t.priceChange24h),
          color: 'text-xdex-red',
          imageUrl: t.baseToken.imageUrl,
          tokenRef: t,
        })),
      },
    ];
  }, [tokens, allTokens, totalVolume, totalTxns, totalLiquidity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollOffset((prev) => prev + 1);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleTokenClick = (t: BannerToken) => {
    if (t.tokenRef && onTokenClick) {
      onTokenClick(t.tokenRef);
    }
  };

  return (
    <header className="relative h-10 bg-black border-b border-[#222] overflow-hidden">
      <div
        className="trending-banner flex items-center gap-8 h-full whitespace-nowrap"
        style={{
          transform: `translateX(-${scrollOffset % 3000}px)`,
        }}
      >
        {[...bannerItems, ...bannerItems, ...bannerItems].map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-[11px] font-semibold text-xdex-text-muted uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            {item.tokens.map((t, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 ${t.tokenRef ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => handleTokenClick(t)}
              >
                {t.imageUrl && (
                  <img
                    src={t.imageUrl}
                    alt={t.symbol}
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span className="text-[11px] font-medium text-white">{t.symbol}</span>
                <span className={`text-[11px] font-mono font-medium ${t.color}`}>{t.value}</span>
              </div>
            ))}
            <div className="w-px h-3 bg-xdex-border/60" />
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
    </header>
  );
}
