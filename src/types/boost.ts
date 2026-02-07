import { Chain } from './token';

// ============================================================
// Boost Tiers
// ============================================================

export type BoostTier = 'boost' | 'giga' | 'degen';

export interface BoostTierConfig {
  id: BoostTier;
  name: string;
  description: string;
  durationDays: number;
  priceXNT: number;    // price for X1 chain (temporary discount)
  priceSOL: number;    // price for Solana chain
  features: string[];
  color: string;
  iconColor: string;
  boltCount: number;   // number of lightning bolt icons (1, 2, or 3)
  rankBoost: number;   // how many positions up in the list
  hasBanner: boolean;  // can show custom banner image in detail
  hasGlow: boolean;    // glowing row effect in table
  hasTrending: boolean; // appears in trending bar
}

export const BOOST_TIERS: Record<BoostTier, BoostTierConfig> = {
  boost: {
    id: 'boost',
    name: 'Boost',
    description: 'Get your token noticed',
    durationDays: 3,
    priceXNT: 25,
    priceSOL: 2,
    features: [
      '⚡ Lightning bolt badge',
      'Rank +10 positions',
      '3-day duration',
    ],
    color: '#f97316',
    iconColor: 'text-orange-500',
    boltCount: 1,
    rankBoost: 10,
    hasBanner: false,
    hasGlow: false,
    hasTrending: false,
  },
  giga: {
    id: 'giga',
    name: 'Giga Boost',
    description: 'Amplify momentum & trending visibility',
    durationDays: 7,
    priceXNT: 100,
    priceSOL: 8,
    features: [
      '⚡⚡ Double bolt badge',
      'Rank +25 positions',
      'Appears in trending bar',
      'Highlighted row glow',
      '7-day duration',
    ],
    color: '#a855f7',
    iconColor: 'text-purple-500',
    boltCount: 2,
    rankBoost: 25,
    hasBanner: false,
    hasGlow: true,
    hasTrending: true,
  },
  degen: {
    id: 'degen',
    name: 'Degen Boost',
    description: 'Maximum degen visibility & custom banner',
    durationDays: 14,
    priceXNT: 250,
    priceSOL: 20,
    features: [
      '⚡⚡⚡ Triple bolt badge',
      'Rank +50 positions (top priority)',
      'Appears in trending bar (priority)',
      'Custom banner image in token detail',
      'Highlighted row glow',
      '14-day duration',
    ],
    color: '#06b6d4',
    iconColor: 'text-cyan-400',
    boltCount: 3,
    rankBoost: 50,
    hasBanner: true,
    hasGlow: true,
    hasTrending: true,
  },
};

// ============================================================
// Boost Order / Purchase
// ============================================================

export type BoostStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface BoostOrder {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: Chain;
  tier: BoostTier;
  status: BoostStatus;
  // Payment
  paymentCurrency: 'XNT' | 'SOL';
  paymentAmount: number;
  paymentTxHash?: string;
  // Timing
  createdAt: number;
  activatedAt?: number;
  expiresAt?: number;
  // Custom content
  bannerImageUrl?: string;
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  // Advertiser
  walletAddress: string;
}

// ============================================================
// Active Boost (derived from order, used in UI)
// ============================================================

export interface ActiveBoost {
  tokenAddress: string;
  tier: BoostTier;
  tierConfig: BoostTierConfig;
  expiresAt: number;
  bannerImageUrl?: string;
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

// ============================================================
// Boost form input
// ============================================================

export interface BoostFormData {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: Chain;
  tier: BoostTier;
  bannerImage?: File;
  description: string;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
}
