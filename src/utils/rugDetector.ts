import { TokenPair } from '@/types/token';

export type RugRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface RugFlag {
  id: string;
  label: string;
  severity: 'info' | 'warning' | 'danger';
  description: string;
}

export interface RugAnalysis {
  riskLevel: RugRiskLevel;
  riskScore: number; // 0-100, higher = more risky
  flags: RugFlag[];
  color: string;
  bgColor: string;
  icon: string; // emoji shorthand
}

/**
 * Analyze a token for rug pull / honeypot risk indicators.
 * Uses heuristics from on-chain data patterns.
 */
export function analyzeRugRisk(token: TokenPair): RugAnalysis {
  const flags: RugFlag[] = [];
  let riskScore = 0;

  const ageMs = Date.now() - token.createdAt;
  const ageHours = ageMs / 3600000;
  const ageDays = ageHours / 24;

  // 1. Liquidity concentration risk
  const lpHolders = token.lpHolderCount ?? token.makers;
  if (lpHolders <= 1) {
    riskScore += 30;
    flags.push({
      id: 'single_lp',
      label: 'Single LP Provider',
      severity: 'danger',
      description: 'Only 1 LP holder — liquidity can be pulled instantly',
    });
  } else if (lpHolders <= 2) {
    riskScore += 15;
    flags.push({
      id: 'few_lp',
      label: 'Very Few LP Holders',
      severity: 'warning',
      description: `Only ${lpHolders} LP holders — high rug pull risk`,
    });
  }

  // 2. Honeypot pattern: high buy volume but almost no sells
  const buyRatio = 50 + token.priceChange24h * 2;
  const estimatedBuys = token.txns24h * (Math.min(95, Math.max(5, buyRatio)) / 100);
  const estimatedSells = token.txns24h - estimatedBuys;
  if (token.txns24h > 10 && estimatedSells < token.txns24h * 0.1) {
    riskScore += 25;
    flags.push({
      id: 'honeypot_pattern',
      label: 'Possible Honeypot',
      severity: 'danger',
      description: 'Very few sell transactions detected — may be unable to sell',
    });
  }

  // 3. Massive single-day pump with tiny liquidity (pump & dump setup)
  if (token.priceChange24h > 100 && token.liquidity < 5000) {
    riskScore += 20;
    flags.push({
      id: 'pump_dump',
      label: 'Pump & Dump Pattern',
      severity: 'danger',
      description: `${token.priceChange24h.toFixed(0)}% pump with only $${token.liquidity.toFixed(0)} liquidity`,
    });
  }

  // 4. Wash trading indicator
  if (token.liquidity > 0 && token.volume24h > token.liquidity * 20) {
    riskScore += 15;
    flags.push({
      id: 'wash_trading',
      label: 'Wash Trading Suspected',
      severity: 'warning',
      description: `Volume (${(token.volume24h / token.liquidity).toFixed(0)}x liquidity) — likely artificial`,
    });
  } else if (token.liquidity > 0 && token.volume24h > token.liquidity * 10) {
    riskScore += 8;
    flags.push({
      id: 'high_vol_ratio',
      label: 'Unusual Volume Ratio',
      severity: 'info',
      description: 'Volume significantly exceeds liquidity',
    });
  }

  // 5. Token age — very fresh tokens are riskier
  if (ageHours < 1) {
    riskScore += 15;
    flags.push({
      id: 'extremely_new',
      label: 'Deployed < 1 Hour',
      severity: 'danger',
      description: 'Brand new token — no track record, extremely high risk',
    });
  } else if (ageHours < 6) {
    riskScore += 8;
    flags.push({
      id: 'very_new',
      label: 'Deployed < 6 Hours',
      severity: 'warning',
      description: 'Very new token — limited data available',
    });
  }

  // 6. Very few unique traders
  if (token.makers <= 2) {
    riskScore += 15;
    flags.push({
      id: 'few_traders',
      label: 'Almost No Traders',
      severity: 'danger',
      description: `Only ${token.makers} unique traders — may be self-trading`,
    });
  } else if (token.makers < 5) {
    riskScore += 8;
    flags.push({
      id: 'low_traders',
      label: 'Very Few Traders',
      severity: 'warning',
      description: `Only ${token.makers} unique traders`,
    });
  }

  // 7. Unverified contract
  if (!token.isVerified) {
    riskScore += 5;
    flags.push({
      id: 'unverified',
      label: 'Unverified Contract',
      severity: 'info',
      description: 'Contract source code is not verified',
    });
  }

  // 8. Massive supply dump (price cratered)
  if (token.priceChange24h < -80) {
    riskScore += 20;
    flags.push({
      id: 'price_crash',
      label: 'Price Collapsed',
      severity: 'danger',
      description: `Price dropped ${Math.abs(token.priceChange24h).toFixed(0)}% — possible rug pull in progress`,
    });
  } else if (token.priceChange24h < -50) {
    riskScore += 10;
    flags.push({
      id: 'major_dump',
      label: 'Major Price Drop',
      severity: 'warning',
      description: `Price dropped ${Math.abs(token.priceChange24h).toFixed(0)}% in 24h`,
    });
  }

  // 9. Liquidity too low to exit
  if (token.liquidity < 100) {
    riskScore += 20;
    flags.push({
      id: 'no_exit',
      label: 'No Exit Liquidity',
      severity: 'danger',
      description: 'Liquidity is too low to sell — effectively trapped',
    });
  } else if (token.liquidity < 500) {
    riskScore += 10;
    flags.push({
      id: 'thin_exit',
      label: 'Extremely Thin Liquidity',
      severity: 'danger',
      description: 'Very difficult to exit position without massive slippage',
    });
  }

  // 10. Non-standard decimals (common in scam tokens)
  const decimals = token.baseToken.decimals ?? 9;
  if (decimals !== 6 && decimals !== 8 && decimals !== 9 && decimals !== 18) {
    riskScore += 5;
    flags.push({
      id: 'odd_decimals',
      label: 'Non-Standard Decimals',
      severity: 'info',
      description: `Uses ${decimals} decimals (uncommon — verify precision)`,
    });
  }

  // Positive signals (reduce risk)
  if (ageDays > 30 && token.liquidity > 50000 && token.makers > 50) {
    riskScore -= 10;
  }
  if (token.isVerified && token.liquidity > 10000) {
    riskScore -= 5;
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let riskLevel: RugRiskLevel;
  let color: string;
  let bgColor: string;
  let icon: string;

  if (riskScore >= 60) {
    riskLevel = 'critical';
    color = 'text-xdex-red';
    bgColor = 'bg-xdex-red/15';
    icon = 'skull';
  } else if (riskScore >= 40) {
    riskLevel = 'high';
    color = 'text-orange-400';
    bgColor = 'bg-orange-400/15';
    icon = 'warning';
  } else if (riskScore >= 20) {
    riskLevel = 'medium';
    color = 'text-yellow-400';
    bgColor = 'bg-yellow-400/15';
    icon = 'caution';
  } else if (riskScore >= 5) {
    riskLevel = 'low';
    color = 'text-emerald-400';
    bgColor = 'bg-emerald-400/15';
    icon = 'ok';
  } else {
    riskLevel = 'safe';
    color = 'text-xdex-green';
    bgColor = 'bg-xdex-green/15';
    icon = 'safe';
  }

  return { riskLevel, riskScore, flags, color, bgColor, icon };
}

/** Quick check: is this token likely a rug? (for filtering) */
export function isLikelyRug(token: TokenPair): boolean {
  const analysis = analyzeRugRisk(token);
  return analysis.riskLevel === 'critical' || analysis.riskLevel === 'high';
}
