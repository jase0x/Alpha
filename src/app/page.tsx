'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TokenPair, FilterView, TimeFilter, Chain } from '@/types/token';
import { ColumnId, getVisibleColumns, saveVisibleColumns, exportTokensCSV, downloadCSV } from '@/utils/columnPrefs';
import { useToast } from '@/components/ui/Toast';
import { useTokenData, useFilteredTokens } from '@/hooks/useTokenData';
import { DEFAULT_FILTERS, isFiltersActive, ScreenerFilterValues } from '@/components/screener/ScreenerFilters';
import FilterBar from '@/components/screener/FilterBar';
import TokenTable from '@/components/token/TokenTable';
import TokenDetail from '@/components/token/TokenDetail';
import SwapModal from '@/components/swap/SwapModal';
import BoostForm from '@/components/boost/BoostForm';
import BoostProfile from '@/components/boost/BoostProfile';
import ScreenerFilters from '@/components/screener/ScreenerFilters';
import TokenCompare from '@/components/compare/TokenCompare';
import SniperPanel from '@/components/sniper/SniperPanel';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import ColumnSettings from '@/components/ui/ColumnSettings';
import WalletStub from '@/components/ui/WalletStub';

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

  // Data fetching via extracted hook
  const { x1Tokens, solanaTokens, allTokens, loading, error, boostMap, loadData, refreshBoosts } = useTokenData({
    onAlert: (msg) => toast('info', msg),
    onSniperMatch: (msg) => toast('success', msg),
  });

  const [activeChain, setActiveChain] = useState<Chain>(
    (searchParams.get('chain') as Chain) || 'x1'
  );
  const [activeView, setActiveView] = useState<FilterView>(
    (searchParams.get('view') as FilterView) || 'all'
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedToken, setSelectedToken] = useState<TokenPair | null>(null);
  const [swapToken, setSwapToken] = useState<TokenPair | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingTokenId = useRef<string | null>(searchParams.get('token'));

  // Boost form/profile state
  const [showBoostForm, setShowBoostForm] = useState(false);
  const [showBoostProfile, setShowBoostProfile] = useState(false);

  // Column settings
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => getVisibleColumns());
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Wallet stub
  const [showWalletStub, setShowWalletStub] = useState(false);

  // Selected row index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Screener filters
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterValues>(DEFAULT_FILTERS);
  const [showScreenerFilters, setShowScreenerFilters] = useState(false);

  // Compare modal
  const [showCompare, setShowCompare] = useState(false);
  const [compareInitialToken, setCompareInitialToken] = useState<TokenPair | null>(null);

  // Sniper panel
  const [showSniper, setShowSniper] = useState(false);

  // Time filter for price column
  const [priceTimeFilter, setPriceTimeFilter] = useState<TimeFilter>('24h');

  // Current tokens based on active chain
  const tokens = activeChain === 'x1' ? x1Tokens : solanaTokens;

  // When searching, search across ALL tokens from both chains
  const tokensToFilter = searchQuery.trim() ? allTokens : tokens;

  // Filtered tokens via extracted hook (pass timeFilter for gainers/losers)
  const filteredTokens = useFilteredTokens(tokensToFilter, activeView, favorites, searchQuery, screenerFilters, priceTimeFilter);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alpha-favorites');
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch { /* ignore corrupt data */ }
    }
  }, []);

  // Sync URL state
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
    <div className="flex flex-col min-w-0 h-screen">
      {/* Filter bar */}
      <FilterBar
        activeView={activeView}
        onViewChange={setActiveView}
        pairCounts={pairCounts}
        priceTimeFilter={priceTimeFilter}
        onTimeFilterChange={setPriceTimeFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        isFiltersActive={isFiltersActive(screenerFilters)}
        showScreenerFilters={showScreenerFilters}
        onToggleScreenerFilters={() => setShowScreenerFilters(!showScreenerFilters)}
        onCompare={() => { setCompareInitialToken(null); setShowCompare(true); }}
        onSniper={() => setShowSniper(true)}
        onExport={handleExport}
        onColumnSettings={() => setShowColumnSettings(true)}
        onMobileMenu={() => {}}
      />

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

      {/* Token detail slide-over */}
      {selectedToken && (
        <TokenDetail
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onSwap={(t) => {
            setSwapToken(t);
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
          onSuccess={refreshBoosts}
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
