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
import PriceChart from '@/components/chart/PriceChart';
import WhaleTracker from '@/components/token/WhaleTracker';
import PnLSimulator from '@/components/token/PnLSimulator';
import AlphaLogo from '@/components/ui/AlphaLogo';

interface TokenDetailProps {
  token: TokenPair;
  onClose: () => void;
  onSwap: (token: TokenPair) => void;
  isFavorited: boolean;
  onFavorite: (address: string) => void;
  boost?: ActiveBoost | null;
}

type ChartTimeframe = '5m' | '15m' | '1h' | '4h' | '1d';
type BottomTab = 'transactions' | 'holders' | 'lp';
type TxFilter = 'all' | 'buys' | 'sells' | 'lp';

function formatTxAge(ts: number): string {
  const diff = Date.now() - ts;
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

  // Sync liveToken when token prop changes (user selects different token)
  useEffect(() => {
    setLiveToken(token);
    setExtendedData(null);
  }, [token.address]);

  // Sentiment state
  const [sentiment, setSentiment] = useState(() => getSentiment(token.address));

  // Re-sync sentiment when token changes
  useEffect(() => {
    setSentiment(getSentiment(token.address));
  }, [token.address]);

  // Alert state
  const [tokenAlerts, setTokenAlerts] = useState<PriceAlert[]>(() => getAlertsForToken(token.address));
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);

  // Re-sync alerts when token changes
  useEffect(() => {
    setTokenAlerts(getAlertsForToken(token.address));
    setAlertPrice('');
    setShowAlertForm(false);
  }, [token.address]);

  // Share state
  const [shareCopied, setShareCopied] = useState(false);

  // Fetch real chart data (with stale-request guard)
  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    fetchOHLCV(token, chartTimeframe).then((data) => {
      if (!cancelled) {
        setChartData(data);
        setChartLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.address, chartTimeframe, token.chain]);

  // Fetch extended pool details (with stale-request guard)
  useEffect(() => {
    let cancelled = false;
    fetchPoolDetails(token.address, token.chain).then((data) => {
      if (!cancelled) setExtendedData(data);
    });
    return () => { cancelled = true; };
  }, [token.address, token.chain]);

  // Auto-refresh live data every 30s (with stale-request guard)
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

  const timeframes: ChartTimeframe[] = ['5m', '15m', '1h', '4h', '1d'];

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

  // Fetch real transactions from X1 RPC
  useEffect(() => {
    let cancelled = false;
    setTxnsLoading(true);
    fetchRecentPoolTxns(token.address, token.chain, 30).then((data) => {
      if (!cancelled) {
        setPoolTxns(data);
        setTxnsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token.address, token.chain]);

  // Fetch real token holders + LP holders from X1 RPC
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

  // Buy/sell data from real transactions
  const buys = poolTxns?.buys ?? 0;
  const sells = poolTxns?.sells ?? 0;
  const buyVolume = poolTxns?.buyVolume ?? 0;
  const sellVolume = poolTxns?.sellVolume ?? 0;
  const totalTxCount = buys + sells;
  const buyPercent = totalTxCount > 0 ? (buys / totalTxCount) * 100 : 50;
  const sellPercent = 100 - buyPercent;

  const isLowLiquidity = t.liquidity < 1000;
  const isShallowLiquidity = t.liquidity >= 1000 && t.liquidity < 10000;
  const isHighVolatility = Math.abs(t.priceChange24h) > 20;
  const isNew = (Date.now() - t.createdAt) < 7 * 86400000;
  const isVeryNew = (Date.now() - t.createdAt) < 24 * 3600000;
  const hasUnusualDecimals = (t.baseToken.decimals ?? 9) !== 9 && (t.baseToken.decimals ?? 9) !== 6;
  const hasSmallPrice = t.priceUsd > 0 && t.priceUsd < 0.00001;

  const liquidityDepth = t.liquidity >= 100000 ? 'deep' : t.liquidity >= 10000 ? 'moderate' : t.liquidity >= 1000 ? 'shallow' : 'thin';

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
                onClick={handleShare}
                className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
                title="Share token link"
              >
                {shareCopied ? <span className="text-[10px] text-xdex-accent font-medium">Copied!</span> : <Share2 size={13} />}
              </button>
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

          {/* Bottom tabs */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-xdex-border">
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

                  <div className="grid grid-cols-6 px-4 py-1.5 text-[10px] text-xdex-text-muted font-semibold uppercase border-b border-xdex-border/30 sticky top-[37px] bg-black z-10">
                    <span>Date</span>
                    <span>Type</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Token Qty</span>
                    <span className="text-right">Maker</span>
                    <span className="text-right">TX</span>
                  </div>

                  {txnsLoading ? (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                      Loading on-chain transactions...
                    </div>
                  ) : (
                    <>
                      {filteredTxns.map((tx) => (
                        <div
                          key={tx.signature}
                          className="grid grid-cols-6 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="text-xdex-text-muted">{formatTxAge(tx.timestamp)}</span>
                          <span className={
                            tx.type === 'Buy' ? 'text-xdex-green font-medium' :
                            tx.type === 'Sell' ? 'text-xdex-red font-medium' :
                            'text-xdex-accent font-medium'
                          }>
                            {tx.type}
                          </span>
                          <span className="text-right text-white font-mono">{formatUsd(tx.totalUsd)}</span>
                          <span className="text-right text-xdex-text-secondary font-mono">{tx.tokenAmount.toFixed(2)}</span>
                          <span className="text-right text-xdex-accent font-mono cursor-pointer hover:underline">
                            <a href={`${explorerBase}/address/${tx.maker}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              {tx.maker}
                            </a>
                          </span>
                          <span className="text-right">
                            <a
                              href={`${explorerBase}/tx/${tx.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xdex-text-muted hover:text-xdex-accent transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={10} />
                            </a>
                          </span>
                        </div>
                      ))}

                      {filteredTxns.length === 0 && (
                        <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                          No transactions found
                        </div>
                      )}
                    </>
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
                  {holdersLoading ? (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                      Loading on-chain holders...
                    </div>
                  ) : tokenHolders.length > 0 ? tokenHolders.map((h) => (
                    <div
                      key={h.rank}
                      className="grid grid-cols-4 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xdex-text-muted">#{h.rank}</span>
                      <span className="text-xdex-accent font-mono cursor-pointer hover:underline">
                        <a href={`${explorerBase}/address/${h.address}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          {h.address.slice(0, 4)}...{h.address.slice(-4)}
                        </a>
                      </span>
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
                  )) : (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      No holder data available
                    </div>
                  )}
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
                  {holdersLoading ? (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      <div className="w-4 h-4 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin mr-2" />
                      Loading on-chain LP holders...
                    </div>
                  ) : lpHolders.length > 0 ? lpHolders.map((h) => (
                    <div
                      key={h.rank}
                      className="grid grid-cols-4 px-4 py-2 text-[11px] border-b border-xdex-border/20 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xdex-text-muted">#{h.rank}</span>
                      <span className="text-xdex-accent font-mono cursor-pointer hover:underline">
                        <a href={`${explorerBase}/address/${h.address}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          {h.address.slice(0, 4)}...{h.address.slice(-4)}
                        </a>
                      </span>
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
                  )) : (
                    <div className="flex items-center justify-center py-8 text-xs text-xdex-text-muted">
                      No LP holder data available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Token info panel */}
        <div className="w-[380px] flex-shrink-0 overflow-y-auto">
          {/* Boost banner (Degen Boost tier) */}
          {boost?.bannerImageUrl && (
            <div className="relative">
              <img
                src={boost.bannerImageUrl}
                alt="Promoted"
                className="w-full h-28 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/40">
                  {Array.from({ length: boost.tierConfig.boltCount }).map((_, i) => (
                    <Zap key={i} size={9} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -3 : 0 }} />
                  ))}
                  <span style={{ color: '#DFFF00' }}>{boost.tierConfig.name}</span>
                </span>
              </div>
            </div>
          )}

          {/* Boost badge (non-banner tiers) */}
          {boost && !boost.bannerImageUrl && (
            <div
              className="flex items-center gap-2 px-5 py-2 border-b"
              style={{ borderColor: '#DFFF0030', backgroundColor: '#DFFF0008' }}
            >
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                {Array.from({ length: boost.tierConfig.boltCount }).map((_, i) => (
                  <Zap key={i} size={10} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -3 : 0 }} />
                ))}
                <span style={{ color: '#DFFF00' }}>{boost.tierConfig.name}</span>
              </span>
              <span className="text-[9px] text-xdex-text-muted">Promoted</span>
            </div>
          )}

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

          {/* Safety Score panel */}
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Shield size={12} className={safety.color} />
                <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">Safety Score</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${safety.color} ${safety.bgColor}`}>
                {safety.score}/100
                <span className="text-[9px] font-medium ml-0.5">{safety.label}</span>
              </span>
            </div>
            <div className="h-1.5 bg-xdex-border/30 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  safety.score >= 80 ? 'bg-xdex-green' :
                  safety.score >= 60 ? 'bg-emerald-400' :
                  safety.score >= 40 ? 'bg-yellow-400' :
                  safety.score >= 20 ? 'bg-orange-400' : 'bg-xdex-red'
                }`}
                style={{ width: `${safety.score}%` }}
              />
            </div>
            {safety.risks.length > 0 && (
              <div className="space-y-1">
                {safety.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle size={9} className="text-yellow-400/70 mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] text-xdex-text-muted">{risk}</span>
                  </div>
                ))}
              </div>
            )}
            {safety.risks.length === 0 && (
              <span className="text-[10px] text-xdex-green">No risks detected</span>
            )}
          </div>

          {/* Rug Pull / Honeypot Analysis */}
          {rugAnalysis.flags.length > 0 && (
            <div className="px-5 py-3 border-b border-xdex-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className={rugAnalysis.color} />
                  <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">Rug Detection</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded capitalize ${rugAnalysis.color} ${rugAnalysis.bgColor}`}>
                  {rugAnalysis.riskLevel}
                  <span className="text-[9px] font-medium ml-0.5">({rugAnalysis.riskScore})</span>
                </span>
              </div>
              <div className="space-y-1.5">
                {rugAnalysis.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`flex items-start gap-2 p-1.5 rounded ${
                      flag.severity === 'danger' ? 'bg-xdex-red/5 border border-xdex-red/15' :
                      flag.severity === 'warning' ? 'bg-yellow-400/5 border border-yellow-400/15' :
                      'bg-xdex-border/10 border border-xdex-border/20'
                    }`}
                  >
                    <AlertTriangle size={9} className={`mt-0.5 flex-shrink-0 ${
                      flag.severity === 'danger' ? 'text-xdex-red' :
                      flag.severity === 'warning' ? 'text-yellow-400' :
                      'text-xdex-text-muted'
                    }`} />
                    <div>
                      <span className={`text-[10px] font-semibold block ${
                        flag.severity === 'danger' ? 'text-xdex-red' :
                        flag.severity === 'warning' ? 'text-yellow-400' :
                        'text-xdex-text-secondary'
                      }`}>{flag.label}</span>
                      <span className="text-[9px] text-xdex-text-muted">{flag.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Sentiment */}
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="text-[10px] text-xdex-text-muted font-semibold uppercase tracking-wider mb-2">
              Community Sentiment
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleVote('bullish')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sentiment.userVote === 'bullish'
                    ? 'bg-xdex-green/20 text-xdex-green border border-xdex-green/30'
                    : 'bg-xdex-card/30 text-xdex-text-muted border border-xdex-border/40 hover:border-xdex-green/30 hover:text-xdex-green'
                }`}
              >
                <ThumbsUp size={12} />
                Bullish
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{sentiment.bullish}</span>
              </button>
              <button
                onClick={() => handleVote('bearish')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sentiment.userVote === 'bearish'
                    ? 'bg-xdex-red/20 text-xdex-red border border-xdex-red/30'
                    : 'bg-xdex-card/30 text-xdex-text-muted border border-xdex-border/40 hover:border-xdex-red/30 hover:text-xdex-red'
                }`}
              >
                <ThumbsDown size={12} />
                Bearish
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{sentiment.bearish}</span>
              </button>
            </div>
            {sentimentTotal > 0 && (
              <div className="h-1.5 rounded-full overflow-hidden flex">
                <div className="bg-xdex-green transition-all" style={{ width: `${bullishPct}%` }} />
                <div className="bg-xdex-red transition-all" style={{ width: `${100 - bullishPct}%` }} />
              </div>
            )}
          </div>

          {/* Price Alerts */}
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bell size={12} className="text-xdex-text-muted" />
                <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">Price Alerts</span>
              </div>
              <button
                onClick={() => setShowAlertForm(!showAlertForm)}
                className="text-[10px] px-2 py-0.5 rounded bg-xdex-accent/15 text-xdex-accent font-medium hover:bg-xdex-accent/25 transition-colors"
              >
                {showAlertForm ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {showAlertForm && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 px-2 py-1.5 text-[10px] rounded font-medium transition-colors ${
                      alertCondition === 'above'
                        ? 'bg-xdex-green/15 text-xdex-green border border-xdex-green/30'
                        : 'bg-xdex-card/30 text-xdex-text-muted border border-xdex-border/40'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    onClick={() => setAlertCondition('below')}
                    className={`flex-1 px-2 py-1.5 text-[10px] rounded font-medium transition-colors ${
                      alertCondition === 'below'
                        ? 'bg-xdex-red/15 text-xdex-red border border-xdex-red/30'
                        : 'bg-xdex-card/30 text-xdex-text-muted border border-xdex-border/40'
                    }`}
                  >
                    Below
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1 px-2.5 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
                    <span className="text-[10px] text-xdex-text-muted">$</span>
                    <input
                      type="number"
                      placeholder={formatPrice(t.priceUsd)}
                      value={alertPrice}
                      onChange={(e) => setAlertPrice(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white font-mono outline-none border-none shadow-none min-w-0"
                      style={{ boxShadow: 'none' }}
                    />
                  </div>
                  <button
                    onClick={handleCreateAlert}
                    className="px-3 py-1.5 rounded bg-xdex-accent text-white text-[10px] font-semibold hover:brightness-110 transition-all"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}

            {tokenAlerts.length > 0 && (
              <div className="space-y-1">
                {tokenAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-1.5 rounded bg-xdex-card/20 border border-xdex-border/30">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${a.condition === 'above' ? 'text-xdex-green' : 'text-xdex-red'}`}>
                        {a.condition === 'above' ? '>' : '<'}
                      </span>
                      <span className="text-[10px] text-white font-mono">${a.targetPrice.toFixed(6)}</span>
                      {a.triggered && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-xdex-green/15 text-xdex-green">Triggered</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      className="p-1 text-xdex-text-muted hover:text-xdex-red transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tokenAlerts.length === 0 && !showAlertForm && (
              <span className="text-[10px] text-xdex-text-muted">No alerts set</span>
            )}
          </div>

          {/* Whale Tracker */}
          <WhaleTracker token={t} />

          {/* PnL Simulator */}
          <PnLSimulator token={t} />

          {/* Risk/Safety signals */}
          {(isLowLiquidity || isShallowLiquidity || isHighVolatility || isVeryNew || hasUnusualDecimals || hasSmallPrice) && (
            <div className="px-5 py-3 border-b border-xdex-border space-y-1.5">
              {isLowLiquidity && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-xdex-red/5 border border-xdex-red/15">
                  <AlertTriangle size={12} className="text-xdex-red flex-shrink-0" />
                  <span className="text-[10px] text-xdex-red">Thin liquidity ({formatUsd(t.liquidity)}) — very high slippage risk</span>
                </div>
              )}
              {isShallowLiquidity && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/15">
                  <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-[10px] text-yellow-400">Shallow liquidity ({formatUsd(t.liquidity)}) — moderate slippage risk</span>
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
              {hasUnusualDecimals && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/15">
                  <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-[10px] text-yellow-400">Non-standard decimals ({t.baseToken.decimals}) — check precision</span>
                </div>
              )}
              {hasSmallPrice && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/15">
                  <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-[10px] text-yellow-400">Very small price — rounding may affect precision</span>
                </div>
              )}
            </div>
          )}

          {/* Liquidity depth indicator */}
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">Liquidity Depth</span>
              <span className={`text-[10px] font-semibold ${
                liquidityDepth === 'deep' ? 'text-xdex-green' :
                liquidityDepth === 'moderate' ? 'text-xdex-accent' :
                liquidityDepth === 'shallow' ? 'text-yellow-400' : 'text-xdex-red'
              }`}>
                {liquidityDepth.charAt(0).toUpperCase() + liquidityDepth.slice(1)}
              </span>
            </div>
            <div className="h-1.5 bg-xdex-border/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  liquidityDepth === 'deep' ? 'bg-xdex-green' :
                  liquidityDepth === 'moderate' ? 'bg-xdex-accent' :
                  liquidityDepth === 'shallow' ? 'bg-yellow-400' : 'bg-xdex-red'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (t.liquidity / 100000) * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-xdex-text-muted">$0</span>
              <span className="text-[9px] text-xdex-text-muted">$100K+</span>
            </div>
          </div>

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
                href={`${explorerBase}/address/${t.baseToken.address}`}
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
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-xs text-xdex-text-muted hover:text-xdex-accent transition-colors"
              >
                <Share2 size={12} /> {shareCopied ? 'Copied!' : 'Share'}
              </button>
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
