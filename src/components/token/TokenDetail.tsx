'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Star,
  ArrowLeftRight,
  Globe,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { TokenPair, OHLCVData } from '@/types/token';
import { fetchOHLCV } from '@/services/api';
import {
  formatPrice,
  formatUsd,
  formatNumber,
  formatPercent,
  formatAge,
  getPercentColor,
  getChainLabel,
  getChainColor,
} from '@/utils/format';
import PriceChart from '@/components/chart/PriceChart';

interface TokenDetailProps {
  token: TokenPair;
  onClose: () => void;
  onSwap: (token: TokenPair) => void;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
}

type ChartTimeframe = '5m' | '15m' | '1h' | '4h' | '1d';

export default function TokenDetail({
  token,
  onClose,
  onSwap,
  isFavorited,
  onFavorite,
}: TokenDetailProps) {
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1h');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchOHLCV(token.address, chartTimeframe, token.priceUsd).then(setChartData);
  }, [token.address, chartTimeframe, token.priceUsd]);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.baseToken.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeframes: ChartTimeframe[] = ['5m', '15m', '1h', '4h', '1d'];

  const stats = [
    { label: 'Price', value: formatPrice(token.priceUsd) },
    { label: 'Market Cap', value: formatUsd(token.marketCap) },
    { label: 'Liquidity', value: formatUsd(token.liquidity) },
    { label: '24h Volume', value: formatUsd(token.volume24h) },
    { label: '24h Txns', value: formatNumber(token.txns24h) },
    { label: 'Makers', value: formatNumber(token.makers) },
  ];

  const changes = [
    { label: '5m', value: token.priceChange5m },
    { label: '1h', value: token.priceChange1h },
    { label: '6h', value: token.priceChange6h },
    { label: '24h', value: token.priceChange24h },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-xdex-surface border-l border-xdex-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-xdex-surface border-b border-xdex-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center">
                <span className="text-sm font-bold text-xdex-accent">
                  {token.baseToken.symbol.charAt(0)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    {token.baseToken.symbol}
                  </span>
                  <span className="text-sm text-xdex-text-muted">
                    /{token.quoteToken.symbol}
                  </span>
                  <span className={`chain-badge ${getChainColor(token.chain)}`}>
                    {getChainLabel(token.chain)}
                  </span>
                </div>
                <div className="text-xs text-xdex-text-muted">{token.baseToken.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onFavorite(token.address)}
                className={`p-2 rounded-lg hover:bg-xdex-hover transition-colors ${
                  isFavorited ? 'text-yellow-400' : 'text-xdex-text-muted'
                }`}
              >
                <Star size={18} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onSwap(token)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-accent/20 text-xdex-accent hover:bg-xdex-accent/30 text-sm font-medium transition-colors"
              >
                <ArrowLeftRight size={14} />
                Swap
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-xdex-text-muted hover:text-white hover:bg-xdex-hover transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Price and change */}
          <div className="flex items-end gap-3 mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {formatPrice(token.priceUsd)}
            </span>
            <span className={`text-sm font-medium flex items-center gap-1 ${getPercentColor(token.priceChange24h)}`}>
              {token.priceChange24h > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatPercent(token.priceChange24h)}
            </span>
          </div>
        </div>

        {/* Contract address */}
        <div className="px-5 py-3 border-b border-xdex-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-xdex-text-muted">Contract:</span>
            <code className="text-xdex-text-secondary font-mono">
              {token.baseToken.address.slice(0, 8)}...{token.baseToken.address.slice(-6)}
            </code>
            <button
              onClick={copyAddress}
              className="text-xdex-text-muted hover:text-xdex-accent transition-colors"
            >
              <Copy size={12} />
            </button>
            {copied && <span className="text-xdex-accent text-[10px]">Copied!</span>}
            <span className="text-xdex-text-muted">|</span>
            <span className="text-xdex-text-muted">Age: {formatAge(token.createdAt)}</span>
            <span className="text-xdex-text-muted">|</span>
            <span className="text-xdex-text-muted">DEX: {token.dex}</span>
          </div>
        </div>

        {/* Price changes row */}
        <div className="px-5 py-3 border-b border-xdex-border">
          <div className="flex items-center gap-4">
            {changes.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5">
                <span className="text-[11px] text-xdex-text-muted uppercase">{c.label}</span>
                <span className={`text-sm font-mono font-medium ${getPercentColor(c.value)}`}>
                  {formatPercent(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-xdex-text-muted uppercase tracking-wider font-semibold">
              Price Chart
            </span>
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    chartTimeframe === tf
                      ? 'bg-xdex-accent/20 text-xdex-accent'
                      : 'text-xdex-text-muted hover:text-xdex-text'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] bg-xdex-card rounded-lg border border-xdex-border overflow-hidden">
            <PriceChart data={chartData} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-5 pb-4">
          <span className="text-xs text-xdex-text-muted uppercase tracking-wider font-semibold">
            Statistics
          </span>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-xdex-card rounded-lg border border-xdex-border p-3"
              >
                <div className="text-[11px] text-xdex-text-muted">{stat.label}</div>
                <div className="text-sm font-semibold text-white mt-0.5 font-mono">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="px-5 pb-6">
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-card border border-xdex-border text-xs text-xdex-text-secondary hover:text-xdex-accent hover:border-xdex-accent/40 transition-colors"
            >
              <Globe size={12} /> Explorer
              <ExternalLink size={10} />
            </a>
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-card border border-xdex-border text-xs text-xdex-text-secondary hover:text-xdex-accent hover:border-xdex-accent/40 transition-colors"
            >
              XDEX Swap
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
