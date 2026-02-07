import { TokenPair } from '@/types/token';

export interface WhaleActivity {
  id: string;
  walletShort: string; // e.g. "0x3f...a2c1"
  type: 'buy' | 'sell' | 'add_lp' | 'remove_lp';
  amountUsd: number;
  tokenAmount: number;
  timestamp: number;
  isSmartMoney: boolean;
  pnlPercent?: number; // realized PnL for sells
}

export interface WhaleStats {
  totalWhaleVolume: number;
  smartMoneyInflow: number;  // net buy - sell by smart wallets
  largestBuy: number;
  largestSell: number;
  whaleCount: number;
  recentActivity: WhaleActivity[];
}

/**
 * Generate realistic whale activity from token data.
 * In production this would come from on-chain indexing.
 */
export function getWhaleActivity(token: TokenPair): WhaleStats {
  const activities: WhaleActivity[] = [];
  const now = Date.now();

  // Derive whale activity from volume and token characteristics
  const vol = token.volume24h;
  const liq = token.liquidity;
  const makers = token.makers;

  // Number of whale-sized transactions (> 2% of liquidity or > $500)
  const whaleThreshold = Math.max(500, liq * 0.02);
  const whaleCount = Math.max(1, Math.min(12, Math.floor(makers * 0.15)));

  // Generate activity entries
  let totalWhaleVol = 0;
  let smartInflow = 0;
  let largestBuy = 0;
  let largestSell = 0;

  // Use token address as seed for consistent-per-token pseudorandom
  const seed = hashCode(token.address);

  for (let i = 0; i < whaleCount; i++) {
    const r = pseudoRandom(seed + i * 31);
    const r2 = pseudoRandom(seed + i * 47 + 7);
    const r3 = pseudoRandom(seed + i * 63 + 13);

    const isBuy = r > 0.4; // slightly buy biased
    const isLP = r < 0.1;
    const type: WhaleActivity['type'] = isLP
      ? (r2 > 0.5 ? 'add_lp' : 'remove_lp')
      : (isBuy ? 'buy' : 'sell');

    // Amount scales with volume but has whale-sized minimum
    const baseAmount = whaleThreshold + r2 * vol * 0.15;
    const amountUsd = Math.max(500, baseAmount);
    const tokenAmount = amountUsd / (token.priceUsd || 0.001);

    const isSmartMoney = r3 > 0.65;
    const elapsed = Math.floor(r * 86400000); // within last 24h
    const timestamp = now - elapsed;

    const addrSeed = seed + i * 97;
    const walletShort = `0x${hexChars(addrSeed, 4)}...${hexChars(addrSeed + 1, 4)}`;

    let pnlPercent: number | undefined;
    if (type === 'sell') {
      pnlPercent = (r2 - 0.3) * 200; // -60% to +140%
    }

    activities.push({
      id: `whale-${i}`,
      walletShort,
      type,
      amountUsd,
      tokenAmount,
      timestamp,
      isSmartMoney,
      pnlPercent,
    });

    totalWhaleVol += amountUsd;
    if (isSmartMoney) {
      smartInflow += type === 'buy' || type === 'add_lp' ? amountUsd : -amountUsd;
    }
    if (type === 'buy' && amountUsd > largestBuy) largestBuy = amountUsd;
    if (type === 'sell' && amountUsd > largestSell) largestSell = amountUsd;
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);

  return {
    totalWhaleVolume: totalWhaleVol,
    smartMoneyInflow: smartInflow,
    largestBuy,
    largestSell,
    whaleCount,
    recentActivity: activities,
  };
}

// Simple hash for deterministic pseudo-random from address string
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hexChars(seed: number, len: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(pseudoRandom(seed + i * 11) * 16);
    result += chars[idx];
  }
  return result;
}
