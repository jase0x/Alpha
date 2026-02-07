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
} from 'lucide-react';
import { TokenPair, FilterView, TimeFilter, Chain } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { fetchPoolList } from '@/services/api';
import { getBoostMap } from '@/services/boostStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TokenTable from '@/components/token/TokenTable';
import TokenDetail from '@/components/token/TokenDetail';
import SwapModal from '@/components/swap/SwapModal';
import BoostForm from '@/components/boost/BoostForm';
import BoostProfile from '@/components/boost/BoostProfile';
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
  { id: 'all', label: 'All Pairs', icon: Layers, activeColor: 'text-xdex-accent border-xdex-accent' },
  { id: 'new', label: 'New Pairs', icon: Flame, activeColor: 'text-orange-400 border-orange-400' },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp, activeColor: 'text-xdex-green border-xdex-green' },
  { id: 'losers', label: 'Losers', icon: TrendingDown, activeColor: 'text-xdex-red border-xdex-red' },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark, activeColor: 'text-yellow-400 border-yellow-400' },
];

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
    } catch {
      setError('Failed to connect to XDEX API');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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

  // Filter tokens based on active view and search query
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
  }, [tokens, activeView, favorites, searchQuery]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-xdex-bg">
      {/* Sidebar */}
      <Sidebar
        onAdvertise={() => setShowBoostForm(true)}
        onProfile={() => setShowBoostProfile(true)}
      />

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
        <div className="flex items-center justify-between px-4 py-2 border-b border-xdex-border bg-xdex-bg">
          {/* Left: XDEX mark + Alpha + LIVE */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <XdexMark size={20} />
              <span className="text-sm font-bold text-white tracking-tight">Alpha</span>
            </div>
            <div className="flex items-center gap-1 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
              <span className="text-[10px] text-xdex-green font-medium">LIVE</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-xdex-border/60 mx-1" />

            {/* Filter tabs */}
            <div className="flex items-center gap-0.5">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeView === tab.id;
                const count = pairCounts[tab.id];

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                      isActive
                        ? `${tab.activeColor} bg-white/5 border-b-2`
                        : 'text-xdex-text-muted hover:text-xdex-text hover:bg-white/[0.03] border-b-2 border-transparent'
                    }`}
                  >
                    <Icon size={12} strokeWidth={isActive ? 2.2 : 1.6} />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                        isActive ? 'bg-white/10' : 'bg-xdex-border/40'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Search + Chain toggle */}
          <div className="flex items-center gap-3">
            {/* Inline search */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-xdex-card border border-xdex-border/50 focus-within:border-xdex-accent/40 transition-colors">
              <Search size={12} className="text-xdex-text-muted flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder:text-xdex-text-muted outline-none w-28 focus:w-40 transition-all"
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

            {/* Chain toggle */}
            <div className="flex items-center gap-1 bg-xdex-card/50 rounded-lg p-0.5 border border-xdex-border/50">
              <button
                onClick={() => setActiveChain('x1')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeChain === 'x1'
                    ? 'bg-xdex-accent/15 text-xdex-accent'
                    : 'text-xdex-text-muted hover:text-xdex-text'
                }`}
              >
                <X1Logo size={14} />
                X1
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeChain === 'x1' ? 'bg-xdex-accent/15' : 'bg-xdex-border/50'
                }`}>
                  {x1Tokens.length}
                </span>
              </button>
              <button
                onClick={() => setActiveChain('solana')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeChain === 'solana'
                    ? 'bg-xdex-accent/15 text-xdex-accent'
                    : 'text-xdex-text-muted hover:text-xdex-text'
                }`}
              >
                <SolanaLogo size={14} />
                Solana
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeChain === 'solana' ? 'bg-xdex-accent/15' : 'bg-xdex-border/50'
                }`}>
                  {solanaTokens.length}
                </span>
              </button>
            </div>
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
    </div>
  );
}
