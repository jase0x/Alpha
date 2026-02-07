import { Chain } from './token';

// ============================================================
// Boost Tiers
// ============================================================

export type BoostTier = 'ignite' | 'surge' | 'supernova';

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
  rankBoost: number;   // how many positions up in the list
  hasBanner: boolean;  // can show custom banner image in detail
  hasGlow: boolean;    // glowing row effect in table
  hasTrending: boolean; // appears in trending bar
}

export const BOOST_TIERS: Record<BoostTier, BoostTierConfig> = {
  ignite: {
    id: 'ignite',
    name: 'Ignite',
    description: 'Spark visibility for your token',
    durationDays: 3,
    priceXNT: 25,
    priceSOL: 2,
    features: [
      'Boost icon next to token',
      'Rank +10 positions',
      '3-day duration',
    ],
    color: '#f97316',
    iconColor: 'text-orange-500',
    rankBoost: 10,
    hasBanner: false,
    hasGlow: false,
    hasTrending: false,
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    description: 'Amplify momentum & trending visibility',
    durationDays: 7,
    priceXNT: 100,
    priceSOL: 8,
    features: [
      'Surge icon next to token',
      'Rank +25 positions',
      'Appears in trending bar',
      'Highlighted row glow',
      '7-day duration',
    ],
    color: '#a855f7',
    iconColor: 'text-purple-500',
    rankBoost: 25,
    hasBanner: false,
    hasGlow: true,
    hasTrending: true,
  },
  supernova: {
    id: 'supernova',
    name: 'Supernova',
    description: 'Maximum visibility & custom banner',
    durationDays: 14,
    priceXNT: 250,
    priceSOL: 20,
    features: [
      'Supernova icon next to token',
      'Rank +50 positions (top priority)',
      'Appears in trending bar (priority)',
      'Custom banner image in token detail',
      'Highlighted row glow',
      '14-day duration',
    ],
    color: '#06b6d4',
    iconColor: 'text-cyan-400',
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
