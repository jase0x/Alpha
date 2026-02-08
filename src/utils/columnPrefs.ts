import { TokenPair } from '@/types/token';

const STORAGE_KEY = 'alpha-column-prefs';

export type ColumnId =
  | 'token' | 'price' | 'age' | 'txns' | 'volume'
  | 'makers' | 'liquidity' | 'marketCap' | 'safety' | 'chart' | 'swap';

export const ALL_COLUMNS: { id: ColumnId; label: string; defaultVisible: boolean }[] = [
  { id: 'token', label: 'TOKEN', defaultVisible: true },
  { id: 'price', label: 'PRICE / %', defaultVisible: true },
  { id: 'age', label: 'AGE', defaultVisible: true },
  { id: 'volume', label: 'VOLUME', defaultVisible: true },
  { id: 'txns', label: 'TXNS', defaultVisible: true },
  { id: 'liquidity', label: 'LIQUIDITY', defaultVisible: true },
  { id: 'marketCap', label: 'MCAP', defaultVisible: true },
  { id: 'makers', label: 'MAKERS', defaultVisible: true },
  { id: 'safety', label: 'SAFETY', defaultVisible: true },
  { id: 'chart', label: 'LAST 24H', defaultVisible: true },
  { id: 'swap', label: '', defaultVisible: true },
];

export function getVisibleColumns(): Set<ColumnId> {
  if (typeof window === 'undefined') {
    return new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = new Set<ColumnId>(JSON.parse(raw));
      // Always include token, chart, swap
      parsed.add('token');
      parsed.add('chart');
      parsed.add('swap');
      return parsed;
    }
  } catch {}
  return new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id));
}

export function saveVisibleColumns(cols: Set<ColumnId>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...cols]));
}

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTokensCSV(tokens: TokenPair[]): string {
  const headers = [
    'Symbol', 'Name', 'Address', 'Chain', 'Price (USD)', 'Price Change 5m',
    'Price Change 1h', 'Price Change 6h', 'Price Change 24h', 'Volume 24h',
    'Liquidity', 'Market Cap', 'TXNS 24h', 'Makers', 'Age (Created)',
  ];

  const rows = tokens.map((t) => [
    csvEscape(t.baseToken.symbol),
    csvEscape(t.baseToken.name),
    t.address,
    t.chain,
    t.priceUsd,
    t.priceChange5m,
    t.priceChange1h,
    t.priceChange6h,
    t.priceChange24h,
    t.volume24h,
    t.liquidity,
    t.marketCap,
    t.txns24h,
    t.makers,
    new Date(t.createdAt).toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csv;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
