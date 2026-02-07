'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TokenPair, SortField, SortDirection } from '@/types/token';
import TokenRow from './TokenRow';

interface TokenTableProps {
  tokens: TokenPair[];
  onTokenClick: (token: TokenPair) => void;
  onSwap: (token: TokenPair) => void;
  onFavorite: (address: string) => void;
  favorites: Set<string>;
}

interface ColumnDef {
  key: SortField | 'token';
  label: string;
  align: 'left' | 'right' | 'center';
  width?: string;
  sortable: boolean;
}

const columns: ColumnDef[] = [
  { key: 'token', label: 'TOKEN', align: 'left', sortable: false },
  { key: 'price', label: 'PRICE', align: 'right', sortable: true },
  { key: 'age', label: 'AGE', align: 'right', sortable: true },
  { key: 'txns', label: 'TXNS', align: 'right', sortable: true },
  { key: 'volume', label: 'VOLUME', align: 'right', sortable: true },
  { key: 'makers', label: 'MAKERS', align: 'right', sortable: true },
  { key: 'priceChange5m', label: '5M', align: 'right', sortable: true },
  { key: 'priceChange1h', label: '1H', align: 'right', sortable: true },
  { key: 'priceChange6h', label: '6H', align: 'right', sortable: true },
  { key: 'priceChange24h', label: '24H', align: 'right', sortable: true },
  { key: 'liquidity', label: 'LIQUIDITY', align: 'right', sortable: true },
  { key: 'marketCap', label: 'MCAP', align: 'right', sortable: true },
];

function getSortValue(token: TokenPair, field: SortField): number {
  switch (field) {
    case 'price': return token.priceUsd;
    case 'age': return token.createdAt;
    case 'txns': return token.txns24h;
    case 'volume': return token.volume24h;
    case 'makers': return token.makers;
    case 'priceChange5m': return token.priceChange5m;
    case 'priceChange1h': return token.priceChange1h;
    case 'priceChange6h': return token.priceChange6h;
    case 'priceChange24h': return token.priceChange24h;
    case 'liquidity': return token.liquidity;
    case 'marketCap': return token.marketCap;
    default: return 0;
  }
}

export default function TokenTable({
  tokens,
  onTokenClick,
  onSwap,
  onFavorite,
  favorites,
}: TokenTableProps) {
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: string) => {
    if (field === 'token') return;
    const sf = field as SortField;
    if (sortField === sf) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sf);
      setSortDir('desc');
    }
  };

  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const diff = sortField === 'age'
        ? (sortDir === 'desc' ? bVal - aVal : aVal - bVal) // newer first for desc
        : (sortDir === 'desc' ? bVal - aVal : aVal - bVal);
      return diff;
    });
  }, [tokens, sortField, sortDir]);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full" style={{ tableLayout: 'auto' }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-xdex-surface border-b border-xdex-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                  col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
                } ${
                  col.sortable
                    ? 'cursor-pointer select-none hover:text-xdex-accent transition-colors'
                    : ''
                } ${sortField === col.key ? 'text-xdex-accent' : 'text-xdex-text-muted'}`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div
                  className={`flex items-center gap-1 ${
                    col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                  }`}
                >
                  <span>{col.label}</span>
                  {col.sortable && sortField === col.key && (
                    sortDir === 'desc' ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTokens.map((token, index) => (
            <TokenRow
              key={token.address}
              token={token}
              rank={index + 1}
              isFavorited={favorites.has(token.address)}
              onFavorite={onFavorite}
              onClick={onTokenClick}
              onSwap={onSwap}
            />
          ))}
        </tbody>
      </table>
      {sortedTokens.length === 0 && (
        <div className="flex items-center justify-center py-20 text-xdex-text-muted">
          No pairs found
        </div>
      )}
    </div>
  );
}
