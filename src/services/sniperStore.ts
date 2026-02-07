import { TokenPair } from '@/types/token';

export interface SniperRule {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  // Criteria
  minLiquidity: number | null;
  maxLiquidity: number | null;
  minMakers: number | null;
  quoteToken: string | null; // e.g. 'WX1' or 'SOL'
  chain: 'x1' | 'solana' | 'any';
  notifyBrowser: boolean;
  notifySound: boolean;
}

export interface SniperMatch {
  rule: SniperRule;
  token: TokenPair;
  matchedAt: number;
  dismissed: boolean;
}

const RULES_KEY = 'alpha-sniper-rules';
const MATCHES_KEY = 'alpha-sniper-matches';
const SEEN_KEY = 'alpha-sniper-seen'; // set of token addresses already notified

export function getRules(): SniperRule[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRules(rules: SniperRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function createRule(params: Omit<SniperRule, 'id' | 'createdAt'>): SniperRule {
  const rules = getRules();
  const rule: SniperRule = {
    ...params,
    id: `sniper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  rules.push(rule);
  saveRules(rules);
  return rule;
}

export function deleteRule(id: string): void {
  const rules = getRules().filter((r) => r.id !== id);
  saveRules(rules);
}

export function toggleRule(id: string): void {
  const rules = getRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) rule.enabled = !rule.enabled;
  saveRules(rules);
}

export function getMatches(): SniperMatch[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMatches(matches: SniperMatch[]): void {
  // Keep only last 50 matches
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches.slice(-50)));
}

function getSeenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function addSeen(addr: string): void {
  const seen = getSeenSet();
  seen.add(addr);
  // Keep set manageable
  const arr = [...seen];
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
}

/**
 * Check all tokens against enabled sniper rules.
 * Returns newly matched tokens (not previously seen).
 */
export function checkSniperRules(tokens: TokenPair[]): SniperMatch[] {
  const rules = getRules().filter((r) => r.enabled);
  if (rules.length === 0) return [];

  const seen = getSeenSet();
  const matches = getMatches();
  const newMatches: SniperMatch[] = [];

  // Only check tokens created in the last 6 hours (new pairs)
  const sixHoursAgo = Date.now() - 6 * 3600000;
  const newTokens = tokens.filter((t) => t.createdAt > sixHoursAgo);

  for (const token of newTokens) {
    if (seen.has(token.address)) continue;

    for (const rule of rules) {
      if (matchesRule(token, rule)) {
        const match: SniperMatch = {
          rule,
          token,
          matchedAt: Date.now(),
          dismissed: false,
        };
        newMatches.push(match);
        matches.push(match);
        addSeen(token.address);

        // Browser notification
        if (rule.notifyBrowser && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`New pair: ${token.baseToken.symbol}`, {
            body: `Matched "${rule.name}" — Liq: $${token.liquidity.toFixed(0)}, ${token.makers} makers`,
            icon: '/favicon.ico',
          });
        }

        // Sound notification
        if (rule.notifySound) {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch { /* ignore audio errors */ }
        }

        break; // One match per token
      }
    }
  }

  if (newMatches.length > 0) {
    saveMatches(matches);
  }

  return newMatches;
}

function matchesRule(token: TokenPair, rule: SniperRule): boolean {
  if (rule.chain !== 'any' && token.chain !== rule.chain) return false;
  if (rule.minLiquidity !== null && token.liquidity < rule.minLiquidity) return false;
  if (rule.maxLiquidity !== null && token.liquidity > rule.maxLiquidity) return false;
  if (rule.minMakers !== null && token.makers < rule.minMakers) return false;
  if (rule.quoteToken && !token.quoteToken.symbol.toLowerCase().includes(rule.quoteToken.toLowerCase())) return false;
  return true;
}

export function dismissMatch(matchedAt: number): void {
  const matches = getMatches();
  const match = matches.find((m) => m.matchedAt === matchedAt);
  if (match) match.dismissed = true;
  saveMatches(matches);
}

export function clearMatches(): void {
  localStorage.setItem(MATCHES_KEY, '[]');
}
