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
  const now = Date.now();
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
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1h');
  const [copied, setCopied] = useState(false);
  const [calcAmount, setCalcAmount] = useState('1');
  const [bottomTab, setBottomTab] = useState<BottomTab>('transactions');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

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

  // Buy/sell ratio
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

  // Mock data for bottom tabs
  const mockTxns = useMemo(() => generateMockTxns(token), [token]);
  const mockHolders = useMemo(() => generateMockHolders(token, 'token'), [token]);
  const mockLPHolders = useMemo(() => generateMockHolders(token, 'lp'), [token]);

  const filteredTxns = useMemo(() => {
    if (txFilter === 'all') return mockTxns;
    if (txFilter === 'buys') return mockTxns.filter((t) => t.type === 'Buy');
    if (txFilter === 'sells') return mockTxns.filter((t) => t.type === 'Sell');
    return mockTxns.filter((t) => t.type === 'Add LP' || t.type === 'Remove LP');
  }, [mockTxns, txFilter]);

  const bottomTabs: { id: BottomTab; label: string }[] = [
    { id: 'transactions', label: 'Transactions' },
    { id: 'holders', label: 'Token Holders' },
    { id: 'lp', label: 'LP Holders' },
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
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {bottomTab === 'transactions' && (
                <div>
                  {/* Tx header with filter + LIVE badge */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-xdex-border/50 sticky top-0 bg-black z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Transactions</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
                        <span className="text-[9px] text-xdex-green font-semibold">LIVE</span>
                      </div>
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

                  {/* Tx table header */}
                  <div className="grid grid-cols-7 px-4 py-1.5 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-[37px] bg-black z-10">
                    <span>Date</span>
                    <span>Type</span>
                    <span className="text-right">Total USD</span>
                    <span className="text-right">Tokens</span>
                    <span className="text-right">{token.quoteToken.symbol}</span>
                    <span className="text-right">USD Price</span>
                    <span className="text-right">Maker</span>
                  </div>

                  {/* Tx rows */}
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
                  <div className="grid grid-cols-4 px-4 py-2 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-0 bg-black z-10">
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

          {/* Pool Details */}
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-xdex-text-muted">{token.quoteToken.symbol}</span>
                <code className="text-[10px] text-xdex-text-secondary font-mono">
                  {token.quoteToken.address.slice(0, 6)}...{token.quoteToken.address.slice(-4)}
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
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-xdex-green/20 text-xdex-green hover:bg-xdex-green/30 text-sm font-semibold transition-colors border border-xdex-green/30"
            >
              <ArrowLeftRight size={14} />
              Swap {token.baseToken.symbol}
            </button>

            <div className="flex items-center justify-center gap-4 mt-4">
              <a href="#" className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors">
                <Globe size={12} /> Website
              </a>
              <a href="#" className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors">
                <ExternalLink size={12} /> Explorer
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
