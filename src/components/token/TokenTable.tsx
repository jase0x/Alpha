'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TokenPair, SortField, SortDirection, TimeFilter } from '@/types/token';
import { ActiveBoost } from '@/types/boost';
import { ColumnId } from '@/utils/columnPrefs';
import { computeSafetyScore } from '@/utils/safetyScore';
import TokenRow from './TokenRow';

interface TokenTableProps {
  tokens: TokenPair[];
  onTokenClick: (token: TokenPair) => void;
  onSwap: (token: TokenPair) => void;
  onFavorite: (address: string) => void;
  favorites: Set<string>;
  boostMap?: Map<string, ActiveBoost>;
  visibleColumns?: Set<ColumnId>;
  selectedIndex?: number;
  timeFilter?: TimeFilter;
}

type SortableField = SortField | 'safety';

interface ColumnDef {
  key: SortableField | 'token' | 'chart' | 'swap';
  label: string;
  align: 'left' | 'right' | 'center';
  sortable: boolean;
  width?: string;
}

const columns: ColumnDef[] = [
  { key: 'token', label: 'TOKEN', align: 'left', sortable: false, width: '280px' },
  { key: 'price', label: 'PRICE / %', align: 'right', sortable: true },
  { key: 'age', label: 'AGE', align: 'right', sortable: true },
  { key: 'volume', label: 'VOLUME', align: 'right', sortable: true },
  { key: 'txns', label: 'TXNS', align: 'right', sortable: true },
  { key: 'liquidity', label: 'LIQUIDITY', align: 'right', sortable: true },
  { key: 'marketCap', label: 'MCAP', align: 'right', sortable: true },
  { key: 'makers', label: 'MAKERS', align: 'right', sortable: true },
  { key: 'safety', label: 'SAFETY', align: 'center', sortable: true },
  { key: 'chart', label: 'LAST 24H', align: 'center', sortable: false, width: '130px' },
  { key: 'swap', label: '', align: 'center', sortable: false, width: '50px' },
];

function getSortValue(token: TokenPair, field: SortableField, tf: TimeFilter): number {
  switch (field) {
    case 'price': {
      const pc = tf === '5m' ? token.priceChange5m : tf === '1h' ? token.priceChange1h : tf === '6h' ? token.priceChange6h : token.priceChange24h;
      return pc;
    }
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
    case 'safety': return computeSafetyScore(token).score;
    default: return 0;
  }
}

export default function TokenTable({
  tokens,
  onTokenClick,
  onSwap,
  onFavorite,
  favorites,
  boostMap,
  visibleColumns,
  selectedIndex,
  timeFilter = '24h',
}: TokenTableProps) {
  const [sortField, setSortField] = useState<SortableField>('safety');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: string) => {
    if (field === 'token' || field === 'chart' || field === 'swap') return;
    const sf = field as SortableField;
    if (sortField === sf) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sf);
      setSortDir('desc');
    }
  };

  const filteredColumns = useMemo(() => {
    if (!visibleColumns) return columns;
    return columns.filter((c) => {
      if (c.key === 'swap' || c.key === 'chart') return true;
      return visibleColumns.has(c.key as ColumnId);
    });
  }, [visibleColumns]);

  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const aVal = getSortValue(a, sortField, timeFilter);
      const bVal = getSortValue(b, sortField, timeFilter);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [tokens, sortField, sortDir, timeFilter]);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {filteredColumns.map((col) => (
            <col
              key={col.key}
              style={{ width: col.width || 'auto' }}
            />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="bg-xdex-surface border-b border-xdex-accent/20">
            {filteredColumns.map((col) => (
              <th
                key={col.key}
                className={`px-2 py-2.5 text-[13px] font-semibold uppercase tracking-wider whitespace-nowrap ${
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
                  {col.key === 'price' ? (
                    <span>PRICE / {timeFilter.toUpperCase()}</span>
                  ) : col.label ? <span>{col.label}</span> : null}
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
              boost={boostMap?.get(token.address.toLowerCase()) ?? null}
              visibleColumns={visibleColumns}
              isSelected={selectedIndex === index}
              timeFilter={timeFilter}
            />
          ))}
        </tbody>
      </table>
      {sortedTokens.length === 0 && (
        <div className="flex items-center justify-center py-20 text-base text-xdex-text-muted">
          No pairs found
        </div>
      )}
    </div>
  );
}
