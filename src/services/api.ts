import { TokenPair, OHLCVData, Chain } from '@/types/token';

const XDEX_API = 'https://api.xdex.xyz';

// Map our chain type to XDEX network parameter
function getNetwork(chain: Chain): string {
  return chain === 'x1' ? 'X1 Mainnet' : 'Solana Mainnet';
}

// Resolve logo URL (some are relative paths on XDEX)
function resolveLogoUrl(logo: string | undefined | null): string {
  if (!logo) return '';
  if (logo.startsWith('http')) return logo;
  if (logo.startsWith('/')) return `https://app.xdex.xyz${logo}`;
  return logo;
}

// ============================================================
// Pool list — main data source
// ============================================================

export async function fetchPoolList(chain: Chain): Promise<TokenPair[]> {
  const network = getNetwork(chain);
  const res = await fetch(
    `${XDEX_API}/api/xendex/pool/list?network=${encodeURIComponent(network)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) throw new Error(`Pool list error: ${res.status}`);
  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data.map((p: any) => mapPoolToPair(p, chain));
}

// ============================================================
// Swap quote — for swap modal
// ============================================================

export async function fetchSwapQuote(
  chain: Chain,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
): Promise<{ amountOut: number; rate: number } | null> {
  try {
    const network = getNetwork(chain);
    const res = await fetch(
      `${XDEX_API}/api/xendex/swap/quote?network=${encodeURIComponent(network)}&token_in=${tokenIn}&token_out=${tokenOut}&token_in_amount=${amountIn}&is_exact_amount_in=true`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return {
      amountOut: Number(json.data?.token_out_amount || 0),
      rate: Number(json.data?.rate || 0),
    };
  } catch {
    return null;
  }
}

// ============================================================
// Pool detail
// ============================================================

export async function fetchPoolDetail(
  poolAddress: string,
  chain: Chain,
): Promise<TokenPair | null> {
  try {
    const network = getNetwork(chain);
    const res = await fetch(
      `${XDEX_API}/api/xendex/pool/${poolAddress}?network=${encodeURIComponent(network)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return mapPoolToPair(json.data, chain);
  } catch {
    return null;
  }
}

// ============================================================
// Token price
// ============================================================

export async function fetchTokenPrice(
  tokenAddress: string,
  chain: Chain,
): Promise<number | null> {
  try {
    const network = getNetwork(chain);
    const res = await fetch(
      `${XDEX_API}/api/token-price/price?network=${encodeURIComponent(network)}&address=${tokenAddress}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return Number(json.data?.price || 0);
  } catch {
    return null;
  }
}

// ============================================================
// OHLCV — generate from price data (API chart endpoints need params we don't have yet)
// ============================================================

export async function fetchOHLCV(
  _pairAddress: string,
  _timeframe: string = '1h',
  basePrice: number = 0.001,
): Promise<OHLCVData[]> {
  // Generate realistic OHLCV based on the token's current price
  return generateOHLCVFromPrice(basePrice);
}

// ============================================================
// Search — client-side filter since API doesn't have a search endpoint
// ============================================================

export async function searchTokens(
  query: string,
  allTokens: TokenPair[],
): Promise<TokenPair[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return allTokens.filter(
    (p) =>
      p.baseToken.symbol.toLowerCase().includes(q) ||
      p.baseToken.name.toLowerCase().includes(q) ||
      p.quoteToken.symbol.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q),
  );
}

// ============================================================
// Map XDEX pool response → our TokenPair model
// ============================================================

function mapPoolToPair(p: any, chain: Chain): TokenPair {
  const token1Price = Number(p.token1_price || 0);
  const token2Price = Number(p.token2_price || 0);

  // Determine which token is the "base" (non-native) and which is "quote" (native/stable)
  const isToken1Native = isNativeOrStable(p.token1_symbol);
  const baseSymbol = isToken1Native ? (p.token2_symbol || '?') : (p.token1_symbol || '?');
  const baseName = isToken1Native ? (p.token2_symbol || '') : (p.token1_symbol || '');
  const baseAddress = isToken1Native ? (p.token2_address || '') : (p.token1_address || '');
  const baseLogo = isToken1Native ? p.token2_logo : p.token1_logo;
  const basePrice = isToken1Native ? token2Price : token1Price;

  const quoteSymbol = isToken1Native ? (p.token1_symbol || '') : (p.token2_symbol || '');
  const quoteName = isToken1Native ? (p.token1_symbol || '') : (p.token2_symbol || '');
  const quoteAddress = isToken1Native ? (p.token1_address || '') : (p.token2_address || '');
  const quoteLogo = isToken1Native ? p.token1_logo : p.token2_logo;

  // Volume in USD
  const vol1Usd = Number(p.token1_volume_usd_24h || 0);
  const vol2Usd = Number(p.token2_volume_usd_24h || 0);
  const volumeUsd = vol1Usd + vol2Usd;

  // Compute total volume from trade amounts if USD volume is 0
  const tradeVol1 = Number(p.token1_total_trade_amount || 0) * token1Price;
  const tradeVol2 = Number(p.token2_total_trade_amount || 0) * token2Price;

  const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();

  return {
    address: p.pool_address || '',
    baseToken: {
      address: baseAddress,
      symbol: baseSymbol,
      name: baseName,
      imageUrl: resolveLogoUrl(baseLogo),
    },
    quoteToken: {
      address: quoteAddress,
      symbol: quoteSymbol,
      name: quoteName,
      imageUrl: resolveLogoUrl(quoteLogo),
    },
    chain,
    dex: 'xdex',
    pairLabel: `${baseSymbol}/${quoteSymbol}`,
    price: basePrice,
    priceUsd: basePrice,
    age: '',
    createdAt,
    txns24h: Number(p.txns_24h || 0),
    volume24h: volumeUsd || tradeVol1 + tradeVol2,
    makers: Number(p.lp_token_holder_count || 0),
    priceChange5m: 0,
    priceChange1h: 0,
    priceChange6h: 0,
    priceChange24h: Number(p.apr_24h || 0) > 0 ? Number(p.apr_24h) / 365 : 0,
    liquidity: Number(p.tvl || 0),
    marketCap: 0,
    fdv: 0,
    isVerified: false,
  };
}

function isNativeOrStable(symbol: string | undefined): boolean {
  if (!symbol) return false;
  const natives = ['WXNT', 'XNT', 'SOL', 'WSOL', 'USDC', 'USDT', 'USDC.X'];
  return natives.includes(symbol.toUpperCase());
}

// ============================================================
// Generate OHLCV from a base price for chart display
// ============================================================

function generateOHLCVFromPrice(basePrice: number): OHLCVData[] {
  const data: OHLCVData[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = basePrice * (0.7 + Math.random() * 0.3);

  for (let i = 200; i >= 0; i--) {
    const time = now - i * 3600;
    const volatility = 0.02 + Math.random() * 0.08;
    const change = (Math.random() - 0.47) * volatility;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.random() * 50000 + 500;

    data.push({ time, open, high, low, close, volume });
    price = close;
  }
  return data;
}
