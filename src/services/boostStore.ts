import { BoostOrder, BoostStatus, BoostTier, ActiveBoost, BOOST_TIERS } from '@/types/boost';
import { Chain } from '@/types/token';

const STORAGE_KEY = 'alpha-boost-orders';

// ============================================================
// LocalStorage helpers
// ============================================================

function loadOrders(): BoostOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: BoostOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

// ============================================================
// Public API
// ============================================================

/** Get all orders for a given wallet */
export function getOrdersByWallet(wallet: string): BoostOrder[] {
  return loadOrders().filter((o) => o.walletAddress === wallet);
}

/** Get all orders (admin / demo) */
export function getAllOrders(): BoostOrder[] {
  return loadOrders();
}

/** Create a new boost order (pending payment) */
export function createBoostOrder(params: {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: Chain;
  tier: BoostTier;
  paymentCurrency: 'XNT' | 'SOL';
  bannerImageUrl?: string;
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  walletAddress: string;
}): BoostOrder {
  const tierConfig = BOOST_TIERS[params.tier];
  const order: BoostOrder = {
    id: `boost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...params,
    status: 'pending',
    paymentAmount:
      params.paymentCurrency === 'XNT' ? tierConfig.priceXNT : tierConfig.priceSOL,
    createdAt: Date.now(),
  };

  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

/** Activate a boost order (simulate payment confirmed) */
export function activateOrder(orderId: string): BoostOrder | null {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  const tierConfig = BOOST_TIERS[order.tier];
  order.status = 'active';
  order.activatedAt = Date.now();
  order.expiresAt = Date.now() + tierConfig.durationDays * 86400000;
  order.paymentTxHash = `0x${Math.random().toString(16).slice(2, 42)}`;
  saveOrders(orders);
  return order;
}

/** Cancel a pending order */
export function cancelOrder(orderId: string): boolean {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'pending') return false;
  order.status = 'cancelled';
  saveOrders(orders);
  return true;
}

/** Expire old boosts (call on load) */
export function expireOldBoosts(): void {
  const orders = loadOrders();
  let changed = false;
  for (const order of orders) {
    if (order.status === 'active' && order.expiresAt && order.expiresAt < Date.now()) {
      order.status = 'expired';
      changed = true;
    }
  }
  if (changed) saveOrders(orders);
}

/** Get active boosts (across all wallets) — used for rendering boost indicators */
export function getActiveBoosts(): ActiveBoost[] {
  expireOldBoosts();
  const orders = loadOrders();
  return orders
    .filter((o) => o.status === 'active' && o.expiresAt && o.expiresAt > Date.now())
    .map((o) => ({
      tokenAddress: o.tokenAddress,
      tier: o.tier,
      tierConfig: BOOST_TIERS[o.tier],
      expiresAt: o.expiresAt!,
      bannerImageUrl: o.bannerImageUrl,
      description: o.description,
      websiteUrl: o.websiteUrl,
      twitterUrl: o.twitterUrl,
      telegramUrl: o.telegramUrl,
    }));
}

/** Get the highest active boost for a specific token address */
export function getBoostForToken(tokenAddress: string): ActiveBoost | null {
  const boosts = getActiveBoosts().filter(
    (b) => b.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
  );
  if (boosts.length === 0) return null;
  // Return highest tier boost
  const tierOrder: BoostTier[] = ['diamond', 'gold', 'silver'];
  for (const tier of tierOrder) {
    const match = boosts.find((b) => b.tier === tier);
    if (match) return match;
  }
  return boosts[0];
}

/** Check if a token has any active boost */
export function isTokenBoosted(tokenAddress: string): boolean {
  return getBoostForToken(tokenAddress) !== null;
}

/** Get a map of tokenAddress → ActiveBoost for quick lookups */
export function getBoostMap(): Map<string, ActiveBoost> {
  const map = new Map<string, ActiveBoost>();
  const boosts = getActiveBoosts();
  for (const b of boosts) {
    const key = b.tokenAddress.toLowerCase();
    const existing = map.get(key);
    if (!existing || tierRank(b.tier) > tierRank(existing.tier)) {
      map.set(key, b);
    }
  }
  return map;
}

function tierRank(tier: BoostTier): number {
  return tier === 'diamond' ? 3 : tier === 'gold' ? 2 : 1;
}
