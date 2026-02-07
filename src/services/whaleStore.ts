import { TokenPair } from '@/types/token';
import { fetchRecentPoolTxns, PoolTransaction } from '@/services/rpc';

export interface WhaleActivity {
  id: string;
  walletShort: string;
  type: 'buy' | 'sell' | 'add_lp' | 'remove_lp';
  amountUsd: number;
  tokenAmount: number;
  timestamp: number;
  isSmartMoney: boolean;
  pnlPercent?: number;
  signature: string;
}

export interface WhaleStats {
  totalWhaleVolume: number;
  smartMoneyInflow: number;
  largestBuy: number;
  largestSell: number;
  whaleCount: number;
  recentActivity: WhaleActivity[];
}

const EMPTY_STATS: WhaleStats = {
  totalWhaleVolume: 0,
  smartMoneyInflow: 0,
  largestBuy: 0,
  largestSell: 0,
  whaleCount: 0,
  recentActivity: [],
};

/**
 * Fetch real whale activity from on-chain transaction data.
 * Filters for large transactions relative to pool liquidity.
 */
export async function getWhaleActivity(token: TokenPair): Promise<WhaleStats> {
  try {
    const txSummary = await fetchRecentPoolTxns(token.address, token.chain, 50);
    if (!txSummary || txSummary.transactions.length === 0) return EMPTY_STATS;

    // Whale threshold: transactions > 2% of liquidity or > $500
    const whaleThreshold = Math.max(500, token.liquidity * 0.02);

    const whaleTxns = txSummary.transactions.filter(
      (tx) => tx.totalUsd >= whaleThreshold,
    );

    if (whaleTxns.length === 0) {
      // If no whale-sized txns, show all as general activity
      return buildStats(txSummary.transactions, token);
    }

    return buildStats(whaleTxns, token);
  } catch {
    return EMPTY_STATS;
  }
}

function buildStats(txns: PoolTransaction[], token: TokenPair): WhaleStats {
  const activities: WhaleActivity[] = [];
  let totalWhaleVol = 0;
  let smartInflow = 0;
  let largestBuy = 0;
  let largestSell = 0;

  // Track unique makers for whale count
  const uniqueMakers = new Set<string>();

  for (let i = 0; i < txns.length; i++) {
    const tx = txns[i];
    uniqueMakers.add(tx.maker);

    const type = mapTxType(tx.type);
    const amountUsd = tx.totalUsd > 0
      ? tx.totalUsd
      : tx.tokenAmount * token.priceUsd;

    // Simple smart money heuristic: larger transactions are more likely smart money
    const isSmartMoney = amountUsd > token.liquidity * 0.05;

    activities.push({
      id: `whale-${tx.signature.slice(0, 8)}-${i}`,
      walletShort: tx.maker,
      type,
      amountUsd,
      tokenAmount: tx.tokenAmount,
      timestamp: tx.timestamp,
      isSmartMoney,
      signature: tx.signature,
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
    whaleCount: uniqueMakers.size,
    recentActivity: activities,
  };
}

function mapTxType(type: PoolTransaction['type']): WhaleActivity['type'] {
  switch (type) {
    case 'Buy': return 'buy';
    case 'Sell': return 'sell';
    case 'Add LP': return 'add_lp';
    case 'Remove LP': return 'remove_lp';
    default: return 'buy';
  }
}
