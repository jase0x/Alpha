'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { searchTokens } from '@/services/api';
import { formatPrice, formatUsd, getChainLabel, getChainColor } from '@/utils/format';

interface SearchModalProps {
  onClose: () => void;
  onSelect: (token: TokenPair) => void;
  allTokens: TokenPair[];
}

export default function SearchModal({ onClose, onSelect, allTokens }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allTokens.filter(
      (p) =>
        p.baseToken.symbol.toLowerCase().includes(q) ||
        p.baseToken.name.toLowerCase().includes(q) ||
        p.quoteToken.symbol.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    );
  }, [query, allTokens]);

  // Show top tokens by liquidity when no query
  const trending = useMemo(() => {
    return [...allTokens]
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, 10);
  }, [allTokens]);

  const displayTokens = query ? results : trending;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-xdex-surface border border-xdex-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-xdex-border">
          <Search size={18} className="text-xdex-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by token name, symbol, or address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-xdex-text-muted border-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xdex-text-muted hover:text-xdex-text"
            >
              <X size={16} />
            </button>
          )}
          <span className="text-[10px] text-xdex-text-muted border border-xdex-border rounded px-1.5 py-0.5">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!query && displayTokens.length > 0 && (
            <div className="px-4 py-2">
              <span className="text-[10px] uppercase tracking-widest text-xdex-text-muted font-semibold flex items-center gap-1.5">
                <TrendingUp size={10} /> Top by Liquidity
              </span>
            </div>
          )}

          {displayTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                onSelect(token);
                onClose();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-xdex-hover transition-colors text-left"
            >
              {token.baseToken.imageUrl ? (
                <img
                  src={token.baseToken.imageUrl}
                  alt={token.baseToken.symbol}
                  className="w-8 h-8 rounded-full bg-xdex-card border border-xdex-border flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-xdex-card border border-xdex-border flex items-center justify-center flex-shrink-0 ${token.baseToken.imageUrl ? 'hidden' : ''}`}>
                <span className="text-[10px] font-bold text-xdex-accent">
                  {token.baseToken.symbol.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">
                    {token.baseToken.symbol}
                  </span>
                  <span className="text-xs text-xdex-text-muted">
                    /{token.quoteToken.symbol}
                  </span>
                  <span className={`chain-badge ${getChainColor(token.chain)}`}>
                    {getChainLabel(token.chain)}
                  </span>
                </div>
                <div className="text-[11px] text-xdex-text-muted truncate">
                  {token.baseToken.name}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-white font-mono">
                  {formatPrice(token.priceUsd)}
                </div>
                <div className="text-[11px] text-xdex-text-muted font-mono">
                  TVL {formatUsd(token.liquidity)}
                </div>
              </div>
            </button>
          ))}

          {query && results.length === 0 && (
            <div className="py-12 text-center text-xdex-text-muted text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
