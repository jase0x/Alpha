export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.00001) {
    // Show subscript notation like $0.0₄6435
    const str = price.toFixed(20);
    const match = str.match(/^0\.0*(.*)/);
    if (match) {
      const zerosAfterDot = str.indexOf(match[1].charAt(0)) - 2;
      if (zerosAfterDot > 2) {
        const significantDigits = match[1].substring(0, 4);
        return `$0.0\u{2080}${String.fromCharCode(0x2080 + zerosAfterDot)}${significantDigits}`;
      }
    }
    return `$${price.toFixed(8)}`;
  }
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${formatCompact(price)}`;
}

export function formatCompact(value: number): string {
  if (value === 0) return '0';
  const absVal = Math.abs(value);
  if (absVal >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (absVal >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (absVal >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  if (absVal >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

export function formatUsd(value: number): string {
  if (value === 0) return '$0';
  const absVal = Math.abs(value);
  if (absVal >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absVal >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absVal >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatAge(createdAt: number): string {
  const now = Date.now();
  const diff = now - createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (weeks < 5) return `${weeks}w`;
  return `${months}mo`;
}

export function getPercentColor(value: number): string {
  if (value > 0) return 'text-xdex-green';
  if (value < 0) return 'text-xdex-red';
  return 'text-xdex-text-muted';
}

export function getChainLabel(chain: string): string {
  switch (chain) {
    case 'x1': return 'X1';
    case 'solana': return 'SOL';
    default: return chain.toUpperCase();
  }
}

export function getChainColor(chain: string): string {
  switch (chain) {
    case 'x1': return 'bg-xdex-accent/15 text-xdex-accent';
    case 'solana': return 'bg-purple-500/15 text-purple-400';
    default: return 'bg-xdex-text-muted/20 text-xdex-text-muted';
  }
}
