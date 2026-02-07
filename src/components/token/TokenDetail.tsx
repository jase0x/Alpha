'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Star,
  ArrowLeftRight,
  Globe,
  ArrowUpDown,
  ChevronLeft,
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
import DegenLogo from '@/components/ui/DegenLogo';

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
  const [calcAmount, setCalcAmount] = useState('1');

  useEffect(() => {
    fetchOHLCV(token.address, chartTimeframe, token.priceUsd).then(setChartData);
  }, [token.address, chartTimeframe, token.priceUsd]);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.baseToken.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeframes: ChartTimeframe[] = ['5m', '15m', '1h', '4h', '1d'];

  const changes = [
    { label: '5M', value: token.priceChange5m },
    { label: '1H', value: token.priceChange1h },
    { label: '6H', value: token.priceChange6h },
    { label: '24H', value: token.priceChange24h },
  ];

  // Simulated buy/sell ratio based on price change
  const buyPercent = Math.min(85, Math.max(15, 50 + token.priceChange24h * 2));
  const sellPercent = 100 - buyPercent;
  const buys = Math.round(token.txns24h * (buyPercent / 100));
  const sells = token.txns24h - buys;
  const buyVolume = token.volume24h * (buyPercent / 100);
  const sellVolume = token.volume24h - buyVolume;

  // Price calculator
  const calcResult = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0;
    return amount * token.priceUsd;
  }, [calcAmount, token.priceUsd]);

  const nativePrice = token.price || 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      {/* Full-width panel */}
      <div className="relative ml-auto w-full h-full bg-black flex">
        {/* LEFT: Chart area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-xdex-border">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-xdex-border">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-xdex-text-muted hover:text-white transition-colors text-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-white">
                {token.baseToken.symbol}/{token.quoteToken.symbol}
              </span>
              <span className={`chain-badge ${getChainColor(token.chain)}`}>
                {getChainLabel(token.chain)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSwap(token)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-green/20 text-xdex-green hover:bg-xdex-green/30 text-xs font-semibold transition-colors"
              >
                <ArrowLeftRight size={12} />
                Swap
              </button>
            </div>
          </div>

          {/* Chart controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-xdex-border/50">
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    chartTimeframe === tf
                      ? 'bg-xdex-accent/20 text-xdex-accent'
                      : 'text-xdex-text-muted hover:text-xdex-text hover:bg-white/5'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-xdex-border mx-1" />
            <span className="text-[10px] text-xdex-text-muted">Candles</span>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0">
            <PriceChart data={chartData} />
          </div>
        </div>

        {/* RIGHT: Token info panel */}
        <div className="w-[380px] flex-shrink-0 overflow-y-auto">
          {/* Token header */}
          <div className="px-5 pt-5 pb-4 border-b border-xdex-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {token.baseToken.imageUrl ? (
                  <img
                    src={token.baseToken.imageUrl}
                    alt={token.baseToken.symbol}
                    className="w-10 h-10 rounded-full bg-xdex-card border border-xdex-border object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      el.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center ${token.baseToken.imageUrl ? 'hidden' : ''}`}>
                  <span className="text-sm font-bold text-xdex-accent">
                    {token.baseToken.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{token.baseToken.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-xdex-text-muted">{token.baseToken.symbol}/{token.quoteToken.symbol}</span>
                    <span className={`chain-badge text-[9px] ${getChainColor(token.chain)}`}>
                      {getChainLabel(token.chain)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onFavorite(token.address)}
                  className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                    isFavorited ? 'text-yellow-400' : 'text-xdex-text-muted'
                  }`}
                >
                  <Star size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={copyAddress}
                  className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
                  title="Copy contract"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="mt-4">
              <div className="text-2xl font-bold text-white font-mono">
                {formatPrice(token.priceUsd)}
              </div>
              {nativePrice > 0 && (
                <div className="text-sm text-xdex-text-muted font-mono mt-0.5">
                  {nativePrice.toFixed(4)} <span className="text-xdex-text-muted">{token.quoteToken.symbol}</span>
                </div>
              )}
            </div>

            {/* Price changes */}
            <div className="flex items-center justify-between mt-4">
              {changes.map((c) => (
                <div key={c.label} className="text-center">
                  <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">{c.label}</div>
                  <div className={`text-sm font-mono font-semibold mt-0.5 ${getPercentColor(c.value)}`}>
                    {c.value === 0 ? '—' : formatPercent(c.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">LIQ</div>
                <div className="text-sm font-semibold text-xdex-accent font-mono mt-0.5">{formatUsd(token.liquidity)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">FDV</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatUsd(token.fdv)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">MCAP</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatUsd(token.marketCap)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">VOL 24H</div>
                <div className="text-sm font-semibold text-xdex-green font-mono mt-0.5">{formatUsd(token.volume24h)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">TXNS</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatNumber(token.txns24h)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">MAKERS</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatNumber(token.makers)}</div>
              </div>
            </div>
          </div>

          {/* Buy/Sell ratio */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xdex-green font-bold text-sm">{buys}</span>
                <span className="text-[10px] text-xdex-text-muted">Buys {buyPercent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-xdex-text-muted">{sellPercent.toFixed(0)}% Sells</span>
                <span className="text-xdex-red font-bold text-sm">{sells}</span>
              </div>
            </div>
            <div className="buy-sell-bar">
              <div className="buy-portion" style={{ width: `${buyPercent}%` }} />
              <div className="sell-portion" style={{ width: `${sellPercent}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-xdex-green font-mono">{formatUsd(buyVolume)}</span>
              <span className="text-[10px] text-xdex-text-muted">Vol 24h</span>
              <span className="text-[11px] text-xdex-red font-mono">{formatUsd(sellVolume)}</span>
            </div>
          </div>

          {/* Price Calculator */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-3">
              Price Calculator
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-xdex-border bg-black">
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm font-mono outline-none border-none shadow-none min-w-0"
                style={{ boxShadow: 'none' }}
              />
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-xdex-border/30">
                {token.baseToken.symbol}
              </span>
            </div>
            <div className="flex items-center justify-center py-1.5">
              <ArrowUpDown size={12} className="text-xdex-text-muted" />
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-xdex-border bg-black">
              <span className="flex-1 text-white text-sm font-mono">
                {calcResult < 0.01 && calcResult > 0 ? calcResult.toFixed(8) : calcResult.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-xdex-border/30">
                USD
              </span>
            </div>
            <div className="text-[10px] text-xdex-text-muted text-center mt-2 font-mono">
              1 {token.baseToken.symbol} = {formatPrice(token.priceUsd)}
            </div>
          </div>

          {/* Contract & Pool info */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-3">
              Pool Details
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">Created</span>
                <span className="text-xs text-white">{formatAge(token.createdAt)} ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">DEX</span>
                <span className="text-xs text-white">{token.dex}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">{token.baseToken.symbol}</span>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] text-xdex-text-secondary font-mono">
                    {token.baseToken.address.slice(0, 6)}...{token.baseToken.address.slice(-4)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-xdex-text-muted hover:text-xdex-accent transition-colors"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              </div>
              {copied && (
                <div className="text-center">
                  <span className="text-xdex-accent text-[10px]">Copied to clipboard!</span>
                </div>
              )}
            </div>
          </div>

          {/* Swap button */}
          <div className="px-5 py-4">
            <button
              onClick={() => onSwap(token)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-xdex-green/20 text-xdex-green hover:bg-xdex-green/30 text-sm font-semibold transition-colors border border-xdex-green/30"
            >
              <ArrowLeftRight size={14} />
              Swap {token.baseToken.symbol}
            </button>

            {/* Links */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <a
                href="#"
                className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors"
              >
                <Globe size={12} /> Website
              </a>
              <a
                href="#"
                className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors"
              >
                <ExternalLink size={12} /> Explorer
              </a>
            </div>

            {/* Powered by */}
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-xdex-border/40">
              <DegenLogo size={14} color="#555" />
              <span className="text-[10px] text-xdex-text-muted">Powered by Degen Screener</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
