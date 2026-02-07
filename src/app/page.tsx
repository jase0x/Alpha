'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TokenPair, FilterView, TimeFilter, Chain } from '@/types/token';
import { fetchTokenPairs } from '@/services/api';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TokenTable from '@/components/token/TokenTable';
import TokenDetail from '@/components/token/TokenDetail';
import SwapModal from '@/components/swap/SwapModal';
import SearchModal from '@/components/ui/SearchModal';

export default function AlphaPage() {
  const [tokens, setTokens] = useState<TokenPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [trendingTimeframe, setTrendingTimeframe] = useState<TimeFilter>('6h');
  const [chainFilter, setChainFilter] = useState<Chain | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedToken, setSelectedToken] = useState<TokenPair | null>(null);
  const [swapToken, setSwapToken] = useState<TokenPair | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Load tokens
  useEffect(() => {
    async function load() {
      setLoading(true);
      const pairs = await fetchTokenPairs(chainFilter || undefined);
      setTokens(pairs);
      setLoading(false);
    }
    load();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTokenPairs(chainFilter || undefined).then(setTokens);
    }, 30000);

    return () => clearInterval(interval);
  }, [chainFilter]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alpha-favorites');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowSearch(true);
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

  // Filter tokens based on active view
  const filteredTokens = useMemo(() => {
    let result = tokens;

    switch (activeView) {
      case 'new':
        // Tokens created in last 24h
        result = result
          .filter((t) => Date.now() - t.createdAt < 7 * 86400000)
          .sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'gainers':
        result = result
          .filter((t) => {
            const change =
              trendingTimeframe === '5m' ? t.priceChange5m :
              trendingTimeframe === '1h' ? t.priceChange1h :
              trendingTimeframe === '6h' ? t.priceChange6h :
              t.priceChange24h;
            return change > 0;
          })
          .sort((a, b) => {
            const aChange =
              trendingTimeframe === '5m' ? a.priceChange5m :
              trendingTimeframe === '1h' ? a.priceChange1h :
              trendingTimeframe === '6h' ? a.priceChange6h :
              a.priceChange24h;
            const bChange =
              trendingTimeframe === '5m' ? b.priceChange5m :
              trendingTimeframe === '1h' ? b.priceChange1h :
              trendingTimeframe === '6h' ? b.priceChange6h :
              b.priceChange24h;
            return bChange - aChange;
          });
        break;
      case 'losers':
        result = result
          .filter((t) => {
            const change =
              trendingTimeframe === '5m' ? t.priceChange5m :
              trendingTimeframe === '1h' ? t.priceChange1h :
              trendingTimeframe === '6h' ? t.priceChange6h :
              t.priceChange24h;
            return change < 0;
          })
          .sort((a, b) => {
            const aChange =
              trendingTimeframe === '5m' ? a.priceChange5m :
              trendingTimeframe === '1h' ? a.priceChange1h :
              trendingTimeframe === '6h' ? a.priceChange6h :
              a.priceChange24h;
            const bChange =
              trendingTimeframe === '5m' ? b.priceChange5m :
              trendingTimeframe === '1h' ? b.priceChange1h :
              trendingTimeframe === '6h' ? b.priceChange6h :
              b.priceChange24h;
            return aChange - bChange;
          });
        break;
      case 'watchlist':
        result = result.filter((t) => favorites.has(t.address));
        break;
      default:
        break;
    }

    return result;
  }, [tokens, activeView, trendingTimeframe, favorites]);

  const pairCounts = useMemo(() => ({
    all: tokens.length,
    new: tokens.filter((t) => Date.now() - t.createdAt < 7 * 86400000).length,
    gainers: tokens.filter((t) => t.priceChange24h > 0).length,
    losers: tokens.filter((t) => t.priceChange24h < 0).length,
    watchlist: tokens.filter((t) => favorites.has(t.address)).length,
  }), [tokens, favorites]);

  return (
    <div className="flex h-screen overflow-hidden bg-xdex-bg">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onSearchOpen={() => setShowSearch(true)}
        pairCounts={pairCounts}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          tokens={tokens}
          trendingTimeframe={trendingTimeframe}
          onTimeframeChange={setTrendingTimeframe}
        />

        {/* View title bar */}
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
          </div>

          {/* Chain filter pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChainFilter(null)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                !chainFilter
                  ? 'bg-xdex-accent/20 text-xdex-accent border border-xdex-accent/40'
                  : 'bg-xdex-card border border-xdex-border text-xdex-text-muted hover:text-xdex-text'
              }`}
            >
              All Chains
            </button>
            <button
              onClick={() => setChainFilter('x1')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                chainFilter === 'x1'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-xdex-card border border-xdex-border text-xdex-text-muted hover:text-xdex-text'
              }`}
            >
              X1
            </button>
            <button
              onClick={() => setChainFilter('solana')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                chainFilter === 'solana'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-xdex-card border border-xdex-border text-xdex-text-muted hover:text-xdex-text'
              }`}
            >
              Solana
            </button>
          </div>
        </div>

        {/* Token table */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-xdex-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-xdex-text-muted">Loading pairs...</span>
            </div>
          </div>
        ) : (
          <TokenTable
            tokens={filteredTokens}
            onTokenClick={setSelectedToken}
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

      {/* Search modal */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelect={(token) => {
            setSelectedToken(token);
            setShowSearch(false);
          }}
          recentTokens={tokens.slice(0, 10)}
        />
      )}
    </div>
  );
}
