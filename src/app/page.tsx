'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { TokenPair, FilterView, TimeFilter, Chain } from '@/types/token';
import { fetchPoolList } from '@/services/api';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TokenTable from '@/components/token/TokenTable';
import TokenDetail from '@/components/token/TokenDetail';
import SwapModal from '@/components/swap/SwapModal';
import X1Logo from '@/components/ui/X1Logo';
import SolanaLogo from '@/components/ui/SolanaLogo';

export default function AlphaPage() {
  // Separate data stores for each chain
  const [x1Tokens, setX1Tokens] = useState<TokenPair[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeChain, setActiveChain] = useState<Chain>('x1');
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [trendingTimeframe, setTrendingTimeframe] = useState<TimeFilter>('24h');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedToken, setSelectedToken] = useState<TokenPair | null>(null);
  const [swapToken, setSwapToken] = useState<TokenPair | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        activeView={activeView}
        onViewChange={setActiveView}
        onSearchOpen={() => searchInputRef.current?.focus()}
        pairCounts={pairCounts}
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

        {/* View title bar with search and chain toggle */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-xdex-border bg-xdex-bg">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white capitalize">
              {activeView === 'all' ? 'All Pairs' : activeView === 'new' ? 'New Pairs' : activeView}
            </h2>
            <span className="text-xs text-xdex-text-muted">
              {filteredTokens.length} pairs
            </span>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-xdex-green live-dot" />
              <span className="text-[10px] text-xdex-green">LIVE</span>
            </div>
            {/* Inline search */}
            <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1.5 rounded-lg bg-xdex-card border border-xdex-border/50 focus-within:border-xdex-accent/40 transition-colors">
              <Search size={12} className="text-xdex-text-muted flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder:text-xdex-text-muted outline-none w-32 focus:w-48 transition-all"
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

          {/* Chain toggle */}
          <div className="flex items-center gap-1 bg-xdex-card/50 rounded-lg p-0.5 border border-xdex-border/50">
            <button
              onClick={() => setActiveChain('x1')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeChain === 'x1'
                  ? 'bg-xdex-accent/15 text-xdex-accent'
                  : 'text-xdex-text-muted hover:text-xdex-text'
              }`}
            >
              <X1Logo size={16} />
              X1
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeChain === 'x1' ? 'bg-xdex-accent/15' : 'bg-xdex-border/50'
              }`}>
                {x1Tokens.length}
              </span>
            </button>
            <button
              onClick={() => setActiveChain('solana')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeChain === 'solana'
                  ? 'bg-xdex-accent/15 text-xdex-accent'
                  : 'text-xdex-text-muted hover:text-xdex-text'
              }`}
            >
              <SolanaLogo size={16} />
              Solana
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeChain === 'solana' ? 'bg-xdex-accent/15' : 'bg-xdex-border/50'
              }`}>
                {solanaTokens.length}
              </span>
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
        />
      )}

      {/* Swap modal */}
      {swapToken && (
        <SwapModal
          token={swapToken}
          onClose={() => setSwapToken(null)}
        />
      )}

      {/* Search now inline — no modal needed */}
    </div>
  );
}
