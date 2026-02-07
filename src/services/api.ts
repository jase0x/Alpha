import { TokenPair, OHLCVData, Chain } from '@/types/token';

// XDEX API base URL - update when deploying
const XDEX_API_BASE = process.env.NEXT_PUBLIC_XDEX_API_URL || 'https://api.xdex.xyz';

// ============================================================
// XDEX API Integration
// ============================================================

export async function fetchTokenPairs(chain?: Chain): Promise<TokenPair[]> {
  try {
    const params = new URLSearchParams();
    if (chain) params.set('chain', chain);
    params.set('sort', 'volume24h');
    params.set('order', 'desc');
    params.set('limit', '100');

    const res = await fetch(`${XDEX_API_BASE}/v1/pairs?${params}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return mapApiPairs(data.pairs || data);
  } catch {
    // Return mock data for development/preview
    return getMockPairs();
  }
}

export async function fetchNewPairs(chain?: Chain): Promise<TokenPair[]> {
  try {
    const params = new URLSearchParams();
    if (chain) params.set('chain', chain);
    params.set('sort', 'createdAt');
    params.set('order', 'desc');
    params.set('limit', '100');

    const res = await fetch(`${XDEX_API_BASE}/v1/pairs/new?${params}`, {
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return mapApiPairs(data.pairs || data);
  } catch {
    return getMockPairs().sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function fetchTokenDetail(address: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${XDEX_API_BASE}/v1/pairs/${address}`, {
      next: { revalidate: 10 },
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return mapApiPair(data);
  } catch {
    const mock = getMockPairs().find(p => p.address === address);
    return mock || getMockPairs()[0];
  }
}

export async function fetchOHLCV(
  pairAddress: string,
  timeframe: string = '1h',
): Promise<OHLCVData[]> {
  try {
    const res = await fetch(
      `${XDEX_API_BASE}/v1/pairs/${pairAddress}/ohlcv?timeframe=${timeframe}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch {
    return generateMockOHLCV();
  }
}

export async function searchTokens(query: string): Promise<TokenPair[]> {
  try {
    const res = await fetch(
      `${XDEX_API_BASE}/v1/search?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 30 } },
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return mapApiPairs(data.results || data);
  } catch {
    const mock = getMockPairs();
    return mock.filter(
      p =>
        p.baseToken.symbol.toLowerCase().includes(query.toLowerCase()) ||
        p.baseToken.name.toLowerCase().includes(query.toLowerCase()),
    );
  }
}

// ============================================================
// Data mapping from XDEX API response format
// ============================================================

function mapApiPairs(pairs: any[]): TokenPair[] {
  if (!Array.isArray(pairs)) return [];
  return pairs.map(mapApiPair);
}

function mapApiPair(p: any): TokenPair {
  return {
    address: p.pairAddress || p.address || p.id || '',
    baseToken: {
      address: p.baseToken?.address || p.baseTokenAddress || '',
      symbol: p.baseToken?.symbol || p.baseSymbol || '',
      name: p.baseToken?.name || p.baseName || '',
      imageUrl: p.baseToken?.imageUrl || p.baseToken?.logoURI || p.imageUrl || '',
    },
    quoteToken: {
      address: p.quoteToken?.address || p.quoteTokenAddress || '',
      symbol: p.quoteToken?.symbol || p.quoteSymbol || '',
      name: p.quoteToken?.name || p.quoteName || '',
      imageUrl: p.quoteToken?.imageUrl || p.quoteToken?.logoURI || '',
    },
    chain: p.chain || p.chainId || 'x1',
    dex: p.dex || p.dexId || 'xdex',
    pairLabel: p.pairLabel || `${p.baseToken?.symbol || p.baseSymbol}/${p.quoteToken?.symbol || p.quoteSymbol}`,
    price: Number(p.priceUsd || p.price || 0),
    priceUsd: Number(p.priceUsd || p.price || 0),
    age: '',
    createdAt: p.createdAt || p.pairCreatedAt || Date.now(),
    txns24h: Number(p.txns?.h24 || p.txns24h || 0),
    volume24h: Number(p.volume?.h24 || p.volume24h || 0),
    makers: Number(p.makers?.h24 || p.makers || 0),
    priceChange5m: Number(p.priceChange?.m5 || p.priceChange5m || 0),
    priceChange1h: Number(p.priceChange?.h1 || p.priceChange1h || 0),
    priceChange6h: Number(p.priceChange?.h6 || p.priceChange6h || 0),
    priceChange24h: Number(p.priceChange?.h24 || p.priceChange24h || 0),
    liquidity: Number(p.liquidity?.usd || p.liquidity || 0),
    marketCap: Number(p.marketCap || p.mcap || 0),
    fdv: Number(p.fdv || 0),
    isVerified: p.isVerified || false,
  };
}

// ============================================================
// Mock data for development preview
// ============================================================

function getMockPairs(): TokenPair[] {
  const now = Date.now();
  const tokens: TokenPair[] = [
    {
      address: '0x001',
      baseToken: { address: '0xb001', symbol: 'XNM', name: 'Xenium', imageUrl: '' },
      quoteToken: { address: '0xq001', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'XNM/XNT',
      price: 0.001265, priceUsd: 0.001265,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 7492, volume24h: 6520, makers: 486,
      priceChange5m: -0.42, priceChange1h: -26.53, priceChange6h: -20.37, priceChange24h: -20.37,
      liquidity: 16310, marketCap: 622090, fdv: 622090,
    },
    {
      address: '0x002',
      baseToken: { address: '0xb002', symbol: 'MIND', name: 'MIND Token', imageUrl: '' },
      quoteToken: { address: '0xq002', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'MIND/XNT',
      price: 0.1255, priceUsd: 0.1255,
      age: '1mo', createdAt: now - 30 * 86400000,
      txns24h: 165, volume24h: 1090, makers: 102,
      priceChange5m: 0.12, priceChange1h: -0.12, priceChange6h: 39.19, priceChange24h: 39.19,
      liquidity: 3980, marketCap: 35150, fdv: 35150,
    },
    {
      address: '0x003',
      baseToken: { address: '0xb003', symbol: 'XBLK', name: 'Superblock', imageUrl: '' },
      quoteToken: { address: '0xq003', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'XBLK/XNT',
      price: 2.54, priceUsd: 2.54,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 1751, volume24h: 5990, makers: 609,
      priceChange5m: -1.2, priceChange1h: -22.26, priceChange6h: -27.91, priceChange24h: -27.91,
      liquidity: 2430, marketCap: 237400, fdv: 237400,
    },
    {
      address: '0x004',
      baseToken: { address: '0xb004', symbol: 'XEN', name: 'XEN Crypto', imageUrl: '' },
      quoteToken: { address: '0xq004', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'XEN/XNT',
      price: 0.0004497, priceUsd: 0.0004497,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 358, volume24h: 1180, makers: 135,
      priceChange5m: 0.8, priceChange1h: 4.38, priceChange6h: -12.65, priceChange24h: -12.65,
      liquidity: 2380, marketCap: 13380, fdv: 13380,
    },
    {
      address: '0x005',
      baseToken: { address: '0xb005', symbol: 'pXNT', name: 'X1 Delegation Program', imageUrl: '' },
      quoteToken: { address: '0xq005', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'pXNT/XNT',
      price: 0.3594, priceUsd: 0.3594,
      age: '3w', createdAt: now - 21 * 86400000,
      txns24h: 210, volume24h: 4.87, makers: 16,
      priceChange5m: 0, priceChange1h: 0.08, priceChange6h: -0.12, priceChange24h: -0.12,
      liquidity: 2330, marketCap: 94670, fdv: 94670,
    },
    {
      address: '0x006',
      baseToken: { address: '0xb006', symbol: 'THEO', name: 'THEO', imageUrl: '' },
      quoteToken: { address: '0xq006', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'THEO/XNT',
      price: 87.31, priceUsd: 87.31,
      age: '6d', createdAt: now - 6 * 86400000,
      txns24h: 84, volume24h: 1420, makers: 25,
      priceChange5m: -0.3, priceChange1h: 0, priceChange6h: -13.38, priceChange24h: -13.38,
      liquidity: 1470, marketCap: 4370, fdv: 4370,
    },
    {
      address: '0x007',
      baseToken: { address: '0xb007', symbol: 'PEPE', name: 'Pepe', imageUrl: '' },
      quoteToken: { address: '0xq007', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'PEPE/XNT',
      price: 0.00264, priceUsd: 0.00264,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 604, volume24h: 291.51, makers: 72,
      priceChange5m: -0.5, priceChange1h: -9.57, priceChange6h: -21.67, priceChange24h: -21.67,
      liquidity: 1960, marketCap: 18350, fdv: 18350,
    },
    {
      address: '0x008',
      baseToken: { address: '0xb008', symbol: 'CMO', name: 'CMO XEN x1', imageUrl: '' },
      quoteToken: { address: '0xq008', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'CMO/XNT',
      price: 0.00201, priceUsd: 0.00201,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 39, volume24h: 172.65, makers: 32,
      priceChange5m: 0, priceChange1h: 0.18, priceChange6h: -6.12, priceChange24h: -6.12,
      liquidity: 1440, marketCap: 2020, fdv: 2020,
    },
    {
      address: '0x009',
      baseToken: { address: '0xb009', symbol: 'FOREST', name: 'Forest', imageUrl: '' },
      quoteToken: { address: '0xq009', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'FOREST/XNT',
      price: 0.0287, priceUsd: 0.0287,
      age: '2d', createdAt: now - 2 * 86400000,
      txns24h: 269, volume24h: 402.60, makers: 42,
      priceChange5m: 1.2, priceChange1h: -0.03, priceChange6h: -4.49, priceChange24h: -4.49,
      liquidity: 846.52, marketCap: 1990, fdv: 1990,
    },
    {
      address: '0x010',
      baseToken: { address: '0xb010', symbol: 'XUNI', name: 'Xuni', imageUrl: '' },
      quoteToken: { address: '0xq010', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'XUNI/XNT',
      price: 0.000433, priceUsd: 0.000433,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 2907, volume24h: 3290, makers: 431,
      priceChange5m: -2.1, priceChange1h: -53.40, priceChange6h: -53.43, priceChange24h: -53.43,
      liquidity: 842.14, marketCap: 38720, fdv: 38720,
    },
    {
      address: '0x011',
      baseToken: { address: '0xb011', symbol: 'BRAINS', name: 'Brains', imageUrl: '' },
      quoteToken: { address: '0xq011', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'BRAINS/XNT',
      price: 0.000316, priceUsd: 0.000316,
      age: '1mo', createdAt: now - 30 * 86400000,
      txns24h: 32, volume24h: 349.62, makers: 105,
      priceChange5m: 0, priceChange1h: -30.85, priceChange6h: -26.65, priceChange24h: -26.65,
      liquidity: 562.94, marketCap: 2810, fdv: 2810,
    },
    {
      address: '0x012',
      baseToken: { address: '0xb012', symbol: 'rXNT', name: 'Ripper staked XNT', imageUrl: '' },
      quoteToken: { address: '0xq012', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'rXNT/XNT',
      price: 0.3797, priceUsd: 0.3797,
      age: '3w', createdAt: now - 21 * 86400000,
      txns24h: 199, volume24h: 280.20, makers: 195,
      priceChange5m: 0.1, priceChange1h: 0.90, priceChange6h: 1.74, priceChange24h: 1.74,
      liquidity: 2250, marketCap: 3830, fdv: 3830,
    },
    // Solana tokens
    {
      address: 'So1001',
      baseToken: { address: 'So1b001', symbol: 'BONK', name: 'Bonk', imageUrl: '' },
      quoteToken: { address: 'So1q001', symbol: 'SOL', name: 'Solana', imageUrl: '' },
      chain: 'solana', dex: 'raydium', pairLabel: 'BONK/SOL',
      price: 0.00002847, priceUsd: 0.00002847,
      age: '1y', createdAt: now - 365 * 86400000,
      txns24h: 154320, volume24h: 45200000, makers: 28450,
      priceChange5m: 0.32, priceChange1h: 1.45, priceChange6h: -2.87, priceChange24h: 5.67,
      liquidity: 12500000, marketCap: 1890000000, fdv: 1890000000,
    },
    {
      address: 'So1002',
      baseToken: { address: 'So1b002', symbol: 'WIF', name: 'dogwifhat', imageUrl: '' },
      quoteToken: { address: 'So1q002', symbol: 'SOL', name: 'Solana', imageUrl: '' },
      chain: 'solana', dex: 'raydium', pairLabel: 'WIF/SOL',
      price: 2.34, priceUsd: 2.34,
      age: '6mo', createdAt: now - 180 * 86400000,
      txns24h: 89450, volume24h: 125000000, makers: 15600,
      priceChange5m: -0.12, priceChange1h: -0.87, priceChange6h: 3.42, priceChange24h: 8.91,
      liquidity: 8900000, marketCap: 2340000000, fdv: 2340000000,
    },
    {
      address: 'So1003',
      baseToken: { address: 'So1b003', symbol: 'JUP', name: 'Jupiter', imageUrl: '' },
      quoteToken: { address: 'So1q003', symbol: 'USDC', name: 'USD Coin', imageUrl: '' },
      chain: 'solana', dex: 'orca', pairLabel: 'JUP/USDC',
      price: 1.12, priceUsd: 1.12,
      age: '3mo', createdAt: now - 90 * 86400000,
      txns24h: 67800, volume24h: 34500000, makers: 9870,
      priceChange5m: 0.05, priceChange1h: 0.67, priceChange6h: -1.23, priceChange24h: 2.45,
      liquidity: 15600000, marketCap: 1500000000, fdv: 1500000000,
    },
    {
      address: 'So1004',
      baseToken: { address: 'So1b004', symbol: 'POPCAT', name: 'Popcat', imageUrl: '' },
      quoteToken: { address: 'So1q004', symbol: 'SOL', name: 'Solana', imageUrl: '' },
      chain: 'solana', dex: 'raydium', pairLabel: 'POPCAT/SOL',
      price: 0.8934, priceUsd: 0.8934,
      age: '2mo', createdAt: now - 60 * 86400000,
      txns24h: 45230, volume24h: 18700000, makers: 7650,
      priceChange5m: 1.23, priceChange1h: 4.56, priceChange6h: 12.34, priceChange24h: 28.90,
      liquidity: 4300000, marketCap: 870000000, fdv: 870000000,
    },
    {
      address: 'So1005',
      baseToken: { address: 'So1b005', symbol: 'TNSR', name: 'Tensor', imageUrl: '' },
      quoteToken: { address: 'So1q005', symbol: 'SOL', name: 'Solana', imageUrl: '' },
      chain: 'solana', dex: 'orca', pairLabel: 'TNSR/SOL',
      price: 0.654, priceUsd: 0.654,
      age: '4mo', createdAt: now - 120 * 86400000,
      txns24h: 12340, volume24h: 5670000, makers: 3450,
      priceChange5m: -0.34, priceChange1h: -1.23, priceChange6h: -4.56, priceChange24h: -7.89,
      liquidity: 2100000, marketCap: 654000000, fdv: 654000000,
    },
    {
      address: 'So1006',
      baseToken: { address: 'So1b006', symbol: 'RENDER', name: 'Render Token', imageUrl: '' },
      quoteToken: { address: 'So1q006', symbol: 'USDC', name: 'USD Coin', imageUrl: '' },
      chain: 'solana', dex: 'raydium', pairLabel: 'RENDER/USDC',
      price: 7.82, priceUsd: 7.82,
      age: '1y', createdAt: now - 365 * 86400000,
      txns24h: 34560, volume24h: 89000000, makers: 11200,
      priceChange5m: 0.87, priceChange1h: 2.34, priceChange6h: 5.67, priceChange24h: 11.23,
      liquidity: 21000000, marketCap: 3200000000, fdv: 3200000000,
    },
    {
      address: 'So1007',
      baseToken: { address: 'So1b007', symbol: 'PYTH', name: 'Pyth Network', imageUrl: '' },
      quoteToken: { address: 'So1q007', symbol: 'SOL', name: 'Solana', imageUrl: '' },
      chain: 'solana', dex: 'raydium', pairLabel: 'PYTH/SOL',
      price: 0.387, priceUsd: 0.387,
      age: '8mo', createdAt: now - 240 * 86400000,
      txns24h: 23450, volume24h: 12300000, makers: 5670,
      priceChange5m: -0.15, priceChange1h: -0.45, priceChange6h: 1.23, priceChange24h: -3.45,
      liquidity: 8900000, marketCap: 1740000000, fdv: 1740000000,
    },
    {
      address: '0x013',
      baseToken: { address: '0xb013', symbol: 'SHIB', name: 'Shib Inu', imageUrl: '' },
      quoteToken: { address: '0xq013', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'SHIB/XNT',
      price: 0.00526, priceUsd: 0.00526,
      age: '1mo', createdAt: now - 30 * 86400000,
      txns24h: 21, volume24h: 2.60, makers: 32,
      priceChange5m: 0, priceChange1h: -0.56, priceChange6h: -0.55, priceChange24h: -0.55,
      liquidity: 982.93, marketCap: 310400, fdv: 310400,
    },
    {
      address: '0x014',
      baseToken: { address: '0xb014', symbol: 'XNT', name: 'X1 Native Token', imageUrl: '' },
      quoteToken: { address: '0xq014', symbol: 'USDC.X', name: 'USD Coin', imageUrl: '' },
      chain: 'x1', dex: 'xdex', pairLabel: 'XNT/USDC.X',
      price: 0.3853, priceUsd: 0.3853,
      age: '1w', createdAt: now - 7 * 86400000,
      txns24h: 492, volume24h: 23270, makers: 1067,
      priceChange5m: -0.3, priceChange1h: -34.53, priceChange6h: -32.86, priceChange24h: -32.86,
      liquidity: 9190, marketCap: 372070, fdv: 372070,
    },
  ];
  return tokens;
}

function generateMockOHLCV(): OHLCVData[] {
  const data: OHLCVData[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = 0.001 + Math.random() * 0.01;

  for (let i = 200; i >= 0; i--) {
    const time = now - i * 3600;
    const change = (Math.random() - 0.48) * 0.1;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.03);
    const low = Math.min(open, close) * (1 - Math.random() * 0.03);
    const volume = Math.random() * 50000 + 1000;

    data.push({ time, open, high, low, close, volume });
    price = close;
  }
  return data;
}
