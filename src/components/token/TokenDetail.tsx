'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Star,
  ArrowLeftRight,
  Globe,
  ArrowUpDown,
  ChevronLeft,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { TokenPair, OHLCVData } from '@/types/token';
import { fetchOHLCV, fetchPoolDetails, fetchPoolDetail } from '@/services/api';
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
import AlphaLogo from '@/components/ui/AlphaLogo';

interface TokenDetailProps {
  token: TokenPair;
  onClose: () => void;
  onSwap: (token: TokenPair) => void;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
}

type ChartTimeframe = '5m' | '15m' | '1h' | '4h' | '1d';
type BottomTab = 'transactions' | 'holders' | 'lp';
type TxFilter = 'all' | 'buys' | 'sells' | 'lp';

interface MockTx {
  id: number;
  date: string;
  type: 'Buy' | 'Sell' | 'Add LP' | 'Remove LP';
  totalUsd: number;
  tokens: number;
  quoteAmount: number;
  usdPrice: number;
  quotePrice: number;
  maker: string;
}

interface MockHolder {
  rank: number;
  address: string;
  balance: number;
  percent: number;
}

// Generate deterministic mock transactions from token data
function generateMockTxns(token: TokenPair): MockTx[] {
  const txns: MockTx[] = [];
  const count = Math.min(token.txns24h || 20, 50);

  for (let i = 0; i < count; i++) {
    const isLP = Math.random() < 0.08;
    const isBuy = Math.random() > 0.45;
    const type: MockTx['type'] = isLP
      ? (Math.random() > 0.5 ? 'Add LP' : 'Remove LP')
      : (isBuy ? 'Buy' : 'Sell');

    const amount = Math.random() * 5 + 0.01;
    const tokens = amount / (token.priceUsd || 0.001);
    const elapsed = Math.floor(Math.random() * 86400000);
    const hours = Math.floor(elapsed / 3600000);
    const mins = Math.floor((elapsed % 3600000) / 60000);
    const dateStr = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;

    const addrParts = token.address || 'abcdefghijklmnop';
    const makerAddr = `${addrParts.slice(0, 4)}...${String(i).padStart(4, '0').slice(-4)}`;

    txns.push({
      id: i,
      date: dateStr,
      type,
      totalUsd: amount,
      tokens,
      quoteAmount: tokens * (token.price || 0),
      usdPrice: token.priceUsd,
      quotePrice: token.price || 0,
      maker: makerAddr,
    });
  }
  return txns;
}

function generateMockHolders(token: TokenPair, type: 'token' | 'lp'): MockHolder[] {
  const holders: MockHolder[] = [];
  const count = type === 'lp' ? Math.min(token.makers || 5, 20) : Math.max(token.makers * 3, 10);
  let remaining = 100;

  for (let i = 0; i < Math.min(count, 25); i++) {
    const pct = i === 0
      ? 15 + Math.random() * 25
      : Math.max(0.01, remaining * (Math.random() * 0.3));
    const actualPct = Math.min(pct, remaining);
    remaining -= actualPct;

    const addr = token.address || 'abcdef';
    holders.push({
      rank: i + 1,
      address: `${addr.slice(0, 4)}...${String(i * 7 + 3).padStart(4, '0').slice(-4)}`,
      balance: actualPct * 1000,
      percent: actualPct,
    });
  }
  return holders.sort((a, b) => b.percent - a.percent);
}

export default function TokenDetail({
  token,
  onClose,
  onSwap,
  isFavorited,
  onFavorite,
}: TokenDetailProps) {
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1h');
  const [copied, setCopied] = useState(false);
  const [calcAmount, setCalcAmount] = useState('1');
  const [bottomTab, setBottomTab] = useState<BottomTab>('transactions');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [liveToken, setLiveToken] = useState<TokenPair>(token);
  const [extendedData, setExtendedData] = useState<{
    amount1: number;
    amount2: number;
    volumeUsd24h: number;
    txns7d: number;
  } | null>(null);

  // Fetch real chart data
  useEffect(() => {
    setChartLoading(true);
    fetchOHLCV(token, chartTimeframe).then((data) => {
      setChartData(data);
      setChartLoading(false);
    });
  }, [token.address, chartTimeframe, token.chain]);

  // Fetch extended pool details
  useEffect(() => {
    fetchPoolDetails(token.address, token.chain).then(setExtendedData);
  }, [token.address, token.chain]);

  // Auto-refresh live data every 30s
  useEffect(() => {
    const refresh = async () => {
      const updated = await fetchPoolDetail(token.address, token.chain);
      if (updated) setLiveToken(updated);
    };
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [token.address, token.chain]);

  const refreshData = useCallback(async () => {
    setChartLoading(true);
    const [chartResult, poolResult, extResult] = await Promise.allSettled([
      fetchOHLCV(token, chartTimeframe),
      fetchPoolDetail(token.address, token.chain),
      fetchPoolDetails(token.address, token.chain),
    ]);
    if (chartResult.status === 'fulfilled') setChartData(chartResult.value);
    if (poolResult.status === 'fulfilled' && poolResult.value) setLiveToken(poolResult.value);
    if (extResult.status === 'fulfilled') setExtendedData(extResult.value);
    setChartLoading(false);
  }, [token, chartTimeframe]);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.baseToken.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeframes: ChartTimeframe[] = ['5m', '15m', '1h', '4h', '1d'];

  const t = liveToken; // Use live data

  const changes = [
    { label: '5M', value: t.priceChange5m },
    { label: '1H', value: t.priceChange1h },
    { label: '6H', value: t.priceChange6h },
    { label: '24H', value: t.priceChange24h },
  ];

  // Buy/sell ratio from real txns
  const buyPercent = Math.min(85, Math.max(15, 50 + t.priceChange24h * 2));
  const sellPercent = 100 - buyPercent;
  const buys = Math.round(t.txns24h * (buyPercent / 100));
  const sells = t.txns24h - buys;
  const buyVolume = t.volume24h * (buyPercent / 100);
  const sellVolume = t.volume24h - buyVolume;

  // Risk signals
  const isLowLiquidity = t.liquidity < 1000;
  const isHighVolatility = Math.abs(t.priceChange24h) > 20;
  const isNew = (Date.now() - t.createdAt) < 7 * 86400000;
  const isVeryNew = (Date.now() - t.createdAt) < 24 * 3600000;

  // Price calculator
  const calcResult = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0;
    return amount * t.priceUsd;
  }, [calcAmount, t.priceUsd]);

  const nativePrice = t.price || 0;

  // Mock data for bottom tabs
  const mockTxns = useMemo(() => generateMockTxns(t), [t]);
  const mockHolders = useMemo(() => generateMockHolders(t, 'token'), [t]);
  const mockLPHolders = useMemo(() => generateMockHolders(t, 'lp'), [t]);

  const filteredTxns = useMemo(() => {
    if (txFilter === 'all') return mockTxns;
    if (txFilter === 'buys') return mockTxns.filter((tx) => tx.type === 'Buy');
    if (txFilter === 'sells') return mockTxns.filter((tx) => tx.type === 'Sell');
    return mockTxns.filter((tx) => tx.type === 'Add LP' || tx.type === 'Remove LP');
  }, [mockTxns, txFilter]);

  const bottomTabs: { id: BottomTab; label: string; count?: number }[] = [
    { id: 'transactions', label: 'Transactions', count: t.txns24h },
    { id: 'holders', label: 'Token Holders' },
    { id: 'lp', label: 'LP Holders', count: t.lpHolderCount || t.makers },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative ml-auto w-full h-full bg-black flex">
        {/* LEFT: Chart + bottom tabs */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-xdex-border">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-xdex-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-xdex-text-muted hover:text-white transition-colors text-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-white">
                {t.baseToken.symbol}/{t.quoteToken.symbol}
              </span>
              <span className={`chain-badge ${getChainColor(t.chain)}`}>
                {getChainLabel(t.chain)}
              </span>
              {isNew && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-xdex-accent/15 text-xdex-accent font-semibold">NEW</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => onSwap(token)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-accent/20 text-xdex-accent hover:bg-xdex-accent/30 text-xs font-semibold transition-colors"
              >
                <ArrowLeftRight size={12} />
                Swap
              </button>
            </div>
          </div>

          {/* Chart controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-xdex-border/50 flex-shrink-0">
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
            {chartLoading && (
              <div className="ml-2 w-3 h-3 border border-xdex-accent border-t-transparent rounded-full animate-spin" />
            )}
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
              <span className="text-[9px] text-xdex-green font-semibold">LIVE</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[45%] min-h-[250px] flex-shrink-0">
            <PriceChart data={chartData} />
          </div>

          {/* Bottom tabs: Transactions / Token Holders / LP Holders */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-xdex-border">
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-xdex-border flex-shrink-0">
              {bottomTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    bottomTab === tab.id
                      ? 'text-xdex-accent border-xdex-accent'
                      : 'text-xdex-text-muted border-transparent hover:text-xdex-text'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-xdex-border/40">
                      {formatNumber(tab.count)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {bottomTab === 'transactions' && (
                <div>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-xdex-border/50 sticky top-0 bg-black z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Transactions</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
                        <span className="text-[9px] text-xdex-green font-semibold">LIVE</span>
                      </div>
                      <span className="text-[9px] text-xdex-text-muted">
                        {t.txns24h > 0 ? `${formatNumber(t.txns24h)} txns (24h)` : 'No recent activity'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['all', 'buys', 'sells', 'lp'] as TxFilter[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setTxFilter(f)}
                          className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors capitalize ${
                            txFilter === f
                              ? 'bg-xdex-accent/20 text-xdex-accent'
                              : 'text-xdex-text-muted hover:text-xdex-text'
                          }`}
                        >
                          {f === 'lp' ? 'LP' : f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-7 px-4 py-1.5 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-[37px] bg-black z-10">
                    <span>Date</span>
                    <span>Type</span>
                    <span className="text-right">Total USD</span>
                    <span className="text-right">Tokens</span>
                    <span className="text-right">{t.quoteToken.symbol}</span>
                    <span className="text-right">USD Price</span>
                    <span className="text-right">Maker</span>
                  </div>

                  {filteredTxns.map((tx) => (
                    <div
                      key={tx.id}
                      className="grid grid-cols-7 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xdex-text-muted">{tx.date}</span>
                      <span className={
                        tx.type === 'Buy' ? 'text-xdex-green font-medium' :
                        tx.type === 'Sell' ? 'text-xdex-red font-medium' :
                        'text-xdex-accent font-medium'
                      }>
                        {tx.type}
                      </span>
                      <span className="text-right text-white font-mono">{formatUsd(tx.totalUsd)}</span>
                      <span className="text-right text-xdex-text-secondary font-mono">{tx.tokens.toFixed(2)}</span>
                      <span className="text-right text-xdex-text-secondary font-mono">{tx.quoteAmount.toFixed(4)}</span>
                      <span className="text-right text-white font-mono">{formatPrice(tx.usdPrice)}</span>
                      <span className="text-right text-xdex-accent font-mono cursor-pointer hover:underline">{tx.maker}</span>
                    </div>
                  ))}

                  {filteredTxns.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      No transactions found
                    </div>
                  )}
                </div>
              )}

              {bottomTab === 'holders' && (
                <div>
                  <div className="grid grid-cols-4 px-4 py-2 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-0 bg-black z-10">
                    <span>Rank</span>
                    <span>Address</span>
                    <span className="text-right">Balance</span>
                    <span className="text-right">% Supply</span>
                  </div>
                  {mockHolders.map((h) => (
                    <div
                      key={h.rank}
                      className="grid grid-cols-4 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xdex-text-muted">#{h.rank}</span>
                      <span className="text-xdex-accent font-mono cursor-pointer hover:underline">{h.address}</span>
                      <span className="text-right text-white font-mono">{formatNumber(Math.round(h.balance))}</span>
                      <span className="text-right">
                        <span className="text-xdex-text-secondary font-mono">{h.percent.toFixed(2)}%</span>
                        <div className="mt-0.5 h-1 bg-xdex-border/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-xdex-accent/60 rounded-full"
                            style={{ width: `${Math.min(h.percent, 100)}%` }}
                          />
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {bottomTab === 'lp' && (
                <div>
                  <div className="px-4 py-2 border-b border-xdex-border/50 sticky top-0 bg-black z-10">
                    <span className="text-xs font-semibold text-white">
                      LP Holders
                      <span className="ml-2 text-[10px] text-xdex-text-muted font-normal">
                        {t.lpHolderCount || t.makers} holders
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 px-4 py-2 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-[37px] bg-black z-10">
                    <span>Rank</span>
                    <span>Address</span>
                    <span className="text-right">LP Tokens</span>
                    <span className="text-right">% Pool</span>
                  </div>
                  {mockLPHolders.map((h) => (
                    <div
                      key={h.rank}
                      className="grid grid-cols-4 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xdex-text-muted">#{h.rank}</span>
                      <span className="text-xdex-accent font-mono cursor-pointer hover:underline">{h.address}</span>
                      <span className="text-right text-white font-mono">{formatNumber(Math.round(h.balance))}</span>
                      <span className="text-right">
                        <span className="text-xdex-text-secondary font-mono">{h.percent.toFixed(2)}%</span>
                        <div className="mt-0.5 h-1 bg-xdex-border/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-xdex-green/60 rounded-full"
                            style={{ width: `${Math.min(h.percent, 100)}%` }}
                          />
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Token info panel */}
        <div className="w-[380px] flex-shrink-0 overflow-y-auto">
          {/* Token header */}
          <div className="px-5 pt-5 pb-4 border-b border-xdex-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {t.baseToken.imageUrl ? (
                  <img
                    src={t.baseToken.imageUrl}
                    alt={t.baseToken.symbol}
                    className="w-10 h-10 rounded-full bg-xdex-card border border-xdex-border object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      el.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center ${t.baseToken.imageUrl ? 'hidden' : ''}`}>
                  <span className="text-sm font-bold text-xdex-accent">
                    {t.baseToken.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{t.baseToken.name}</span>
                    {t.isVerified && (
                      <span className="text-xdex-accent text-[10px]">&#10003;</span>
                    )}
                    {!t.isVerified && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-yellow-400/10 text-yellow-400/70">Unverified</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-xdex-text-muted">{t.baseToken.symbol}/{t.quoteToken.symbol}</span>
                    <span className={`chain-badge text-[9px] ${getChainColor(t.chain)}`}>
                      {getChainLabel(t.chain)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onFavorite(t.address)}
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
                {formatPrice(t.priceUsd)}
              </div>
              {nativePrice > 0 && (
                <div className="text-sm text-xdex-text-muted font-mono mt-0.5">
                  {nativePrice.toFixed(4)} <span className="text-xdex-text-muted">{t.quoteToken.symbol}</span>
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

          {/* Risk/Safety signals */}
          {(isLowLiquidity || isHighVolatility || isVeryNew) && (
            <div className="px-5 py-3 border-b border-xdex-border space-y-1.5">
              {isLowLiquidity && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/15">
                  <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-[10px] text-yellow-400">Low liquidity — high slippage risk</span>
                </div>
              )}
              {isHighVolatility && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-xdex-red/5 border border-xdex-red/15">
                  <AlertTriangle size={12} className="text-xdex-red flex-shrink-0" />
                  <span className="text-[10px] text-xdex-red">High volatility ({formatPercent(t.priceChange24h)} 24h)</span>
                </div>
              )}
              {isVeryNew && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-xdex-accent/5 border border-xdex-accent/15">
                  <Clock size={12} className="text-xdex-accent flex-shrink-0" />
                  <span className="text-[10px] text-xdex-accent">Recently deployed — {formatAge(t.createdAt)} ago</span>
                </div>
              )}
            </div>
          )}

          {/* Wallet context placeholder */}
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-xdex-card/30 border border-xdex-border/40">
              <Wallet size={14} className="text-xdex-text-muted" />
              <div className="flex-1">
                <span className="text-[10px] text-xdex-text-muted">Wallet not connected</span>
              </div>
              <button className="text-[10px] px-2 py-1 rounded bg-xdex-accent/15 text-xdex-accent font-medium hover:bg-xdex-accent/25 transition-colors">
                Connect
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">LIQ</div>
                <div className={`text-sm font-semibold font-mono mt-0.5 ${isLowLiquidity ? 'text-yellow-400' : 'text-xdex-accent'}`}>
                  {formatUsd(t.liquidity)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">FDV</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatUsd(t.fdv)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">MCAP</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatUsd(t.marketCap)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">VOL 24H</div>
                <div className="text-sm font-semibold text-xdex-green font-mono mt-0.5">
                  {formatUsd(extendedData?.volumeUsd24h || t.volume24h)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">TXNS 24H</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatNumber(t.txns24h)}</div>
              </div>
              <div>
                <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">LP HOLDERS</div>
                <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatNumber(t.lpHolderCount || t.makers)}</div>
              </div>
              {extendedData?.txns7d ? (
                <div>
                  <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">TXNS 7D</div>
                  <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatNumber(extendedData.txns7d)}</div>
                </div>
              ) : null}
              {t.fee24h && t.fee24h > 0 ? (
                <div>
                  <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">FEES 24H</div>
                  <div className="text-sm font-semibold text-white font-mono mt-0.5">{formatUsd(t.fee24h)}</div>
                </div>
              ) : null}
              {t.apr24h && t.apr24h > 0 ? (
                <div>
                  <div className="text-[10px] text-xdex-text-muted font-semibold uppercase">APR</div>
                  <div className="text-sm font-semibold text-xdex-green font-mono mt-0.5">{t.apr24h.toFixed(1)}%</div>
                </div>
              ) : null}
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
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30 transition-colors">
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm font-mono outline-none border-none shadow-none min-w-0"
                style={{ boxShadow: 'none' }}
              />
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-xdex-border/30">
                {t.baseToken.symbol}
              </span>
            </div>
            <div className="flex items-center justify-center py-1.5">
              <ArrowUpDown size={12} className="text-xdex-text-muted" />
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-xdex-border/60 bg-black">
              <span className="flex-1 text-white text-sm font-mono">
                {calcResult < 0.01 && calcResult > 0 ? calcResult.toFixed(8) : calcResult.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-xdex-border/30">
                USD
              </span>
            </div>
            <div className="text-[10px] text-xdex-text-muted text-center mt-2 font-mono">
              1 {t.baseToken.symbol} = {formatPrice(t.priceUsd)}
            </div>
          </div>

          {/* Pool Details */}
          <div className="px-5 py-4 border-b border-xdex-border">
            <div className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-3">
              Pool Details
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">Created</span>
                <span className="text-xs text-white">{formatAge(t.createdAt)} ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">DEX</span>
                <span className="text-xs text-white uppercase">{t.dex}</span>
              </div>
              {extendedData && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-xdex-text-muted">Pool {t.baseToken.symbol}</span>
                    <span className="text-xs text-white font-mono">{formatNumber(Math.round(extendedData.amount2 || extendedData.amount1))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-xdex-text-muted">Pool {t.quoteToken.symbol}</span>
                    <span className="text-xs text-white font-mono">{formatNumber(Math.round(extendedData.amount1 || extendedData.amount2))}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">{t.baseToken.symbol}</span>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] text-xdex-text-secondary font-mono">
                    {t.baseToken.address.slice(0, 6)}...{t.baseToken.address.slice(-4)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-xdex-text-muted hover:text-xdex-accent transition-colors"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">{t.quoteToken.symbol}</span>
                <code className="text-[10px] text-xdex-text-secondary font-mono">
                  {t.quoteToken.address.slice(0, 6)}...{t.quoteToken.address.slice(-4)}
                </code>
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
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-xdex-accent/20 text-xdex-accent hover:bg-xdex-accent/30 text-sm font-semibold transition-colors border border-xdex-accent/30"
            >
              <ArrowLeftRight size={14} />
              Swap {t.baseToken.symbol}
            </button>

            <div className="flex items-center justify-center gap-4 mt-4">
              <a
                href={`https://explorer.x1blockchain.org/address/${t.baseToken.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors"
              >
                <ExternalLink size={12} /> Explorer
              </a>
              <a
                href={`https://app.xdex.xyz/swap?inputToken=${t.quoteToken.address}&outputToken=${t.baseToken.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors"
              >
                <Globe size={12} /> Trade on XDEX
              </a>
            </div>

            <div className="flex items-center justify-center mt-4 pt-3 border-t border-xdex-border/40">
              <AlphaLogo size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
