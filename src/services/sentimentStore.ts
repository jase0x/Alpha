const STORAGE_KEY = 'alpha-sentiment';

export type Sentiment = 'bullish' | 'bearish';

interface SentimentData {
  [tokenAddress: string]: {
    bullish: number;
    bearish: number;
    userVote?: Sentiment;
  };
}

function load(): SentimentData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: SentimentData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSentiment(tokenAddress: string): { bullish: number; bearish: number; userVote?: Sentiment } {
  const data = load();
  return data[tokenAddress] || { bullish: 0, bearish: 0 };
}

export function vote(tokenAddress: string, sentiment: Sentiment): { bullish: number; bearish: number; userVote: Sentiment } {
  const data = load();
  const entry = data[tokenAddress] || { bullish: 0, bearish: 0 };

  // If user already voted the same way, toggle off
  if (entry.userVote === sentiment) {
    if (sentiment === 'bullish') entry.bullish = Math.max(0, entry.bullish - 1);
    else entry.bearish = Math.max(0, entry.bearish - 1);
    entry.userVote = undefined;
  } else {
    // Remove old vote if switching
    if (entry.userVote === 'bullish') entry.bullish = Math.max(0, entry.bullish - 1);
    if (entry.userVote === 'bearish') entry.bearish = Math.max(0, entry.bearish - 1);

    // Add new vote
    if (sentiment === 'bullish') entry.bullish++;
    else entry.bearish++;
    entry.userVote = sentiment;
  }

  data[tokenAddress] = entry;
  save(data);
  return { ...entry, userVote: entry.userVote! };
}

/**
 * Seed mock community sentiment for a token based on its price action.
 * Called once per token to give a baseline before real votes accumulate.
 */
export function seedSentiment(tokenAddress: string, priceChange24h: number): void {
  const data = load();
  if (data[tokenAddress]) return; // Already has data

  // Generate plausible community sentiment based on price action
  const bias = priceChange24h > 0 ? 0.65 : priceChange24h < -5 ? 0.3 : 0.5;
  const total = 10 + Math.floor(Math.random() * 40);
  const bullish = Math.round(total * bias);
  const bearish = total - bullish;

  data[tokenAddress] = { bullish, bearish };
  save(data);
}
