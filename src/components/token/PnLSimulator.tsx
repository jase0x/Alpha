'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { formatPrice, formatUsd, formatPercent } from '@/utils/format';

interface Props {
  token: TokenPair;
}

export default function PnLSimulator({ token }: Props) {
  const [investAmount, setInvestAmount] = useState('100');
  const [entryPrice, setEntryPrice] = useState('');
  const [expanded, setExpanded] = useState(false);

  const entry = parseFloat(entryPrice) || token.priceUsd;
  const invest = parseFloat(investAmount) || 0;

  const result = useMemo(() => {
    if (entry <= 0 || invest <= 0) return null;

    const tokensAcquired = invest / entry;
    const currentValue = tokensAcquired * token.priceUsd;
    const pnlUsd = currentValue - invest;
    const pnlPercent = ((currentValue - invest) / invest) * 100;
    const multiplier = currentValue / invest;

    // Scenarios
    const scenarios = [
      { label: '2x', price: entry * 2, value: invest * 2, pnl: invest },
      { label: '5x', price: entry * 5, value: invest * 5, pnl: invest * 4 },
      { label: '10x', price: entry * 10, value: invest * 10, pnl: invest * 9 },
      { label: '50x', price: entry * 50, value: invest * 50, pnl: invest * 49 },
      { label: '100x', price: entry * 100, value: invest * 100, pnl: invest * 99 },
    ];

    // Time-based projections using 24h change as momentum
    const dailyRate = token.priceChange24h / 100;
    const projections = [
      { label: '1 Week', days: 7 },
      { label: '1 Month', days: 30 },
      { label: '3 Months', days: 90 },
    ].map((p) => {
      const projectedPrice = token.priceUsd * Math.pow(1 + dailyRate, p.days);
      const projValue = tokensAcquired * projectedPrice;
      return { ...p, price: projectedPrice, value: projValue, pnl: projValue - invest };
    });

    return {
      tokensAcquired,
      currentValue,
      pnlUsd,
      pnlPercent,
      multiplier,
      scenarios,
      projections,
    };
  }, [entry, invest, token.priceUsd, token.priceChange24h]);

  if (!result) return null;

  const isProfit = result.pnlUsd >= 0;

  return (
    <div className="px-5 py-3 border-b border-xdex-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full mb-2"
      >
        <Calculator size={12} className="text-xdex-accent" />
        <span className="text-[10px] text-xdex-text-muted font-semibold uppercase">PnL Simulator</span>
        <span className="text-[9px] text-xdex-text-muted ml-auto">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Quick inputs — always visible */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
          <DollarSign size={10} className="text-xdex-text-muted" />
          <input
            type="number"
            placeholder="Invest $"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white font-mono outline-none min-w-0"
          />
        </div>
        <span className="text-[10px] text-xdex-text-muted">@</span>
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded border border-xdex-border/60 bg-black focus-within:border-xdex-accent/30">
          <span className="text-[10px] text-xdex-text-muted">$</span>
          <input
            type="number"
            placeholder={formatPrice(token.priceUsd)}
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white font-mono outline-none min-w-0"
          />
        </div>
      </div>

      {/* Quick result */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-xdex-card/20 border border-xdex-border/30">
        <div>
          <div className="text-[9px] text-xdex-text-muted uppercase">Current Value</div>
          <div className="text-sm font-bold text-white font-mono">{formatUsd(result.currentValue)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-xdex-text-muted uppercase">PnL</div>
          <div className={`text-sm font-bold font-mono ${isProfit ? 'text-xdex-green' : 'text-xdex-red'}`}>
            {isProfit ? '+' : ''}{formatUsd(result.pnlUsd)}
            <span className="text-[10px] ml-1">({isProfit ? '+' : ''}{result.pnlPercent.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-xdex-text-muted uppercase">Multiple</div>
          <div className={`text-sm font-bold font-mono ${result.multiplier >= 1 ? 'text-xdex-green' : 'text-xdex-red'}`}>
            {result.multiplier.toFixed(2)}x
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Token count */}
          <div className="text-[10px] text-xdex-text-muted text-center">
            {formatUsd(invest)} buys <span className="text-white font-mono">{result.tokensAcquired.toFixed(2)}</span> {token.baseToken.symbol} at {formatPrice(entry)}
          </div>

          {/* Multiplier scenarios */}
          <div>
            <div className="text-[9px] text-xdex-text-muted uppercase font-semibold mb-1.5">If {token.baseToken.symbol} goes to...</div>
            <div className="space-y-1">
              {result.scenarios.map((s) => (
                <div key={s.label} className="flex items-center gap-2 py-1 text-[10px]">
                  <span className="w-8 text-xdex-accent font-bold">{s.label}</span>
                  <span className="text-xdex-text-muted font-mono">{formatPrice(s.price)}</span>
                  <ArrowRight size={8} className="text-xdex-text-muted" />
                  <span className="text-white font-mono">{formatUsd(s.value)}</span>
                  <span className="text-xdex-green font-mono ml-auto">+{formatUsd(s.pnl)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Momentum projections */}
          {token.priceChange24h !== 0 && (
            <div>
              <div className="text-[9px] text-xdex-text-muted uppercase font-semibold mb-1.5">
                If current momentum continues ({token.priceChange24h > 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%/day)
              </div>
              <div className="space-y-1">
                {result.projections.map((p) => {
                  const projProfit = p.pnl >= 0;
                  return (
                    <div key={p.label} className="flex items-center gap-2 py-1 text-[10px]">
                      <span className="w-16 text-xdex-text-secondary">{p.label}</span>
                      <span className="text-xdex-text-muted font-mono">{formatPrice(p.price)}</span>
                      <ArrowRight size={8} className="text-xdex-text-muted" />
                      <span className="text-white font-mono">{formatUsd(Math.min(p.value, 999999999))}</span>
                      <span className={`font-mono ml-auto ${projProfit ? 'text-xdex-green' : 'text-xdex-red'}`}>
                        {projProfit ? '+' : ''}{formatUsd(Math.min(Math.abs(p.pnl), 999999999))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[8px] text-xdex-text-muted/50 mt-1 italic">
                * Projections assume constant daily rate — actual results will vary significantly
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
