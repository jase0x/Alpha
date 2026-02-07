import { Chain } from '@/types/token';

const X1_RPC = 'https://rpc.mainnet.x1.xyz';

// ============================================================
// Types
// ============================================================

export interface TokenHolder {
  address: string;
  balance: number;
  percent: number;
  rank: number;
}

export interface PoolTransaction {
  signature: string;
  timestamp: number;
  type: 'Buy' | 'Sell' | 'Add LP' | 'Remove LP' | 'Unknown';
  totalUsd: number;
  tokenAmount: number;
  quoteAmount: number;
  maker: string;
}

export interface PoolTxSummary {
  transactions: PoolTransaction[];
  buys: number;
  sells: number;
  buyVolume: number;
  sellVolume: number;
}

// ============================================================
// RPC helpers
// ============================================================

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(X1_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.result ?? null;
}

// ============================================================
// Token Holders — getTokenLargestAccounts
// ============================================================

export async function fetchTokenHolders(
  mintAddress: string,
  _chain: Chain = 'x1',
): Promise<TokenHolder[]> {
  try {
    const result = await rpcCall('getTokenLargestAccounts', [mintAddress]);
    if (!result?.value || !Array.isArray(result.value)) return [];

    // Sum all known balances first for percent calculation
    const entries = result.value.map((acc: any) => ({
      address: acc.address as string,
      rawAmount: Number(acc.amount || '0'),
      decimals: acc.decimals ?? 9,
    }));

    const totalKnown = entries.reduce(
      (sum: number, e: { rawAmount: number; decimals: number }) =>
        sum + e.rawAmount / Math.pow(10, e.decimals),
      0,
    );

    return entries
      .map((e: { address: string; rawAmount: number; decimals: number }, i: number) => {
        const balance = e.rawAmount / Math.pow(10, e.decimals);
        return {
          address: e.address,
          balance,
          percent: totalKnown > 0 ? (balance / totalKnown) * 100 : 0,
          rank: i + 1,
        };
      })
      .filter((h: TokenHolder) => h.balance > 0)
      .slice(0, 25);
  } catch {
    return [];
  }
}

// ============================================================
// LP Holders — same endpoint, different mint
// ============================================================

export async function fetchLPHolders(
  lpMint: string,
  _chain: Chain = 'x1',
): Promise<TokenHolder[]> {
  return fetchTokenHolders(lpMint, _chain);
}

// ============================================================
// Recent Pool Transactions — getSignaturesForAddress + getTransaction
// ============================================================

export async function fetchRecentPoolTxns(
  poolAddress: string,
  chain: Chain = 'x1',
  limit: number = 30,
): Promise<PoolTxSummary> {
  const empty: PoolTxSummary = {
    transactions: [],
    buys: 0,
    sells: 0,
    buyVolume: 0,
    sellVolume: 0,
  };

  if (chain !== 'x1') return empty;

  try {
    // Step 1: Get recent transaction signatures
    const sigs = await rpcCall('getSignaturesForAddress', [
      poolAddress,
      { limit },
    ]);
    if (!sigs || !Array.isArray(sigs) || sigs.length === 0) return empty;

    // Step 2: Fetch transaction details (batch for performance, max 10 at a time)
    const sigList = sigs.slice(0, limit).map((s: any) => s.signature);
    const txns: PoolTransaction[] = [];
    let buys = 0;
    let sells = 0;
    let buyVolume = 0;
    let sellVolume = 0;

    // Process in batches of 5 to avoid overwhelming the RPC
    const batchSize = 5;
    for (let i = 0; i < sigList.length; i += batchSize) {
      const batch = sigList.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((sig: string) =>
          rpcCall('getTransaction', [
            sig,
            { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
          ]),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status !== 'fulfilled' || !r.value) continue;

        const tx = r.value;
        const parsed = parsePoolTransaction(tx, poolAddress);
        if (parsed) {
          txns.push(parsed);
          if (parsed.type === 'Buy') {
            buys++;
            buyVolume += parsed.totalUsd;
          } else if (parsed.type === 'Sell') {
            sells++;
            sellVolume += parsed.totalUsd;
          }
        }
      }
    }

    // Sort by timestamp descending
    txns.sort((a, b) => b.timestamp - a.timestamp);

    return { transactions: txns, buys, sells, buyVolume, sellVolume };
  } catch {
    return empty;
  }
}

// ============================================================
// Parse a single transaction to determine type and amounts
// ============================================================

function parsePoolTransaction(
  tx: any,
  poolAddress: string,
): PoolTransaction | null {
  try {
    const meta = tx.meta;
    const blockTime = tx.blockTime;
    if (!meta || !blockTime) return null;

    const sig =
      tx.transaction?.signatures?.[0] || '';
    const timestamp = blockTime * 1000;

    // Determine the first signer (maker)
    const accounts = tx.transaction?.message?.accountKeys || [];
    const maker =
      accounts.find((a: any) =>
        typeof a === 'object' ? a.signer : false,
      )?.pubkey ||
      (typeof accounts[0] === 'string' ? accounts[0] : accounts[0]?.pubkey) ||
      '';

    // Look at pre/post token balances to determine swap direction
    const preBalances = meta.preTokenBalances || [];
    const postBalances = meta.postTokenBalances || [];

    // Build a map of token balance changes per mint for pool-related accounts
    const changes = new Map<string, number>();
    for (const post of postBalances) {
      const mint = post.mint;
      const postAmt = Number(post.uiTokenAmount?.uiAmount ?? 0);
      const pre = preBalances.find(
        (p: any) => p.accountIndex === post.accountIndex && p.mint === mint,
      );
      const preAmt = pre ? Number(pre.uiTokenAmount?.uiAmount ?? 0) : 0;
      const diff = postAmt - preAmt;
      if (diff !== 0) {
        changes.set(mint, (changes.get(mint) || 0) + diff);
      }
    }

    // Determine type: if pool gained base token and lost quote, it's a Buy
    // We simplify by looking at SOL/native balance changes
    const preSol = meta.preBalances?.[0] ?? 0;
    const postSol = meta.postBalances?.[0] ?? 0;
    const solChange = (postSol - preSol) / 1e9;

    // Check for LP mint changes (add/remove LP)
    const logMessages: string[] = meta.logMessages || [];
    const logsJoined = logMessages.join(' ').toLowerCase();

    let type: PoolTransaction['type'] = 'Unknown';
    let totalUsd = 0;
    let tokenAmount = 0;
    let quoteAmount = 0;

    if (logsJoined.includes('addliquidity') || logsJoined.includes('deposit')) {
      type = 'Add LP';
    } else if (
      logsJoined.includes('removeliquidity') ||
      logsJoined.includes('withdraw')
    ) {
      type = 'Remove LP';
    } else if (logsJoined.includes('swap')) {
      // Determine direction from SOL balance change of first signer
      // If signer lost SOL -> buying token (Buy)
      // If signer gained SOL -> selling token (Sell)
      if (solChange < -0.001) {
        type = 'Buy';
        quoteAmount = Math.abs(solChange);
      } else if (solChange > 0.001) {
        type = 'Sell';
        quoteAmount = Math.abs(solChange);
      } else {
        // Token-to-token swap, pick the larger absolute change
        const entries = [...changes.entries()];
        if (entries.length >= 2) {
          type = 'Buy'; // default
        }
      }
    }

    // Estimate USD value from token changes
    for (const [, diff] of changes) {
      const absDiff = Math.abs(diff);
      if (absDiff > tokenAmount) {
        tokenAmount = absDiff;
      }
    }

    // We don't have token prices here, so approximate from quoteAmount * rough XNT price
    // The caller can enrich this with current prices
    totalUsd = quoteAmount > 0 ? quoteAmount : tokenAmount;

    if (type === 'Unknown') return null;

    return {
      signature: sig,
      timestamp,
      type,
      totalUsd,
      tokenAmount,
      quoteAmount,
      maker: maker ? `${maker.slice(0, 4)}...${maker.slice(-4)}` : 'Unknown',
    };
  } catch {
    return null;
  }
}
