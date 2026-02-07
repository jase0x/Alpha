import { Chain } from './token';

// ============================================================
// Boost Tiers
// ============================================================

export type BoostTier = 'silver' | 'gold' | 'diamond';

export interface BoostTierConfig {
  id: BoostTier;
  name: string;
  description: string;
  durationDays: number;
  priceXNT: number;    // price for X1 chain
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
  silver: {
    id: 'silver',
    name: 'Silver Boost',
    description: 'Basic visibility boost',
    durationDays: 3,
    priceXNT: 500,
    priceSOL: 2,
    features: [
      'Boost icon next to token',
      'Rank +10 positions',
      '3-day duration',
    ],
    color: '#9ca3af',
    iconColor: 'text-gray-400',
    rankBoost: 10,
    hasBanner: false,
    hasGlow: false,
    hasTrending: false,
  },
  gold: {
    id: 'gold',
    name: 'Gold Boost',
    description: 'Premium visibility & trending',
    durationDays: 7,
    priceXNT: 2000,
    priceSOL: 8,
    features: [
      'Gold boost icon next to token',
      'Rank +25 positions',
      'Appears in trending bar',
      'Highlighted row glow',
      '7-day duration',
    ],
    color: '#f59e0b',
    iconColor: 'text-yellow-400',
    rankBoost: 25,
    hasBanner: false,
    hasGlow: true,
    hasTrending: true,
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Boost',
    description: 'Maximum visibility & custom banner',
    durationDays: 14,
    priceXNT: 5000,
    priceSOL: 20,
    features: [
      'Diamond boost icon next to token',
      'Rank +50 positions (top of list)',
      'Appears in trending bar (priority)',
      'Custom banner image in token detail',
      'Highlighted row glow',
      '14-day duration',
    ],
    color: '#60a5fa',
    iconColor: 'text-blue-400',
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
