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
  Zap,
  ThumbsUp,
  ThumbsDown,
  Bell,
  Share2,
  Shield,
  Trash2,
  CandlestickChart,
  LineChart,
  AreaChart,
  Maximize2,
  Minimize2,
  Users,
  Activity,
  TrendingUp,
  Fish,
  Award,
} from 'lucide-react';
import { TokenPair, OHLCVData } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { fetchOHLCV, fetchPoolDetails, fetchPoolDetail } from '@/services/api';
import { fetchTokenHolders, fetchLPHolders, fetchRecentPoolTxns, TokenHolder, PoolTransaction, PoolTxSummary } from '@/services/rpc';
import { computeSafetyScore } from '@/utils/safetyScore';
import { getSentiment, vote as voteSentiment, Sentiment } from '@/services/sentimentStore';
import { createAlert, getAlertsForToken, deleteAlert, requestNotificationPermission, PriceAlert } from '@/services/alertStore';
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
import { analyzeRugRisk } from '@/utils/rugDetector';
import PriceChart, { ChartType } from '@/components/chart/PriceChart';

interface TokenDetailProps {
  token: TokenPair;
  onClose: () => void;
  onSwap: (token: TokenPair) => void;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
  boost?: ActiveBoost | null;
}

type ChartTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '7d' | '30d';
type BottomTab = 'transactions' | 'volume' | 'topTraders' | 'holders' | 'lp' | 'info';
type TxFilter = 'all' | 'buys' | 'sells' | 'lp';

// Whale category icons
function getTraderCategory(volumeUsd: number): { label: string; icon: string; color: string } {
  if (volumeUsd >= 10000) return { label: 'Whale', icon: '🐋', color: 'text-blue-400' };
  if (volumeUsd >= 1000) return { label: 'Dolphin', icon: '🐬', color: 'text-cyan-400' };
  if (volumeUsd >= 250) return { label: 'Shrimp', icon: '🦐', color: 'text-orange-400' };
  if (volumeUsd >= 10) return { label: 'Fish', icon: '🐟', color: 'text-green-400' };
  return { label: 'Plankton', icon: '🦠', color: 'text-gray-400' };
}

function formatTxAge(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getExplorerUrl(chain: string): string {
  return chain === 'x1' ? 'https://explorer.x1.xyz' : 'https://solscan.io';
}

export default function TokenDetail({
  token,
  onClose,
  onSwap,
  isFavorited,
  onFavorite,
  boost,
}: TokenDetailProps) {
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1h');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [chartFullscreen, setChartFullscreen] = useState(false);
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

  // Sync liveToken when token prop changes
  useEffect(() => {
    setLiveToken(token);
    setExtendedData(null);
  }, [token.address]);

  // Sentiment state
  const [sentiment, setSentiment] = useState(() => getSentiment(token.address));
  useEffect(() => {
    setSentiment(getSentiment(token.address));
  }, [token.address]);

  // Alert state
  const [tokenAlerts, setTokenAlerts] = useState<PriceAlert[]>(() => getAlertsForToken(token.address));
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);

  useEffect(() => {
    setTokenAlerts(getAlertsForToken(token.address));
    setAlertPrice('');
    setShowAlertForm(false);
  }, [token.address]);

  const [shareCopied, setShareCopied] = useState(false);

  // Fetch chart data
  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    const tfMap: Record<string, string> = { '1m': '5m', '7d': '1d', '30d': '1d' };
    const tf = tfMap[chartTimeframe] || chartTimeframe;
    fetchOHLCV(token, tf).then((data) => {
      if (!cancelled) {
        setChartData(data);
        setChartLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.address, chartTimeframe, token.chain]);

  // Fetch extended pool details
  useEffect(() => {
    let cancelled = false;
    fetchPoolDetails(token.address, token.chain).then((data) => {
      if (!cancelled) setExtendedData(data);
    });
    return () => { cancelled = true; };
  }, [token.address, token.chain]);

  // Auto-refresh live data every 30s
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const updated = await fetchPoolDetail(token.address, token.chain);
      if (updated && !cancelled) setLiveToken(updated);
    };
    const interval = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token.address, token.chain]);

  const refreshData = useCallback(async () => {
    setChartLoading(true);
    const tfMapR: Record<string, string> = { '1m': '5m', '7d': '1d', '30d': '1d' };
    const tf = tfMapR[chartTimeframe] || chartTimeframe;
    const [chartResult, poolResult, extResult] = await Promise.allSettled([
      fetchOHLCV(token, tf),
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

  const handleVote = (s: Sentiment) => {
    const result = voteSentiment(token.address, s);
    setSentiment(result);
  };

  const handleCreateAlert = () => {
    const price = parseFloat(alertPrice);
    if (!price || price <= 0) return;
    createAlert({
      tokenAddress: token.address,
      tokenSymbol: token.baseToken.symbol,
      condition: alertCondition,
      targetPrice: price,
    });
    requestNotificationPermission();
    setTokenAlerts(getAlertsForToken(token.address));
    setAlertPrice('');
    setShowAlertForm(false);
  };

  const handleDeleteAlert = (id: string) => {
    deleteAlert(id);
    setTokenAlerts(getAlertsForToken(token.address));
  };

  const handleShare = () => {
    const url = `${window.location.origin}?token=${token.address}&chain=${token.chain}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const chartTimeframes: { value: ChartTimeframe; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ];

  const chartTypes: { value: ChartType; label: string; icon: typeof CandlestickChart }[] = [
    { value: 'candles', label: 'Candles', icon: CandlestickChart },
    { value: 'line', label: 'Line', icon: LineChart },
    { value: 'area', label: 'Area', icon: AreaChart },
  ];

  const t = liveToken;

  const changes = [
    { label: '5M', value: t.priceChange5m },
    { label: '1H', value: t.priceChange1h },
    { label: '6H', value: t.priceChange6h },
    { label: '24H', value: t.priceChange24h },
  ];

  // Real on-chain data states
  const [poolTxns, setPoolTxns] = useState<PoolTxSummary | null>(null);
  const [tokenHolders, setTokenHolders] = useState<TokenHolder[]>([]);
  const [lpHolders, setLpHolders] = useState<TokenHolder[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(true);
  const [holdersLoading, setHoldersLoading] = useState(true);

  // Fetch real transactions
  useEffect(() => {
    let cancelled = false;
    setTxnsLoading(true);
    fetchRecentPoolTxns(token.address, token.chain, 50).then((data) => {
      if (!cancelled) {
        setPoolTxns(data);
        setTxnsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.address, token.chain]);

  // Fetch holders
  useEffect(() => {
    let cancelled = false;
    setHoldersLoading(true);
    const lpMint = token.lpMint || '';
    Promise.allSettled([
      fetchTokenHolders(token.baseToken.address, token.chain),
      lpMint ? fetchLPHolders(lpMint, token.chain) : Promise.resolve([]),
    ]).then(([tokenResult, lpResult]) => {
      if (!cancelled) {
        setTokenHolders(tokenResult.status === 'fulfilled' ? tokenResult.value : []);
        setLpHolders(lpResult.status === 'fulfilled' ? lpResult.value : []);
        setHoldersLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.baseToken.address, token.chain]);

  // Buy/sell data
  const buys = poolTxns?.buys ?? 0;
  const sells = poolTxns?.sells ?? 0;
  const buyVolume = poolTxns?.buyVolume ?? 0;
  const sellVolume = poolTxns?.sellVolume ?? 0;
  const totalTxCount = buys + sells;
  const buyPercent = totalTxCount > 0 ? (buys / totalTxCount) * 100 : 50;
  const sellPercent = 100 - buyPercent;

  const isNew = (Date.now() - t.createdAt) < 7 * 86400000;

  const calcResult = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0;
    return amount * t.priceUsd;
  }, [calcAmount, t.priceUsd]);

  const nativePrice = t.price || 0;
  const safety = useMemo(() => computeSafetyScore(t), [t]);
  const rugAnalysis = useMemo(() => analyzeRugRisk(t), [t]);
  const sentimentTotal = sentiment.bullish + sentiment.bearish;
  const bullishPct = sentimentTotal > 0 ? (sentiment.bullish / sentimentTotal) * 100 : 50;
  const explorerBase = getExplorerUrl(t.chain);

  const filteredTxns = useMemo(() => {
    const txns = poolTxns?.transactions ?? [];
    if (txFilter === 'all') return txns;
    if (txFilter === 'buys') return txns.filter((tx) => tx.type === 'Buy');
    if (txFilter === 'sells') return txns.filter((tx) => tx.type === 'Sell');
    return txns.filter((tx) => tx.type === 'Add LP' || tx.type === 'Remove LP');
  }, [poolTxns, txFilter]);

  // Top traders: aggregate buy/sell per maker from transactions
  const topTraders = useMemo(() => {
    const txns = poolTxns?.transactions ?? [];
    const map = new Map<string, { address: string; bought: number; sold: number; txCount: number; lastSeen: number }>();
    txns.forEach((tx) => {
      const existing = map.get(tx.maker) || { address: tx.maker, bought: 0, sold: 0, txCount: 0, lastSeen: 0 };
      if (tx.type === 'Buy') existing.bought += tx.totalUsd;
      if (tx.type === 'Sell') existing.sold += tx.totalUsd;
      existing.txCount++;
      existing.lastSeen = Math.max(existing.lastSeen, tx.timestamp);
      map.set(tx.maker, existing);
    });
    return [...map.values()]
      .sort((a, b) => (b.bought + b.sold) - (a.bought + a.sold))
      .slice(0, 50);
  }, [poolTxns]);

  const bottomTabs: { id: BottomTab; label: string; icon: typeof Activity; count?: number }[] = [
    { id: 'transactions', label: 'Txns', icon: Activity, count: t.txns24h },
    { id: 'volume', label: 'Volume', icon: TrendingUp },
    { id: 'topTraders', label: 'Top Traders', icon: Award },
    { id: 'holders', label: 'Holders', icon: Users },
    { id: 'lp', label: 'LP Holders', icon: Users, count: t.lpHolderCount || t.makers },
    { id: 'info', label: 'Info', icon: Globe },
  ];

  const isLowLiquidity = t.liquidity < 1000;
  const liquidityDepth = t.liquidity >= 100000 ? 'deep' : t.liquidity >= 10000 ? 'moderate' : t.liquidity >= 1000 ? 'shallow' : 'thin';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative ml-auto w-full h-full bg-black flex">
        {/* ========= LEFT: Chart + Tabs ========= */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#222]">
          {/* Top header bar */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-[#222] flex-shrink-0 bg-black">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="flex items-center text-xdex-text-muted hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>

              {t.baseToken.imageUrl ? (
                <img src={t.baseToken.imageUrl} alt={t.baseToken.symbol} className="w-7 h-7 rounded-full border border-[#333] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
                  <span className="text-xs font-bold text-xdex-accent">{t.baseToken.symbol.charAt(0)}</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{t.baseToken.symbol}</span>
                  <span className="text-sm text-xdex-text-muted">/ {t.quoteToken.symbol}</span>
                  <span className={`chain-badge text-[9px] ${getChainColor(t.chain)}`}>{getChainLabel(t.chain)}</span>
                  {isNew && <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-accent/15 text-xdex-accent font-semibold">NEW</span>}
                </div>
              </div>

              <div className="ml-4 flex items-center gap-3">
                <span className="text-lg font-bold text-white font-mono">{formatPrice(t.priceUsd)}</span>
                <span className={`text-sm font-mono font-semibold ${getPercentColor(t.priceChange24h)}`}>
                  {formatPercent(t.priceChange24h)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={handleShare} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-[#111] transition-colors" title="Share">
                {shareCopied ? <span className="text-[10px] text-xdex-accent">Copied!</span> : <Share2 size={14} />}
              </button>
              <button onClick={() => onFavorite(t.address)} className={`p-1.5 rounded-lg hover:bg-[#111] transition-colors ${isFavorited ? 'text-[#facc15]' : 'text-xdex-text-muted'}`}>
                <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
              <button onClick={refreshData} className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-[#111] transition-colors" title="Refresh">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => onSwap(token)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-accent text-white hover:brightness-110 text-xs font-semibold transition-all ml-1">
                <ArrowLeftRight size={12} />
                Swap
              </button>
            </div>
          </div>

          {/* Chart controls bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#222] flex-shrink-0 bg-[#060606]">
            {/* Timeframes */}
            <div className="flex items-center bg-[#111] rounded-lg p-0.5 border border-[#222]">
              {chartTimeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setChartTimeframe(tf.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartTimeframe === tf.value
                      ? 'bg-xdex-accent text-white'
                      : 'text-xdex-text-muted hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-[#333] mx-1" />

            {/* Chart type toggle */}
            <div className="flex items-center bg-[#111] rounded-lg p-0.5 border border-[#222]">
              {chartTypes.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`p-1.5 rounded-md transition-all ${
                      chartType === ct.value
                        ? 'bg-xdex-accent/20 text-xdex-accent'
                        : 'text-xdex-text-muted hover:text-white'
                    }`}
                    title={ct.label}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-[#333] mx-1" />

            {/* Indicators placeholder */}
            <button className="px-2.5 py-1 text-xs text-xdex-text-muted hover:text-white rounded-md hover:bg-[#111] transition-colors">
              Indicators
            </button>

            <div className="flex-1" />

            {/* Loading + Live + Fullscreen */}
            {chartLoading && (
              <div className="w-3.5 h-3.5 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
            )}
            <div className="flex items-center gap-1 mr-2">
              <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
              <span className="text-[10px] text-xdex-green font-semibold">LIVE</span>
            </div>
            <button
              onClick={() => setChartFullscreen(!chartFullscreen)}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-[#111] transition-colors"
              title={chartFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {chartFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

          {/* Chart area */}
          <div className={`flex-shrink-0 ${chartFullscreen ? 'flex-1' : 'h-[50%] min-h-[280px]'}`}>
            <PriceChart data={chartData} chartType={chartType} />
          </div>

          {/* Bottom tabs area (hidden when chart is fullscreen) */}
          {!chartFullscreen && (
            <div className="flex-1 flex flex-col min-h-0 border-t border-[#222]">
              {/* Tab bar */}
              <div className="flex items-center border-b border-[#222] flex-shrink-0 bg-[#060606]">
                {bottomTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                        bottomTab === tab.id
                          ? 'text-xdex-accent border-xdex-accent'
                          : 'text-xdex-text-muted border-transparent hover:text-white'
                      }`}
                    >
                      <Icon size={13} />
                      {tab.label}
                      {tab.count != null && tab.count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#222]">
                          {formatNumber(tab.count)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Tx filter buttons when on transactions tab */}
                {bottomTab === 'transactions' && (
                  <div className="flex items-center gap-1 ml-auto mr-3">
                    {(['all', 'buys', 'sells', 'lp'] as TxFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTxFilter(f)}
                        className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors capitalize ${
                          txFilter === f
                            ? f === 'buys' ? 'bg-xdex-green/15 text-xdex-green' :
                              f === 'sells' ? 'bg-xdex-red/15 text-xdex-red' :
                              'bg-xdex-accent/15 text-xdex-accent'
                            : 'text-xdex-text-muted hover:text-white hover:bg-[#111]'
                        }`}
                      >
                        {f === 'lp' ? 'LP' : f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {/* === TRANSACTIONS TAB === */}
                {bottomTab === 'transactions' && (
                  <div>
                    <div className="grid grid-cols-7 gap-2 px-4 py-2.5 text-xs text-xdex-text-muted font-semibold uppercase border-b border-[#222] sticky top-0 bg-black z-10">
                      <span>Time</span>
                      <span>Type</span>
                      <span className="text-right">Price USD</span>
                      <span className="text-right">Total USD</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Maker</span>
                      <span className="text-right">TX</span>
                    </div>

                    {txnsLoading ? (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">
                        <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                        Loading on-chain transactions...
                      </div>
                    ) : (
                      <>
                        {filteredTxns.map((tx) => {
                          const isBuy = tx.type === 'Buy';
                          const isSell = tx.type === 'Sell';
                          const rowColor = isBuy ? 'text-xdex-green' : isSell ? 'text-xdex-red' : 'text-xdex-accent';
                          const ts = new Date(tx.timestamp);
                          const timeStr = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;
                          return (
                            <div
                              key={tx.signature}
                              className="grid grid-cols-7 gap-2 px-4 py-2.5 text-[13px] border-b border-[#111] hover:bg-white/[0.02] transition-colors"
                            >
                              <span className="text-xdex-text-muted font-mono text-xs">
                                <div>{formatTxAge(tx.timestamp)}</div>
                                <div className="text-[10px] text-xdex-text-muted/60">{timeStr}</div>
                              </span>
                              <span className={`${rowColor} font-semibold`}>
                                {tx.type}
                              </span>
                              <span className="text-right text-white font-mono">{formatPrice(t.priceUsd)}</span>
                              <span className={`text-right font-mono font-medium ${rowColor}`}>{formatUsd(tx.totalUsd)}</span>
                              <span className="text-right text-xdex-text-secondary font-mono">{tx.tokenAmount.toFixed(2)}</span>
                              <span className="text-right font-mono">
                                <a href={`${explorerBase}/address/${tx.maker}`} target="_blank" rel="noopener noreferrer" className={`${isBuy ? 'text-xdex-green' : isSell ? 'text-xdex-red' : 'text-xdex-accent'} hover:underline`} onClick={(e) => e.stopPropagation()}>
                                  {tx.maker.slice(0, 4)}...{tx.maker.slice(-4)}
                                </a>
                              </span>
                              <span className="text-right flex justify-end">
                                <a href={`${explorerBase}/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer" className="text-xdex-text-muted hover:text-xdex-accent transition-colors" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink size={13} />
                                </a>
                              </span>
                            </div>
                          );
                        })}
                        {filteredTxns.length === 0 && (
                          <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">No transactions found</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* === VOLUME TAB === */}
                {bottomTab === 'volume' && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">24h Volume</div>
                        <div className="text-lg font-bold text-xdex-green font-mono">{formatUsd(extendedData?.volumeUsd24h || t.volume24h)}</div>
                      </div>
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">Buy Volume</div>
                        <div className="text-lg font-bold text-xdex-green font-mono">{formatUsd(buyVolume)}</div>
                      </div>
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">Sell Volume</div>
                        <div className="text-lg font-bold text-xdex-red font-mono">{formatUsd(sellVolume)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">Net Volume</div>
                        <div className={`text-lg font-bold font-mono ${buyVolume - sellVolume >= 0 ? 'text-xdex-green' : 'text-xdex-red'}`}>
                          {buyVolume - sellVolume >= 0 ? '+' : ''}{formatUsd(buyVolume - sellVolume)}
                        </div>
                      </div>
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">24h Txns</div>
                        <div className="text-lg font-bold text-white font-mono">{formatNumber(t.txns24h)}</div>
                      </div>
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">24h Fees</div>
                        <div className="text-lg font-bold text-white font-mono">{formatUsd(t.fee24h || 0)}</div>
                      </div>
                    </div>
                    <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                      <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-3">Buy / Sell Ratio</div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-xdex-green font-bold">{buys} Buys ({buyPercent.toFixed(0)}%)</span>
                        <span className="text-sm text-xdex-red font-bold">{sells} Sells ({sellPercent.toFixed(0)}%)</span>
                      </div>
                      <div className="buy-sell-bar h-3 rounded">
                        <div className="buy-portion" style={{ width: `${buyPercent}%` }} />
                        <div className="sell-portion" style={{ width: `${sellPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-xdex-green font-mono">{formatUsd(buyVolume)}</span>
                        <span className="text-xs text-xdex-red font-mono">{formatUsd(sellVolume)}</span>
                      </div>
                    </div>
                    {t.apr24h && t.apr24h > 0 && (
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="text-xs text-xdex-text-muted font-semibold uppercase mb-1">APR (24h)</div>
                        <div className="text-lg font-bold text-xdex-green font-mono">{t.apr24h.toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                )}

                {/* === TOP TRADERS TAB === */}
                {bottomTab === 'topTraders' && (
                  <div>
                    <div className="grid grid-cols-7 px-4 py-2 text-[11px] text-xdex-text-muted font-semibold uppercase border-b border-[#222] sticky top-0 bg-black z-10">
                      <span>Trader</span>
                      <span className="text-right">Bought</span>
                      <span className="text-right">Sold</span>
                      <span className="text-right">PnL</span>
                      <span className="text-right">Txns</span>
                      <span className="text-right">Last Active</span>
                      <span className="text-right">Explorer</span>
                    </div>
                    {txnsLoading ? (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">
                        <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                        Analyzing traders...
                      </div>
                    ) : topTraders.length > 0 ? (
                      topTraders.map((trader, i) => {
                        const pnl = trader.sold - trader.bought;
                        const cat = getTraderCategory(trader.bought + trader.sold);
                        return (
                          <div key={trader.address} className="grid grid-cols-7 px-4 py-2 text-xs border-b border-[#111] hover:bg-white/[0.02] transition-colors">
                            <span className="flex items-center gap-2">
                              <span title={cat.label}>{cat.icon}</span>
                              <a href={`${explorerBase}/address/${trader.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-accent hover:underline font-mono" onClick={(e) => e.stopPropagation()}>
                                {trader.address.slice(0, 4)}...{trader.address.slice(-4)}
                              </a>
                            </span>
                            <span className="text-right text-xdex-green font-mono">{formatUsd(trader.bought)}</span>
                            <span className="text-right text-xdex-red font-mono">{formatUsd(trader.sold)}</span>
                            <span className={`text-right font-mono font-semibold ${pnl >= 0 ? 'text-xdex-green' : 'text-xdex-red'}`}>
                              {pnl >= 0 ? '+' : ''}{formatUsd(pnl)}
                            </span>
                            <span className="text-right text-xdex-text-secondary font-mono">{trader.txCount}</span>
                            <span className="text-right text-xdex-text-muted">{formatTxAge(trader.lastSeen)}</span>
                            <span className="text-right">
                              <a href={`${explorerBase}/address/${trader.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-text-muted hover:text-xdex-accent transition-colors" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink size={11} />
                              </a>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">No trader data available</div>
                    )}
                  </div>
                )}

                {/* === HOLDERS TAB === */}
                {bottomTab === 'holders' && (
                  <div>
                    <div className="grid grid-cols-4 px-4 py-2 text-[11px] text-xdex-text-muted font-semibold uppercase border-b border-[#222] sticky top-0 bg-black z-10">
                      <span>Rank</span>
                      <span>Address</span>
                      <span className="text-right">Balance</span>
                      <span className="text-right">% Supply</span>
                    </div>
                    {holdersLoading ? (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">
                        <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                        Loading on-chain holders...
                      </div>
                    ) : tokenHolders.length > 0 ? tokenHolders.map((h) => (
                      <div key={h.rank} className="grid grid-cols-4 px-4 py-2 text-xs border-b border-[#111] hover:bg-white/[0.02] transition-colors">
                        <span className="text-xdex-text-muted font-mono">#{h.rank}</span>
                        <span>
                          <a href={`${explorerBase}/address/${h.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-accent hover:underline font-mono" onClick={(e) => e.stopPropagation()}>
                            {h.address.slice(0, 6)}...{h.address.slice(-4)}
                          </a>
                        </span>
                        <span className="text-right text-white font-mono">{formatNumber(Math.round(h.balance))}</span>
                        <span className="text-right">
                          <span className="text-white font-mono">{h.percent.toFixed(2)}%</span>
                          <div className="mt-1 h-1 bg-[#222] rounded-full overflow-hidden">
                            <div className="h-full bg-xdex-accent/60 rounded-full" style={{ width: `${Math.min(h.percent, 100)}%` }} />
                          </div>
                        </span>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">No holder data available</div>
                    )}
                  </div>
                )}

                {/* === LP HOLDERS TAB === */}
                {bottomTab === 'lp' && (
                  <div>
                    <div className="grid grid-cols-4 px-4 py-2 text-[11px] text-xdex-text-muted font-semibold uppercase border-b border-[#222] sticky top-0 bg-black z-10">
                      <span>Rank</span>
                      <span>Address</span>
                      <span className="text-right">LP Tokens</span>
                      <span className="text-right">% Pool</span>
                    </div>
                    {holdersLoading ? (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">
                        <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                        Loading LP holders...
                      </div>
                    ) : lpHolders.length > 0 ? lpHolders.map((h) => (
                      <div key={h.rank} className="grid grid-cols-4 px-4 py-2 text-xs border-b border-[#111] hover:bg-white/[0.02] transition-colors">
                        <span className="text-xdex-text-muted font-mono">#{h.rank}</span>
                        <span>
                          <a href={`${explorerBase}/address/${h.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-accent hover:underline font-mono" onClick={(e) => e.stopPropagation()}>
                            {h.address.slice(0, 6)}...{h.address.slice(-4)}
                          </a>
                        </span>
                        <span className="text-right text-white font-mono">{formatNumber(Math.round(h.balance))}</span>
                        <span className="text-right">
                          <span className="text-white font-mono">{h.percent.toFixed(2)}%</span>
                          <div className="mt-1 h-1 bg-[#222] rounded-full overflow-hidden">
                            <div className="h-full bg-xdex-green/60 rounded-full" style={{ width: `${Math.min(h.percent, 100)}%` }} />
                          </div>
                        </span>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center py-12 text-sm text-xdex-text-muted">No LP holder data available</div>
                    )}
                  </div>
                )}

                {/* === INFO TAB === */}
                {bottomTab === 'info' && (
                  <div className="p-4 space-y-4">
                    {/* Pool Details */}
                    <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Pool Details</h4>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-xdex-text-muted">Pair Created</span>
                          <span className="text-xs text-white">{formatAge(t.createdAt)} ago</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-xdex-text-muted">DEX</span>
                          <span className="text-xs text-white uppercase">{t.dex}</span>
                        </div>
                        {extendedData && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-xdex-text-muted">Pooled {t.baseToken.symbol}</span>
                              <span className="text-xs text-white font-mono">{formatNumber(Math.round(extendedData.amount2 || extendedData.amount1))}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-xdex-text-muted">Pooled {t.quoteToken.symbol}</span>
                              <span className="text-xs text-white font-mono">{formatNumber(Math.round(extendedData.amount1 || extendedData.amount2))}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contract Addresses */}
                    <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Contracts</h4>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-xdex-text-muted">{t.baseToken.symbol}</span>
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] text-xdex-text-secondary font-mono">{t.baseToken.address.slice(0, 8)}...{t.baseToken.address.slice(-6)}</code>
                            <button onClick={copyAddress} className="text-xdex-text-muted hover:text-xdex-accent transition-colors"><Copy size={11} /></button>
                            <a href={`${explorerBase}/address/${t.baseToken.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-text-muted hover:text-xdex-accent transition-colors"><ExternalLink size={11} /></a>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-xdex-text-muted">{t.quoteToken.symbol}</span>
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] text-xdex-text-secondary font-mono">{t.quoteToken.address.slice(0, 8)}...{t.quoteToken.address.slice(-6)}</code>
                            <a href={`${explorerBase}/address/${t.quoteToken.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-text-muted hover:text-xdex-accent transition-colors"><ExternalLink size={11} /></a>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-xdex-text-muted">Pool</span>
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] text-xdex-text-secondary font-mono">{t.address.slice(0, 8)}...{t.address.slice(-6)}</code>
                            <a href={`${explorerBase}/address/${t.address}`} target="_blank" rel="noopener noreferrer" className="text-xdex-text-muted hover:text-xdex-accent transition-colors"><ExternalLink size={11} /></a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rug Detection */}
                    {rugAnalysis.flags.length > 0 && (
                      <div className="bg-[#060606] border border-[#222] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                            <AlertTriangle size={14} className={rugAnalysis.color} />
                            Rug Detection
                          </h4>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${rugAnalysis.color} ${rugAnalysis.bgColor}`}>
                            {rugAnalysis.riskLevel} ({rugAnalysis.riskScore})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {rugAnalysis.flags.map((flag) => (
                            <div key={flag.id} className={`flex items-start gap-2 p-2 rounded-lg ${
                              flag.severity === 'danger' ? 'bg-xdex-red/5 border border-xdex-red/15' :
                              flag.severity === 'warning' ? 'bg-xdex-yellow/5 border border-xdex-yellow/15' :
                              'bg-[#111] border border-[#222]'
                            }`}>
                              <AlertTriangle size={10} className={`mt-0.5 flex-shrink-0 ${
                                flag.severity === 'danger' ? 'text-xdex-red' : flag.severity === 'warning' ? 'text-xdex-yellow' : 'text-xdex-text-muted'
                              }`} />
                              <div>
                                <span className={`text-[11px] font-semibold block ${
                                  flag.severity === 'danger' ? 'text-xdex-red' : flag.severity === 'warning' ? 'text-xdex-yellow' : 'text-xdex-text-secondary'
                                }`}>{flag.label}</span>
                                <span className="text-[10px] text-xdex-text-muted">{flag.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {copied && <div className="text-center text-xdex-accent text-xs">Copied to clipboard!</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========= RIGHT SIDEBAR ========= */}
        <div className="w-[360px] flex-shrink-0 overflow-y-auto border-l border-[#222] bg-[#030303]">
          {/* Token banner / Info ad area */}
          {boost?.bannerImageUrl ? (
            <div className="relative">
              <img src={boost.bannerImageUrl} alt="Promoted" className="w-full h-28 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/40">
                  {Array.from({ length: boost.tierConfig.boltCount }).map((_, i) => (
                    <Zap key={i} size={9} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -3 : 0 }} />
                  ))}
                  <span style={{ color: '#DFFF00' }}>{boost.tierConfig.name}</span>
                </span>
              </div>
              {boost?.description && (
                <div className="px-4 py-2 border-b border-[#222] text-xs text-xdex-text-secondary">{boost.description}</div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-[#222] bg-[#060606]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-xdex-text-muted" />
                  <span className="text-xs text-xdex-text-secondary">Promote this token&apos;s visibility</span>
                </div>
                <button className="text-[11px] px-3 py-1.5 rounded-lg border border-[#333] text-xdex-accent hover:bg-[#111] transition-colors font-medium">
                  Boost Exposure
                </button>
              </div>
            </div>
          )}

          {/* MC / FDV / Liquidity top row (DexScreener-style) */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">MC</div>
                <div className="text-base font-bold text-xdex-accent font-mono mt-0.5">{formatUsd(t.marketCap)}</div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">FDV</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{formatUsd(t.fdv)}</div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">Liquidity</div>
                <div className={`text-base font-bold font-mono mt-0.5 ${isLowLiquidity ? 'text-xdex-yellow' : 'text-xdex-accent'}`}>
                  {formatUsd(t.liquidity)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">Holders</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{formatNumber(t.makers)}</div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">Safety Score</div>
                <div className={`text-base font-bold font-mono mt-0.5 ${safety.color}`}>{safety.score}</div>
              </div>
            </div>
          </div>

          {/* Price changes bar (DexScreener-style tabs) */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="grid grid-cols-4 gap-2">
              {changes.map((c) => (
                <div key={c.label} className="text-center p-2.5 rounded-lg bg-[#111] border border-[#222]">
                  <div className="text-xs text-xdex-text-muted font-semibold">{c.label}</div>
                  <div className={`text-base font-mono font-bold mt-0.5 ${getPercentColor(c.value)}`}>
                    {c.value === 0 ? '—' : formatPercent(c.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume & Traders section (DexScreener-style) */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">24h Vol</div>
                <div className="text-base font-bold text-xdex-green font-mono mt-0.5">
                  {formatUsd(extendedData?.volumeUsd24h || t.volume24h)}
                </div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">Net Vol</div>
                <div className={`text-base font-bold font-mono mt-0.5 ${buyVolume - sellVolume >= 0 ? 'text-xdex-green' : 'text-xdex-red'}`}>
                  {formatUsd(Math.abs(buyVolume - sellVolume))}
                </div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">24h Traders</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{formatNumber(t.txns24h)}</div>
              </div>
              <div>
                <div className="text-xs text-xdex-text-muted font-semibold uppercase">Net Buyers</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{formatNumber(buys)}</div>
              </div>
              {extendedData?.txns7d ? (
                <div>
                  <div className="text-xs text-xdex-text-muted font-semibold uppercase">7d Txns</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{formatNumber(extendedData.txns7d)}</div>
                </div>
              ) : null}
              {t.apr24h && t.apr24h > 0 ? (
                <div>
                  <div className="text-xs text-xdex-text-muted font-semibold uppercase">APR</div>
                  <div className="text-base font-bold text-xdex-green font-mono mt-0.5">{t.apr24h.toFixed(1)}%</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Buy/Sell ratio */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xdex-green font-bold text-sm">{buys}</span>
                <span className="text-[10px] text-xdex-text-muted">Buys</span>
              </div>
              <span className="text-[10px] text-xdex-text-muted font-semibold">Txns</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-xdex-text-muted">Sells</span>
                <span className="text-xdex-red font-bold text-sm">{sells}</span>
              </div>
            </div>
            <div className="buy-sell-bar">
              <div className="buy-portion" style={{ width: `${buyPercent}%` }} />
              <div className="sell-portion" style={{ width: `${sellPercent}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-xdex-green font-mono">{formatUsd(buyVolume)}</span>
              <span className="text-[10px] text-xdex-text-muted">Volume</span>
              <span className="text-xs text-xdex-red font-mono">{formatUsd(sellVolume)}</span>
            </div>
          </div>

          {/* Safety Score */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Shield size={13} className={safety.color} />
                <span className="text-xs text-white font-semibold">Safety Score</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${safety.color} ${safety.bgColor}`}>
                {safety.score}/100
                <span className="text-[10px] font-medium ml-0.5">{safety.label}</span>
              </span>
            </div>
            <div className="h-2 bg-[#222] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  safety.score >= 80 ? 'bg-xdex-green' :
                  safety.score >= 60 ? 'bg-emerald-400' :
                  safety.score >= 40 ? 'bg-xdex-yellow' :
                  safety.score >= 20 ? 'bg-xdex-orange' : 'bg-xdex-red'
                }`}
                style={{ width: `${safety.score}%` }}
              />
            </div>
            {safety.risks.length > 0 && (
              <div className="mt-2 space-y-1">
                {safety.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle size={10} className="text-xdex-yellow/70 mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-xdex-text-muted">{risk}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liquidity depth */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white font-semibold">Liquidity Depth</span>
              <span className={`text-xs font-semibold capitalize ${
                liquidityDepth === 'deep' ? 'text-xdex-green' :
                liquidityDepth === 'moderate' ? 'text-xdex-accent' :
                liquidityDepth === 'shallow' ? 'text-xdex-yellow' : 'text-xdex-red'
              }`}>
                {liquidityDepth}
              </span>
            </div>
            <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  liquidityDepth === 'deep' ? 'bg-xdex-green' :
                  liquidityDepth === 'moderate' ? 'bg-xdex-accent' :
                  liquidityDepth === 'shallow' ? 'bg-xdex-yellow' : 'bg-xdex-red'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (t.liquidity / 100000) * 100))}%` }}
              />
            </div>
          </div>

          {/* Community Sentiment */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="text-xs text-white font-semibold mb-2">Community Sentiment</div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleVote('bullish')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  sentiment.userVote === 'bullish'
                    ? 'bg-xdex-green/20 text-xdex-green border border-xdex-green/30'
                    : 'bg-[#111] text-xdex-text-muted border border-[#222] hover:border-xdex-green/30 hover:text-xdex-green'
                }`}
              >
                <ThumbsUp size={13} />
                Bullish
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{sentiment.bullish}</span>
              </button>
              <button
                onClick={() => handleVote('bearish')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  sentiment.userVote === 'bearish'
                    ? 'bg-xdex-red/20 text-xdex-red border border-xdex-red/30'
                    : 'bg-[#111] text-xdex-text-muted border border-[#222] hover:border-xdex-red/30 hover:text-xdex-red'
                }`}
              >
                <ThumbsDown size={13} />
                Bearish
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{sentiment.bearish}</span>
              </button>
            </div>
            {sentimentTotal > 0 && (
              <div className="h-2 rounded-full overflow-hidden flex">
                <div className="bg-xdex-green transition-all" style={{ width: `${bullishPct}%` }} />
                <div className="bg-xdex-red transition-all" style={{ width: `${100 - bullishPct}%` }} />
              </div>
            )}
          </div>

          {/* Price Alerts */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bell size={13} className="text-xdex-text-muted" />
                <span className="text-xs text-white font-semibold">Price Alerts</span>
              </div>
              <button onClick={() => setShowAlertForm(!showAlertForm)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#111] border border-[#222] text-xdex-accent font-semibold hover:bg-[#161616] transition-colors">
                {showAlertForm ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {showAlertForm && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => setAlertCondition('above')} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                    alertCondition === 'above' ? 'bg-xdex-green/15 text-xdex-green border border-xdex-green/30' : 'bg-[#111] text-xdex-text-muted border border-[#222]'
                  }`}>Above</button>
                  <button onClick={() => setAlertCondition('below')} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                    alertCondition === 'below' ? 'bg-xdex-red/15 text-xdex-red border border-xdex-red/30' : 'bg-[#111] text-xdex-text-muted border border-[#222]'
                  }`}>Below</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#333] bg-black">
                    <span className="text-xs text-xdex-text-muted">$</span>
                    <input type="number" placeholder={formatPrice(t.priceUsd)} value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0 no-spin" style={{ boxShadow: 'none' }} />
                  </div>
                  <button onClick={handleCreateAlert} className="px-3 py-1.5 rounded-lg bg-xdex-accent text-white text-[11px] font-semibold hover:brightness-110 transition-all">Set</button>
                </div>
              </div>
            )}

            {tokenAlerts.length > 0 && (
              <div className="space-y-1">
                {tokenAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[#111] border border-[#222]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${a.condition === 'above' ? 'text-xdex-green' : 'text-xdex-red'}`}>
                        {a.condition === 'above' ? '>' : '<'}
                      </span>
                      <span className="text-xs text-white font-mono">${a.targetPrice.toFixed(6)}</span>
                      {a.triggered && <span className="text-[9px] px-1 py-0.5 rounded bg-xdex-green/15 text-xdex-green">Triggered</span>}
                    </div>
                    <button onClick={() => handleDeleteAlert(a.id)} className="p-1 text-xdex-text-muted hover:text-xdex-red transition-colors"><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Calculator */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="text-xs text-white font-semibold mb-2">Price Calculator</div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#222] bg-[#111]">
              <input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)}
                onWheel={(e) => (e.target as HTMLElement).blur()}
                className="flex-1 bg-transparent text-white text-sm font-mono outline-none border-none shadow-none min-w-0 no-spin" style={{ boxShadow: 'none' }} />
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-[#222]">{t.baseToken.symbol}</span>
            </div>
            <div className="flex items-center justify-center py-1"><ArrowUpDown size={12} className="text-xdex-text-muted" /></div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#222] bg-[#111]">
              <span className="flex-1 text-white text-sm font-mono">
                {calcResult < 0.01 && calcResult > 0 ? calcResult.toFixed(8) : calcResult.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-xdex-text-secondary px-2 py-1 rounded bg-[#222]">USD</span>
            </div>
            <div className="text-[10px] text-xdex-text-muted text-center mt-1.5 font-mono">
              1 {t.baseToken.symbol} = {formatPrice(t.priceUsd)}
            </div>
          </div>

          {/* Swap CTA + Links */}
          <div className="px-4 py-4">
            <button onClick={() => onSwap(token)} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-xdex-accent text-white hover:brightness-110 text-sm font-bold transition-all">
              <ArrowLeftRight size={15} />
              Swap {t.baseToken.symbol}
            </button>
            <div className="flex items-center justify-center gap-5 mt-3">
              <a href={`${explorerBase}/address/${t.baseToken.address}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors">
                <ExternalLink size={12} /> Explorer
              </a>
              <a href={`https://app.xdex.xyz/swap?inputToken=${t.quoteToken.address}&outputToken=${t.baseToken.address}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors">
                <Globe size={12} /> XDEX
              </a>
              <button onClick={handleShare} className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors">
                <Share2 size={12} /> {shareCopied ? 'Copied!' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
