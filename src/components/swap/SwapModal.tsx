'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ArrowDownUp, Settings, Loader2, AlertTriangle, Wallet, ExternalLink } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { formatPrice } from '@/utils/format';
import { fetchSwapQuote } from '@/services/api';

interface SwapModalProps {
  token: TokenPair;
  onClose: () => void;
}

export default function SwapModal({ token, onClose }: SwapModalProps) {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);
  const [quoteError, setQuoteError] = useState(false);

  const fromToken = isSwapped ? token.baseToken : token.quoteToken;
  const toToken = isSwapped ? token.quoteToken : token.baseToken;

  const getQuote = useCallback(async (amount: string) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setToAmount('');
      setPriceImpact(0);
      setQuoteError(false);
      return;
    }

    setLoading(true);
    setQuoteError(false);
    const quote = await fetchSwapQuote(
      token.chain,
      fromToken.address,
      toToken.address,
      Number(amount),
      fromToken.decimals ?? 9,
    );
    setLoading(false);

    if (quote && quote.amountOut > 0) {
      setToAmount(quote.amountOut.toFixed(6));
      setPriceImpact(quote.priceImpact);
    } else {
      // Fallback to local price estimation
      const rate = isSwapped
        ? (token.price || token.priceUsd)
        : (token.price > 0 ? 1 / token.price : 1 / token.priceUsd);
      const estimated = Number(amount) * rate;
      setToAmount(estimated.toFixed(6));
      setPriceImpact(0);
      setQuoteError(true);
    }
  }, [token, fromToken, toToken, isSwapped]);

  useEffect(() => {
    if (!fromAmount) return;
    const timer = setTimeout(() => getQuote(fromAmount), 400);
    return () => clearTimeout(timer);
  }, [fromAmount, getQuote]);

  const handleFromChange = (val: string) => {
    setFromAmount(val);
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      setToAmount('');
      setPriceImpact(0);
    }
  };

  const handleSwapDirection = () => {
    setIsSwapped(!isSwapped);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = () => {
    const xdexSwapUrl = `https://app.xdex.xyz/swap?inputToken=${fromToken.address}&outputToken=${toToken.address}&amount=${fromAmount}`;
    window.open(xdexSwapUrl, '_blank');
  };

  const minReceived = toAmount && Number(toAmount) > 0
    ? (Number(toAmount) * (1 - slippage / 100)).toFixed(6)
    : '0';

  const impactSeverity = priceImpact > 15 ? 'high' : priceImpact > 5 ? 'medium' : 'low';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[420px] bg-black border border-xdex-accent/30 rounded-2xl shadow-2xl shadow-xdex-accent/5">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border/60">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-white">Swap</h3>
            <span className="text-[10px] text-xdex-text-muted bg-xdex-border/30 px-2 py-0.5 rounded">
              via XDEX
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings
                  ? 'text-xdex-accent bg-xdex-accent/10'
                  : 'text-xdex-text-muted hover:text-xdex-text hover:bg-white/5'
              }`}
            >
              <Settings size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Slippage settings */}
        {showSettings && (
          <div className="px-5 py-3 border-b border-xdex-border/40">
            <div className="text-[11px] text-xdex-text-muted mb-2.5 font-medium">Slippage Tolerance</div>
            <div className="flex items-center gap-2">
              {[0.1, 0.5, 1.0, 3.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-3 py-1.5 text-[11px] rounded-lg transition-all font-medium ${
                    slippage === s
                      ? 'bg-xdex-accent/15 text-xdex-accent border border-xdex-accent/40'
                      : 'bg-black border border-xdex-border/60 text-xdex-text-secondary hover:text-xdex-text hover:border-xdex-border'
                  }`}
                >
                  {s}%
                </button>
              ))}
              <div className="flex items-center bg-black border border-xdex-border/60 rounded-lg px-2.5 focus-within:border-xdex-accent/40 transition-colors">
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-12 py-1.5 text-[11px] bg-transparent text-white text-right outline-none"
                  step={0.1}
                  min={0.01}
                  max={50}
                />
                <span className="text-[11px] text-xdex-text-muted ml-1">%</span>
              </div>
            </div>
            {slippage > 5 && (
              <div className="flex items-center gap-1.5 mt-2 text-yellow-400">
                <AlertTriangle size={11} />
                <span className="text-[10px]">High slippage may result in unfavorable trade</span>
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-1.5">
          {/* Wallet status */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xdex-text-muted">
              <Wallet size={12} />
              <span className="text-[10px]">Wallet not connected</span>
            </div>
          </div>

          {/* From token */}
          <div className="bg-black rounded-xl border border-xdex-border/60 p-4 focus-within:border-xdex-accent/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-xdex-text-muted font-medium">You pay</span>
              <span className="text-[11px] text-xdex-text-muted">Balance: --</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => handleFromChange(e.target.value)}
                className="flex-1 text-2xl font-semibold bg-transparent text-white placeholder:text-xdex-text-muted/40 font-mono outline-none min-w-0"
              />
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-xdex-card/50 border border-xdex-border/60 flex-shrink-0">
                {fromToken.imageUrl ? (
                  <img src={fromToken.imageUrl} alt={fromToken.symbol} className="w-6 h-6 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-xdex-border flex items-center justify-center">
                    <span className="text-[9px] font-bold text-xdex-accent">{fromToken.symbol.charAt(0)}</span>
                  </div>
                )}
                <span className="text-sm font-semibold text-white">{fromToken.symbol}</span>
              </div>
            </div>
          </div>

          {/* Swap direction */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwapDirection}
              className="p-2.5 rounded-xl bg-black border border-xdex-accent/30 text-xdex-accent hover:bg-xdex-accent/10 hover:border-xdex-accent/60 transition-all active:scale-95"
            >
              <ArrowDownUp size={16} />
            </button>
          </div>

          {/* To token */}
          <div className="bg-black rounded-xl border border-xdex-border/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-xdex-text-muted font-medium">You receive</span>
              <span className="text-[11px] text-xdex-text-muted">Balance: --</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-2xl font-semibold text-white font-mono truncate">
                  {loading ? '' : (toAmount || '0.00')}
                </span>
                {loading && <Loader2 size={18} className="animate-spin text-xdex-accent" />}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-xdex-card/50 border border-xdex-border/60 flex-shrink-0">
                {toToken.imageUrl ? (
                  <img src={toToken.imageUrl} alt={toToken.symbol} className="w-6 h-6 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-xdex-border flex items-center justify-center">
                    <span className="text-[9px] font-bold text-xdex-accent">{toToken.symbol.charAt(0)}</span>
                  </div>
                )}
                <span className="text-sm font-semibold text-white">{toToken.symbol}</span>
              </div>
            </div>
          </div>

          {/* Trade details */}
          {fromAmount && toAmount && Number(fromAmount) > 0 && (
            <div className="rounded-xl border border-xdex-border/40 p-3 mt-2 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-xdex-text-muted">Rate</span>
                <span className="text-white font-mono">
                  1 {fromToken.symbol} = {(Number(toAmount) / Number(fromAmount)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-xdex-text-muted">Price</span>
                <span className="text-white font-mono">{formatPrice(token.priceUsd)} USD</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-xdex-text-muted">Slippage</span>
                <span className="text-white font-mono">{slippage}%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-xdex-text-muted">Min received</span>
                <span className="text-white font-mono">
                  {minReceived} {toToken.symbol}
                </span>
              </div>
              {priceImpact > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-xdex-text-muted">Price impact</span>
                  <span className={`font-mono font-medium ${
                    impactSeverity === 'high' ? 'text-xdex-red' :
                    impactSeverity === 'medium' ? 'text-yellow-400' :
                    'text-xdex-green'
                  }`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
              {quoteError && (
                <div className="flex items-center gap-1.5 pt-1 text-yellow-400/80">
                  <AlertTriangle size={10} />
                  <span className="text-[10px]">Estimated rate — live quote unavailable</span>
                </div>
              )}
            </div>
          )}

          {/* Price impact warning */}
          {priceImpact > 5 && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border mt-1 ${
              impactSeverity === 'high'
                ? 'bg-xdex-red/10 border-xdex-red/30 text-xdex-red'
                : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
            }`}>
              <AlertTriangle size={14} />
              <span className="text-[11px] font-medium">
                {impactSeverity === 'high'
                  ? 'Very high price impact! This trade will move the price significantly.'
                  : 'Moderate price impact. Consider reducing trade size.'}
              </span>
            </div>
          )}

          {/* Low liquidity warning */}
          {token.liquidity < 1000 && (
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-yellow-400/5 border-yellow-400/20 text-yellow-400 mt-1">
              <AlertTriangle size={14} />
              <span className="text-[11px] font-medium">
                Low liquidity pool — trades may have high slippage
              </span>
            </div>
          )}

          {/* Decimal precision warning */}
          {((fromToken.decimals ?? 9) !== 9 && (fromToken.decimals ?? 9) !== 6) && (
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-yellow-400/5 border-yellow-400/20 text-yellow-400 mt-1">
              <AlertTriangle size={14} />
              <span className="text-[11px] font-medium">
                Non-standard decimals ({fromToken.decimals}) — check amounts carefully
              </span>
            </div>
          )}

          {/* Transaction simulation note */}
          {fromAmount && Number(fromAmount) > 0 && !loading && toAmount && (
            <div className="text-center mt-1">
              <span className="text-[9px] text-xdex-text-muted">
                Quote simulated on-chain via XDEX AMM
              </span>
            </div>
          )}

          {/* Swap button */}
          <button
            onClick={handleSwap}
            disabled={!fromAmount || Number(fromAmount) <= 0 || loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-xdex-accent text-white hover:brightness-110 active:scale-[0.98] mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Getting quote...
              </span>
            ) : 'Swap via XDEX'}
          </button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] text-xdex-text-muted">Powered by</span>
            <a
              href="https://app.xdex.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-xdex-accent hover:underline"
            >
              XDEX <ExternalLink size={8} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
