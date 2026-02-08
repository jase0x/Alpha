'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TokenPair, FilterView, Chain } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { fetchPoolList } from '@/services/api';
import { getBoostMap } from '@/services/boostStore';
import { checkAlerts } from '@/services/alertStore';
import { seedSentiment } from '@/services/sentimentStore';
import { checkSniperRules } from '@/services/sniperStore';
import { computeSafetyScore } from '@/utils/safetyScore';
import { isLikelyRug } from '@/utils/rugDetector';
import { ScreenerFilterValues, isFiltersActive } from '@/components/screener/ScreenerFilters';

interface UseTokenDataOptions {
  onAlert?: (msg: string) => void;
  onSniperMatch?: (msg: string) => void;
}

export function useTokenData(options?: UseTokenDataOptions) {
  const [x1Tokens, setX1Tokens] = useState<TokenPair[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boostMap, setBoostMap] = useState<Map<string, ActiveBoost>>(new Map());
  const [boostVersion, setBoostVersion] = useState(0);

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
        const x1Addresses = new Set(x1Pools.map((t) => t.address));
        const x1BaseAddresses = new Set(x1Pools.map((t) => t.baseToken.address));
        const uniqueSolana = solData.value.filter(
          (t) => !x1Addresses.has(t.address) && !x1BaseAddresses.has(t.baseToken.address)
        );
        setSolanaTokens(uniqueSolana);
      }

      if (x1Data.status === 'rejected' && solData.status === 'rejected') {
        setError('Failed to load data from XDEX API');
      }

      const allPools = [
        ...(x1Data.status === 'fulfilled' ? x1Data.value : []),
        ...(solData.status === 'fulfilled' ? solData.value : []),
      ];
      for (const t of allPools) {
        seedSentiment(t.address, t.priceChange24h);
      }

      const priceMap = new Map<string, number>();
      for (const t of allPools) {
        priceMap.set(t.address.toLowerCase(), t.priceUsd);
      }
      const triggered = checkAlerts(priceMap);
      if (triggered.length > 0 && options?.onAlert) {
        for (const a of triggered) {
          options.onAlert(`Alert: ${a.tokenSymbol} is now ${a.condition} $${a.targetPrice.toFixed(6)}`);
        }
      }

      const sniperMatches = checkSniperRules(allPools);
      if (sniperMatches.length > 0 && options?.onSniperMatch) {
        for (const m of sniperMatches) {
          options.onSniperMatch(`Sniper: New pair ${m.token.baseToken.symbol} matched "${m.rule.name}"`);
        }
      }
    } catch {
      setError('Failed to connect to XDEX API');
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Initial load
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load boost map
  useEffect(() => {
    setBoostMap(getBoostMap());
  }, [boostVersion]);

  const refreshBoosts = useCallback(() => {
    setBoostVersion((v) => v + 1);
  }, []);

  const allTokens = useMemo(() => [...x1Tokens, ...solanaTokens], [x1Tokens, solanaTokens]);

  return {
    x1Tokens,
    solanaTokens,
    allTokens,
    loading,
    error,
    boostMap,
    loadData,
    refreshBoosts,
  };
}

/** Filter tokens based on view, search, screener filters */
export function useFilteredTokens(
  tokens: TokenPair[],
  activeView: FilterView,
  favorites: Set<string>,
  searchQuery: string,
  screenerFilters: ScreenerFilterValues,
) {
  return useMemo(() => {
    let result = tokens;

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
}
