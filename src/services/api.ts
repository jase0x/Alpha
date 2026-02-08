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
  return json.data
    .map((p: any) => mapPoolToPair(p, chain))
    .filter((t: TokenPair) => t.priceUsd > 0 || t.liquidity > 0);
}

// ============================================================
// Swap quote — sends raw token amounts to API
// ============================================================

export async function fetchSwapQuote(
  chain: Chain,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  tokenInDecimals: number = 9,
): Promise<{ amountOut: number; rate: number; priceImpact: number } | null> {
  try {
    const network = getNetwork(chain);
    // API expects raw amounts (with decimals applied)
    const rawAmount = Math.floor(amountIn * Math.pow(10, tokenInDecimals));
    const res = await fetch(
      `${XDEX_API}/api/xendex/swap/quote?network=${encodeURIComponent(network)}&token_in=${tokenIn}&token_out=${tokenOut}&token_in_amount=${rawAmount}&is_exact_amount_in=true`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;

    return {
      amountOut: Number(json.data.outputAmount ?? json.data.token_out_amount ?? 0),
      rate: Number(json.data.rate ?? 0),
      priceImpact: Number(json.data.priceImpactPct ?? 0),
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

// Fetch extended pool details (token amounts, 7d txns, volume)
export async function fetchPoolDetails(
  poolAddress: string,
  chain: Chain,
): Promise<{
  amount1: number;
  amount2: number;
  volumeUsd24h: number;
  txns7d: number;
} | null> {
  try {
    const network = getNetwork(chain);
    const res = await fetch(
      `${XDEX_API}/api/xendex/pool/details?pool_address=${poolAddress}&network=${encodeURIComponent(network)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return {
      amount1: Number(json.data.amount1 || 0),
      amount2: Number(json.data.amount2 || 0),
      volumeUsd24h: Number(json.data.volume_24h?.usd || 0),
      txns7d: Number(json.data.txns_7d || 0),
    };
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
// OHLCV — real chart data from XDEX chart/history API
// ============================================================

export async function fetchOHLCV(
  token: TokenPair,
  timeframe: string = '1h',
): Promise<OHLCVData[]> {
  try {
    const network = getNetwork(token.chain);
    const fromToken = token.quoteToken.address;
    const toToken = token.baseToken.address;

    // Map timeframe to resolution and time range
    const resolutionMap: Record<string, { resolution: string; seconds: number }> = {
      '5m': { resolution: '5m', seconds: 6 * 3600 },
      '15m': { resolution: '15m', seconds: 24 * 3600 },
      '1h': { resolution: '1h', seconds: 7 * 24 * 3600 },
      '4h': { resolution: '4h', seconds: 30 * 24 * 3600 },
      '1d': { resolution: '1D', seconds: 180 * 24 * 3600 },
    };

    const config = resolutionMap[timeframe] || resolutionMap['1h'];
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - config.seconds;

    const url = `${XDEX_API}/api/xendex/chart/history?from_token=${fromToken}&to_token=${toToken}&resolution=${config.resolution}&time_from=${timeFrom}&time_to=${timeTo}&network=${encodeURIComponent(network)}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.bars && Array.isArray(json.bars) && json.bars.length > 0) {
        return json.bars.map((bar: any) => ({
          time: Number(bar.t),
          open: Number(bar.o),
          high: Number(bar.h),
          low: Number(bar.l),
          close: Number(bar.c),
          volume: Number(bar.v || 0),
        }));
      }
    }

    // Try reversed token order
    const url2 = `${XDEX_API}/api/xendex/chart/history?from_token=${toToken}&to_token=${fromToken}&resolution=${config.resolution}&time_from=${timeFrom}&time_to=${timeTo}&network=${encodeURIComponent(network)}`;
    const res2 = await fetch(url2, { cache: 'no-store' });

    if (res2.ok) {
      const json2 = await res2.json();
      if (json2.bars && Array.isArray(json2.bars) && json2.bars.length > 0) {
        return json2.bars.map((bar: any) => {
          const o = Number(bar.o);
          const h = Number(bar.h);
          const l = Number(bar.l);
          const c = Number(bar.c);
          return {
            time: Number(bar.t),
            open: o > 0 ? 1 / o : 0,
            high: l > 0 ? 1 / l : 0,
            low: h > 0 ? 1 / h : 0,
            close: c > 0 ? 1 / c : 0,
            volume: Number(bar.v || 0),
          };
        });
      }
    }

    // Fallback to generated data
    return generateOHLCVFromPrice(token.priceUsd);
  } catch {
    return generateOHLCVFromPrice(token.priceUsd);
  }
}

// ============================================================
// Pool status — aggregate stats
// ============================================================

export async function fetchPoolStatus(chain: Chain): Promise<{
  poolCount: number;
  totalHolders: number;
  totalTx: number;
} | null> {
  try {
    const network = getNetwork(chain);
    const res = await fetch(
      `${XDEX_API}/api/xendex/pool/status?network=${encodeURIComponent(network)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return {
      poolCount: Number(json.data?.pools_count || 0),
      totalHolders: Number(json.data?.total_holders || 0),
      totalTx: Number(json.data?.total_tx || 0),
    };
  } catch {
    return null;
  }
}

// ============================================================
// Search — client-side filter
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
  const token1Price = p.token1_price != null ? Number(p.token1_price) : 0;
  const token2Price = p.token2_price != null ? Number(p.token2_price) : 0;
  const tvl = Number(p.tvl || 0);

  const isToken1Native = isNativeOrStable(p.token1_symbol);
  const isToken2Native = isNativeOrStable(p.token2_symbol);
  const swapOrder = isToken1Native || (!isToken2Native && token1Price > 0 && token2Price === 0);

  const baseSymbol = swapOrder ? (p.token2_symbol || '?') : (p.token1_symbol || '?');
  const baseName = swapOrder ? (p.token2_symbol || '') : (p.token1_symbol || '');
  const baseAddress = swapOrder ? (p.token2_address || '') : (p.token1_address || '');
  const baseLogo = swapOrder ? p.token2_logo : p.token1_logo;
  const baseDecimals = swapOrder
    ? Number(p.pool_info?.mint1Decimals ?? 9)
    : Number(p.pool_info?.mint0Decimals ?? 9);
  const rawBasePrice = swapOrder ? token2Price : token1Price;

  const quoteSymbol = swapOrder ? (p.token1_symbol || '') : (p.token2_symbol || '');
  const quoteName = swapOrder ? (p.token1_symbol || '') : (p.token2_symbol || '');
  const quoteAddress = swapOrder ? (p.token1_address || '') : (p.token2_address || '');
  const quoteLogo = swapOrder ? p.token1_logo : p.token2_logo;
  const quoteDecimals = swapOrder
    ? Number(p.pool_info?.mint0Decimals ?? 9)
    : Number(p.pool_info?.mint1Decimals ?? 9);

  let priceUsd = rawBasePrice;
  if (priceUsd === 0 && tvl > 0) {
    const lpPrice = Number(p.lp_price || 0);
    if (lpPrice > 0) {
      priceUsd = lpPrice * 0.5;
    } else {
      priceUsd = tvl / 1000;
    }
  }

  // Volume — use the max of the two sides (they represent the same trades)
  const vol1Usd = Number(p.token1_volume_usd_24h || 0);
  const vol2Usd = Number(p.token2_volume_usd_24h || 0);
  let volumeUsd = Math.max(vol1Usd, vol2Usd);

  if (volumeUsd === 0) {
    const tradeVol1 = Number(p.token1_total_trade_amount || 0) * (token1Price || priceUsd);
    const tradeVol2 = Number(p.token2_total_trade_amount || 0) * (token2Price || priceUsd);
    volumeUsd = Math.max(tradeVol1, tradeVol2);
  }

  // Transaction count — use the real txns_24h field directly
  const txns24h = Number(p.txns_24h || 0);

  const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
  const estimatedMcap = tvl > 0 ? tvl * 2 : 0;
  const apr24h = Number(p.apr_24h || 0);

  return {
    address: p.pool_address || '',
    baseToken: {
      address: baseAddress,
      symbol: baseSymbol,
      name: baseName,
      imageUrl: resolveLogoUrl(baseLogo),
      decimals: baseDecimals,
    },
    quoteToken: {
      address: quoteAddress,
      symbol: quoteSymbol,
      name: quoteName,
      imageUrl: resolveLogoUrl(quoteLogo),
      decimals: quoteDecimals,
    },
    chain,
    dex: 'xdex',
    pairLabel: `${baseSymbol}/${quoteSymbol}`,
    price: rawBasePrice,
    priceUsd,
    age: '',
    createdAt,
    txns24h,
    volume24h: volumeUsd,
    makers: Number(p.lp_token_holder_count || 0),
    priceChange5m: Number(p.price_change_5m ?? 0),
    priceChange1h: Number(p.price_change_1h ?? 0),
    priceChange6h: Number(p.price_change_6h ?? 0),
    priceChange24h: Number(p.price_change_24h ?? 0) || (apr24h > 0 ? apr24h / 365 : 0),
    liquidity: tvl,
    marketCap: estimatedMcap,
    fdv: estimatedMcap,
    isVerified: false,
    lpHolderCount: Number(p.lp_token_holder_count || 0),
    fee24h: Number(p.token1_fee_24h || 0) + Number(p.token2_fee_24h || 0),
    apr24h,
    lpPrice: Number(p.lp_price || 0),
    lpMint: p.pool_info?.lpMint || '',
  };
}

function isNativeOrStable(symbol: string | undefined): boolean {
  if (!symbol) return false;
  const natives = ['WXNT', 'XNT', 'SOL', 'WSOL', 'USDC', 'USDT', 'USDC.X'];
  return natives.includes(symbol.toUpperCase());
}

// ============================================================
// Fallback: generate OHLCV from a base price
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
