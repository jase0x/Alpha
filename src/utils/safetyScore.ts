import { TokenPair } from '@/types/token';

export interface SafetyScore {
  score: number;        // 0-100
  label: string;        // 'High Risk' | 'Caution' | 'Moderate' | 'Good' | 'Strong'
  color: string;        // tailwind text color
  bgColor: string;      // tailwind bg color
  risks: string[];      // list of detected risk factors
}

/**
 * Compute a 0-100 safety score from on-chain data.
 * Higher = safer. Deductions for each risk factor.
 */
export function computeSafetyScore(token: TokenPair): SafetyScore {
  let score = 100;
  const risks: string[] = [];

  // Liquidity checks
  if (token.liquidity < 500) {
    score -= 35;
    risks.push('Extremely low liquidity (<$500)');
  } else if (token.liquidity < 1000) {
    score -= 25;
    risks.push('Very low liquidity (<$1K)');
  } else if (token.liquidity < 5000) {
    score -= 15;
    risks.push('Low liquidity (<$5K)');
  } else if (token.liquidity < 10000) {
    score -= 8;
    risks.push('Shallow liquidity (<$10K)');
  }

  // Age checks
  const ageMs = Date.now() - token.createdAt;
  const ageHours = ageMs / 3600000;
  if (ageHours < 1) {
    score -= 20;
    risks.push('Deployed less than 1 hour ago');
  } else if (ageHours < 24) {
    score -= 12;
    risks.push('Deployed less than 24 hours ago');
  } else if (ageHours < 72) {
    score -= 5;
    risks.push('Deployed less than 3 days ago');
  }

  // Volume / liquidity ratio (potential wash trading)
  if (token.liquidity > 0 && token.volume24h > token.liquidity * 10) {
    score -= 15;
    risks.push('Suspiciously high volume-to-liquidity ratio');
  }

  // Volatility
  if (Math.abs(token.priceChange24h) > 50) {
    score -= 15;
    risks.push('Extreme volatility (>50% 24h change)');
  } else if (Math.abs(token.priceChange24h) > 20) {
    score -= 8;
    risks.push('High volatility (>20% 24h change)');
  }

  // Maker count (low participation)
  if (token.makers < 3) {
    score -= 15;
    risks.push('Very few unique traders (<3)');
  } else if (token.makers < 10) {
    score -= 8;
    risks.push('Low trader count (<10)');
  }

  // Transaction count
  if (token.txns24h < 5) {
    score -= 10;
    risks.push('Very low transaction count (<5 in 24h)');
  }

  // Non-standard decimals
  const decimals = token.baseToken.decimals ?? 9;
  if (decimals !== 9 && decimals !== 6 && decimals !== 18 && decimals !== 8) {
    score -= 5;
    risks.push(`Non-standard token decimals (${decimals})`);
  }

  // Tiny price (precision risk)
  if (token.priceUsd > 0 && token.priceUsd < 0.00001) {
    score -= 5;
    risks.push('Extremely small price (rounding risk)');
  }

  // Verification
  if (!token.isVerified) {
    score -= 5;
    risks.push('Unverified token');
  }

  // LP holders
  if (token.lpHolderCount !== undefined && token.lpHolderCount < 3) {
    score -= 10;
    risks.push('Very few LP holders (<3)');
  }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;
  let bgColor: string;

  if (score >= 80) {
    label = 'Strong';
    color = 'text-xdex-green';
    bgColor = 'bg-xdex-green/15';
  } else if (score >= 60) {
    label = 'Good';
    color = 'text-emerald-400';
    bgColor = 'bg-emerald-400/15';
  } else if (score >= 40) {
    label = 'Moderate';
    color = 'text-yellow-400';
    bgColor = 'bg-yellow-400/15';
  } else if (score >= 20) {
    label = 'Caution';
    color = 'text-orange-400';
    bgColor = 'bg-orange-400/15';
  } else {
    label = 'High Risk';
    color = 'text-xdex-red';
    bgColor = 'bg-xdex-red/15';
  }

  return { score, label, color, bgColor, risks };
}
