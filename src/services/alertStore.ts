const STORAGE_KEY = 'alpha-price-alerts';

export interface PriceAlert {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

function load(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(alerts: PriceAlert[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function getAlerts(): PriceAlert[] {
  return load();
}

export function getAlertsForToken(tokenAddress: string): PriceAlert[] {
  return load().filter((a) => a.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
}

export function createAlert(params: {
  tokenAddress: string;
  tokenSymbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
}): PriceAlert {
  const alert: PriceAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...params,
    createdAt: Date.now(),
    triggered: false,
  };
  const alerts = load();
  alerts.push(alert);
  save(alerts);
  return alert;
}

export function deleteAlert(id: string): void {
  const alerts = load().filter((a) => a.id !== id);
  save(alerts);
}

export function clearTriggered(): void {
  const alerts = load().map((a) => (a.triggered ? { ...a, triggered: false } : a));
  save(alerts);
}

/**
 * Check all active alerts against current prices.
 * Returns newly triggered alerts. Sends browser notification if permitted.
 */
export function checkAlerts(
  prices: Map<string, number>,
): PriceAlert[] {
  const alerts = load();
  const triggered: PriceAlert[] = [];

  for (const alert of alerts) {
    if (alert.triggered) continue;
    const price = prices.get(alert.tokenAddress.toLowerCase());
    if (price === undefined) continue;

    const shouldTrigger =
      (alert.condition === 'above' && price >= alert.targetPrice) ||
      (alert.condition === 'below' && price <= alert.targetPrice);

    if (shouldTrigger) {
      alert.triggered = true;
      alert.triggeredAt = Date.now();
      triggered.push(alert);
    }
  }

  if (triggered.length > 0) {
    save(alerts);

    // Browser notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      for (const a of triggered) {
        new Notification(`Price Alert: ${a.tokenSymbol}`, {
          body: `${a.tokenSymbol} is now ${a.condition} $${a.targetPrice.toFixed(6)}`,
          icon: '/favicon.ico',
        });
      }
    }
  }

  return triggered;
}

/** Request browser notification permission */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
