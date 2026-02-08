'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Flame,
  TrendingUp,
  TrendingDown,
  Bookmark,
  Layers,
  Settings2,
  Download,
  Menu,
  SlidersHorizontal,
  Crosshair,
  ArrowLeftRight,
} from 'lucide-react';
import { TokenPair, FilterView, TimeFilter, Chain } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { ColumnId, getVisibleColumns, saveVisibleColumns, exportTokensCSV, downloadCSV } from '@/utils/columnPrefs';
import { checkAlerts } from '@/services/alertStore';
import { seedSentiment } from '@/services/sentimentStore';
import { checkSniperRules } from '@/services/sniperStore';
import { fetchPoolList } from '@/services/api';
import { getBoostMap } from '@/services/boostStore';
import { computeSafetyScore } from '@/utils/safetyScore';
import { isLikelyRug } from '@/utils/rugDetector';
import { useToast } from '@/components/ui/Toast';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TokenTable from '@/components/token/TokenTable';
import TokenDetail from '@/components/token/TokenDetail';
import SwapModal from '@/components/swap/SwapModal';
import BoostForm from '@/components/boost/BoostForm';
import BoostProfile from '@/components/boost/BoostProfile';
import ScreenerFilters, { ScreenerFilterValues, DEFAULT_FILTERS, isFiltersActive } from '@/components/screener/ScreenerFilters';
import TokenCompare from '@/components/compare/TokenCompare';
import SniperPanel from '@/components/sniper/SniperPanel';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import ColumnSettings from '@/components/ui/ColumnSettings';
import WalletStub from '@/components/ui/WalletStub';
import X1Logo from '@/components/ui/X1Logo';
import SolanaLogo from '@/components/ui/SolanaLogo';

// XDEX hexagon X logo mark (small, for title bar)
function XdexMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <linearGradient id="xdex-title-mark" x1="50" y1="0" x2="150" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#0566ea" />
        </linearGradient>
      </defs>
      <path
        d="M100 10 L180 55 L180 145 L100 190 L20 145 L20 55 Z"
        stroke="url(#xdex-title-mark)"
        strokeWidth="14"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M62 65 L82 100 L62 135 H80 L100 108 L120 135 H138 L118 100 L138 65 H120 L100 92 L80 65 Z"
        fill="url(#xdex-title-mark)"
      />
    </svg>
  );
}

const filterTabs: {
  id: FilterView;
  label: string;
  icon: React.ComponentType<any>;
  activeColor: string;
}[] = [
  { id: 'all', label: 'All Pairs', icon: Layers, activeColor: 'text-xdex-accent bg-xdex-accent/10' },
  { id: 'new', label: 'New Pairs', icon: Flame, activeColor: 'text-xdex-orange bg-xdex-orange/10' },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp, activeColor: 'text-xdex-green bg-xdex-green/10' },
  { id: 'losers', label: 'Losers', icon: TrendingDown, activeColor: 'text-xdex-red bg-xdex-red/10' },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark, activeColor: 'text-xdex-yellow bg-xdex-yellow/10' },
];

const filterViewIds: FilterView[] = ['all', 'new', 'gainers', 'losers', 'watchlist'];

export default function AlphaPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><div className="w-8 h-8 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin" /></div>}>
      <AlphaPageContent />
    </Suspense>
  );
}

function AlphaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Separate data stores for each chain
  const [x1Tokens, setX1Tokens] = useState<TokenPair[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeChain, setActiveChain] = useState<Chain>(
    (searchParams.get('chain') as Chain) || 'x1'
  );
  const [activeView, setActiveView] = useState<FilterView>(
    (searchParams.get('view') as FilterView) || 'all'
  );
  const [trendingTimeframe, setTrendingTimeframe] = useState<TimeFilter>('24h');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedToken, setSelectedToken] = useState<TokenPair | null>(null);
  const [swapToken, setSwapToken] = useState<TokenPair | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingTokenId = useRef<string | null>(searchParams.get('token'));

  // Boost state
  const [showBoostForm, setShowBoostForm] = useState(false);
  const [showBoostProfile, setShowBoostProfile] = useState(false);
  const [boostMap, setBoostMap] = useState<Map<string, ActiveBoost>>(new Map());
  const [boostVersion, setBoostVersion] = useState(0);

  // Column settings state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => getVisibleColumns());
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Wallet stub
  const [showWalletStub, setShowWalletStub] = useState(false);

  // Selected row index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Screener filters
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterValues>(DEFAULT_FILTERS);
  const [showScreenerFilters, setShowScreenerFilters] = useState(false);

  // Compare modal
  const [showCompare, setShowCompare] = useState(false);
  const [compareInitialToken, setCompareInitialToken] = useState<TokenPair | null>(null);

  // Sniper panel
  const [showSniper, setShowSniper] = useState(false);

  // Time filter for price column (lifted from TokenTable)
  const [priceTimeFilter, setPriceTimeFilter] = useState<TimeFilter>('24h');

  // Current tokens based on active chain
  const tokens = activeChain === 'x1' ? x1Tokens : solanaTokens;

  // Load data for both chains
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [x1Data, solData] = await Promise.allSettled([
        fetchPoolList('x1'),
        fetchPoolList('solana'),
      ]);

      const x1Pools = x1Data.status === 'fulfilled' ? x1Data.value : [];
      if (x1Data.status === 'fulfilled') {
        setX1Tokens(x1Pools);
      }
      if (solData.status === 'fulfilled') {
        // Remove any Solana pools that share addresses with X1 pools
        const x1Addresses = new Set(x1Pools.map((t) => t.address));
        const x1BaseAddresses = new Set(x1Pools.map((t) => t.baseToken.address));
        const uniqueSolana = solData.value.filter(
          (t) => !x1Addresses.has(t.address) && !x1BaseAddresses.has(t.baseToken.address)
        );
        setSolanaTokens(uniqueSolana);
      }

      // Show error only if both fail
      if (x1Data.status === 'rejected' && solData.status === 'rejected') {
        setError('Failed to load data from XDEX API');
      }

      // Seed sentiment for loaded tokens
      const allPools = [
        ...(x1Data.status === 'fulfilled' ? x1Data.value : []),
        ...(solData.status === 'fulfilled' ? solData.value : []),
      ];
      for (const t of allPools) {
        seedSentiment(t.address, t.priceChange24h);
      }

      // Check price alerts against current prices
      const priceMap = new Map<string, number>();
      for (const t of allPools) {
        priceMap.set(t.address.toLowerCase(), t.priceUsd);
      }
      const triggered = checkAlerts(priceMap);
      if (triggered.length > 0) {
        for (const a of triggered) {
          toast('info', `Alert: ${a.tokenSymbol} is now ${a.condition} $${a.targetPrice.toFixed(6)}`);
        }
      }

      // Check sniper rules against new pairs
      const sniperMatches = checkSniperRules(allPools);
      if (sniperMatches.length > 0) {
        for (const m of sniperMatches) {
          toast('success', `Sniper: New pair ${m.token.baseToken.symbol} matched "${m.rule.name}"`);
        }
      }
    } catch {
      setError('Failed to connect to XDEX API');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alpha-favorites');
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch { /* ignore corrupt data */ }
    }
  }, []);

  // Load boost map (refreshes when boostVersion changes)
  useEffect(() => {
    setBoostMap(getBoostMap());
  }, [boostVersion]);

  // Sync URL state — deep linking + browser back/forward
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeChain !== 'x1') params.set('chain', activeChain);
    if (activeView !== 'all') params.set('view', activeView);
    if (searchQuery) params.set('q', searchQuery);
    if (selectedToken) params.set('token', selectedToken.address);
    const qs = params.toString();
    const url = qs ? `?${qs}` : '/';
    router.replace(url, { scroll: false });
  }, [activeChain, activeView, searchQuery, selectedToken, router]);

  // Restore token from URL after data loads
  useEffect(() => {
    if (!pendingTokenId.current || loading) return;
    const allPools = [...x1Tokens, ...solanaTokens];
    const match = allPools.find((t) => t.address === pendingTokenId.current);
    if (match) {
      setSelectedToken(match);
      setActiveChain(match.chain);
    }
    pendingTokenId.current = null;
  }, [loading, x1Tokens, solanaTokens]);

  // Save column preferences when changed
  const handleColumnChange = useCallback((cols: Set<ColumnId>) => {
    setVisibleColumns(cols);
    saveVisibleColumns(cols);
  }, []);

  const toggleFavorite = useCallback((address: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      localStorage.setItem('alpha-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Filter tokens based on active view, search query, and screener filters
  const filteredTokens = useMemo(() => {
    let result = tokens;

    // Apply search filter first
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.baseToken.symbol.toLowerCase().includes(q) ||
          t.baseToken.name.toLowerCase().includes(q) ||
          t.quoteToken.symbol.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q),
      );
    }

    // Apply screener filters
    if (isFiltersActive(screenerFilters)) {
      const f = screenerFilters;
      result = result.filter((t) => {
        if (f.minLiquidity !== null && t.liquidity < f.minLiquidity) return false;
        if (f.maxLiquidity !== null && t.liquidity > f.maxLiquidity) return false;
        if (f.minMcap !== null && t.marketCap < f.minMcap) return false;
        if (f.maxMcap !== null && t.marketCap > f.maxMcap) return false;
        if (f.minVolume !== null && t.volume24h < f.minVolume) return false;
        if (f.maxVolume !== null && t.volume24h > f.maxVolume) return false;
        if (f.minAge !== null) {
          const ageH = (Date.now() - t.createdAt) / 3600000;
          if (ageH < f.minAge) return false;
        }
        if (f.maxAge !== null) {
          const ageH = (Date.now() - t.createdAt) / 3600000;
          if (ageH > f.maxAge) return false;
        }
        if (f.minSafety !== null || f.maxSafety !== null) {
          const score = computeSafetyScore(t).score;
          if (f.minSafety !== null && score < f.minSafety) return false;
          if (f.maxSafety !== null && score > f.maxSafety) return false;
        }
        if (f.minChange24h !== null && t.priceChange24h < f.minChange24h) return false;
        if (f.maxChange24h !== null && t.priceChange24h > f.maxChange24h) return false;
        if (f.minMakers !== null && t.makers < f.minMakers) return false;
        if (f.minTxns !== null && t.txns24h < f.minTxns) return false;
        if (f.verifiedOnly && !t.isVerified) return false;
        if (f.hideRugRisk && isLikelyRug(t)) return false;
        return true;
      });
    }

    switch (activeView) {
      case 'new': {
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        result = result
          .filter((t) => t.createdAt > sevenDaysAgo)
          .sort((a, b) => b.createdAt - a.createdAt);
        break;
      }
      case 'gainers':
        result = result
          .filter((t) => t.priceChange24h > 0)
          .sort((a, b) => b.priceChange24h - a.priceChange24h);
        break;
      case 'losers':
        result = result
          .filter((t) => t.priceChange24h < 0)
          .sort((a, b) => a.priceChange24h - b.priceChange24h);
        break;
      case 'watchlist':
        result = result.filter((t) => favorites.has(t.address));
        break;
      default:
        result = [...result].sort((a, b) => b.liquidity - a.liquidity);
        break;
    }

    return result;
  }, [tokens, activeView, favorites, searchQuery, screenerFilters]);

  const pairCounts = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return {
      all: tokens.length,
      new: tokens.filter((t) => t.createdAt > sevenDaysAgo).length,
      gainers: tokens.filter((t) => t.priceChange24h > 0).length,
      losers: tokens.filter((t) => t.priceChange24h < 0).length,
      watchlist: tokens.filter((t) => favorites.has(t.address)).length,
    };
  }, [tokens, favorites]);

  // All tokens from both chains for search
  const allTokens = useMemo(() => [...x1Tokens, ...solanaTokens], [x1Tokens, solanaTokens]);

  // Export CSV
  const handleExport = useCallback(() => {
    const csv = exportTokensCSV(filteredTokens);
    const chainLabel = activeChain === 'x1' ? 'X1' : 'Solana';
    downloadCSV(csv, `alpha-${chainLabel}-${activeView}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('success', `Exported ${filteredTokens.length} tokens to CSV`);
  }, [activeChain, activeView, toast, filteredTokens]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (isInput) return;

      if (e.key !== 'Escape' && (showBoostForm || showBoostProfile || showColumnSettings || showWalletStub)) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
        case 'Escape':
          if (showShortcuts) setShowShortcuts(false);
          else if (showColumnSettings) setShowColumnSettings(false);
          else if (showWalletStub) setShowWalletStub(false);
          else if (showBoostForm) setShowBoostForm(false);
          else if (showBoostProfile) setShowBoostProfile(false);
          else if (selectedToken) setSelectedToken(null);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTokens.length - 1));
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < filteredTokens.length) {
            setSelectedToken(filteredTokens[selectedIndex]);
          }
          break;
        case 'f':
        case 'F':
          if (selectedIndex >= 0 && selectedIndex < filteredTokens.length) {
            e.preventDefault();
            toggleFavorite(filteredTokens[selectedIndex].address);
          }
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          handleExport();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          const idx = parseInt(e.key) - 1;
          if (idx >= 0 && idx < filterViewIds.length) {
            e.preventDefault();
            setActiveView(filterViewIds[idx]);
            setSelectedIndex(-1);
          }
          break;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedToken, selectedIndex, filteredTokens, showShortcuts, showColumnSettings, showWalletStub, showBoostForm, showBoostProfile, handleExport, toggleFavorite]);

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [activeView, activeChain, searchQuery]);

  return (
    <div className="flex h-screen overflow-hidden bg-xdex-bg">
      {/* Sidebar — desktop */}
      <div className="sidebar-desktop">
        <Sidebar
          onAdvertise={() => setShowBoostForm(true)}
          onProfile={() => setShowBoostProfile(true)}
          activeChain={activeChain}
          onChainChange={setActiveChain}
          x1Count={x1Tokens.length}
          solanaCount={solanaTokens.length}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[80] flex md:hidden">
          <div className="absolute inset-0 modal-overlay" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar
              onAdvertise={() => { setShowBoostForm(true); setMobileSidebarOpen(false); }}
              onProfile={() => { setShowBoostProfile(true); setMobileSidebarOpen(false); }}
              activeChain={activeChain}
              onChainChange={setActiveChain}
              x1Count={x1Tokens.length}
              solanaCount={solanaTokens.length}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          tokens={tokens}
          allTokens={allTokens}
          trendingTimeframe={trendingTimeframe}
          onTimeframeChange={setTrendingTimeframe}
          onTokenClick={(token) => {
            setActiveChain(token.chain);
            setSelectedToken(token);
          }}
        />

        {/* Title bar: XDEX logo | Alpha | LIVE | filters | search | chain toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#222] bg-xdex-bg">
          {/* Left: mobile menu + XDEX mark + Alpha + LIVE */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1 rounded-md text-xdex-text-muted hover:text-white transition-colors"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-white tracking-tight">Alpha</span>
            </div>
            <div className="flex items-center gap-1 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
              <span className="text-[11px] text-xdex-green font-medium">LIVE</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-xdex-border/60 mx-1 hidden sm:block" />

            {/* Filter tabs — hide on very small screens */}
            <div className="hidden sm:flex items-center gap-1 bg-[#111] rounded-xl p-1 border border-[#333]">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeView === tab.id;
                const count = pairCounts[tab.id];

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                      isActive
                        ? `${tab.activeColor} border border-current/20`
                        : 'text-xdex-text-secondary hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon size={14} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span className="hidden md:inline">{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/15' : 'bg-[#222]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[#333] mx-1.5 hidden sm:block" />

            {/* Price timeframe toggle */}
            <div className="hidden sm:flex items-center bg-[#111] rounded-xl p-1 border border-[#333]">
              {([
                { value: '5m' as TimeFilter, label: '5M' },
                { value: '1h' as TimeFilter, label: '1H' },
                { value: '6h' as TimeFilter, label: '6H' },
                { value: '24h' as TimeFilter, label: '24H' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriceTimeFilter(opt.value)}
                  className={`px-3 py-1.5 text-[13px] font-bold rounded-lg transition-all ${
                    priceTimeFilter === opt.value
                      ? 'bg-xdex-accent text-white shadow-md shadow-xdex-accent/20'
                      : 'text-xdex-text-secondary hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Inline search — right of timeframe */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black border border-xdex-accent/15 focus-within:border-xdex-accent/40 transition-colors">
              <Search size={12} className="text-xdex-text-muted flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[13px] text-white placeholder:text-xdex-text-muted outline-none w-28 focus:w-40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xdex-text-muted hover:text-white text-xs"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-2">
            {/* Screener filters */}
            <button
              onClick={() => setShowScreenerFilters(!showScreenerFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                showScreenerFilters || isFiltersActive(screenerFilters)
                  ? 'text-xdex-accent bg-xdex-accent/10'
                  : 'text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10'
              }`}
              title="Screener filters"
            >
              <SlidersHorizontal size={14} />
            </button>

            {/* Compare */}
            <button
              onClick={() => { setCompareInitialToken(null); setShowCompare(true); }}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
              title="Compare tokens"
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* Sniper */}
            <button
              onClick={() => setShowSniper(true)}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
              title="Pair Sniper"
            >
              <Crosshair size={14} />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
              title="Export CSV (E)"
            >
              <Download size={14} />
            </button>

            {/* Column settings */}
            <button
              onClick={() => setShowColumnSettings(true)}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors"
              title="Column settings"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-2 bg-xdex-red/10 border-b border-xdex-red/20">
            <span className="text-xs text-xdex-red">{error}</span>
            <button
              onClick={() => loadData()}
              className="ml-3 text-xs text-xdex-accent hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Screener filters panel */}
        {showScreenerFilters && (
          <ScreenerFilters
            filters={screenerFilters}
            onChange={setScreenerFilters}
            onClose={() => setShowScreenerFilters(false)}
            matchCount={filteredTokens.length}
          />
        )}

        {/* Token table */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-xdex-text-muted">
                Loading {activeChain === 'x1' ? 'X1' : 'Solana'} pairs from XDEX...
              </span>
            </div>
          </div>
        ) : (
          <TokenTable
            tokens={filteredTokens}
            onTokenClick={setSelectedToken}
            onSwap={setSwapToken}
            onFavorite={toggleFavorite}
            favorites={favorites}
            boostMap={boostMap}
            visibleColumns={visibleColumns}
            selectedIndex={selectedIndex}
            timeFilter={priceTimeFilter}
          />
        )}
      </div>

      {/* Token detail slide-over */}
      {selectedToken && (
        <TokenDetail
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onSwap={(t) => {
            setSwapToken(t);
            setSelectedToken(null);
          }}
          isFavorited={favorites.has(selectedToken.address)}
          onFavorite={toggleFavorite}
          boost={boostMap.get(selectedToken.address.toLowerCase()) ?? null}
        />
      )}

      {/* Swap modal */}
      {swapToken && (
        <SwapModal
          token={swapToken}
          onClose={() => setSwapToken(null)}
        />
      )}

      {/* Boost form modal */}
      {showBoostForm && (
        <BoostForm
          tokens={tokens}
          chain={activeChain}
          onClose={() => setShowBoostForm(false)}
          onSuccess={() => setBoostVersion((v) => v + 1)}
        />
      )}

      {/* Boost profile modal */}
      {showBoostProfile && (
        <BoostProfile
          onClose={() => setShowBoostProfile(false)}
          onNewBoost={() => {
            setShowBoostProfile(false);
            setShowBoostForm(true);
          }}
        />
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}

      {/* Column settings modal */}
      {showColumnSettings && (
        <ColumnSettings
          visible={visibleColumns}
          onChange={handleColumnChange}
          onClose={() => setShowColumnSettings(false)}
        />
      )}

      {/* Wallet stub modal */}
      {showWalletStub && (
        <WalletStub onClose={() => setShowWalletStub(false)} />
      )}

      {/* Token compare modal */}
      {showCompare && (
        <TokenCompare
          tokens={allTokens}
          onClose={() => setShowCompare(false)}
          initialToken={compareInitialToken}
        />
      )}

      {/* Sniper panel modal */}
      {showSniper && (
        <SniperPanel
          onClose={() => setShowSniper(false)}
          onTokenClick={(address, chain) => {
            const allPools = [...x1Tokens, ...solanaTokens];
            const match = allPools.find((t) => t.address === address);
            if (match) {
              setActiveChain(chain);
              setSelectedToken(match);
            }
          }}
        />
      )}
    </div>
  );
}
