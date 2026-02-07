export type Chain = 'x1' | 'solana';

export interface TokenPair {
  address: string;
  baseToken: {
    address: string;
    symbol: string;
    name: string;
    imageUrl?: string;
    decimals?: number;
  };
  quoteToken: {
    address: string;
    symbol: string;
    name: string;
    imageUrl?: string;
    decimals?: number;
  };
  chain: Chain;
  dex: string;
  pairLabel: string;
  price: number;
  priceUsd: number;
  age: string;
  createdAt: number;
  txns24h: number;
  volume24h: number;
  makers: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  isFavorited?: boolean;
  isVerified?: boolean;
  // Extended fields
  lpHolderCount?: number;
  fee24h?: number;
  apr24h?: number;
  lpPrice?: number;
}

export interface TokenDetail extends TokenPair {
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  totalSupply?: number;
  holders?: number;
  poolAddress?: string;
}

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SortField =
  | 'price'
  | 'age'
  | 'txns'
  | 'volume'
  | 'makers'
  | 'priceChange5m'
  | 'priceChange1h'
  | 'priceChange6h'
  | 'priceChange24h'
  | 'liquidity'
  | 'marketCap';

export type SortDirection = 'asc' | 'desc';

export type FilterView = 'all' | 'new' | 'gainers' | 'losers' | 'watchlist';

export type TimeFilter = '5m' | '1h' | '6h' | '24h';
