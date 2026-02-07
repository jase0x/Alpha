'use client';

import { useState } from 'react';
import { X, ArrowDownUp, Settings, ChevronDown, Loader2 } from 'lucide-react';
import { TokenPair } from '@/types/token';
import { formatPrice } from '@/utils/format';

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

  const fromToken = isSwapped ? token.baseToken : token.quoteToken;
  const toToken = isSwapped ? token.quoteToken : token.baseToken;

  const handleFromChange = (val: string) => {
    setFromAmount(val);
    if (val && !isNaN(Number(val))) {
      const rate = isSwapped ? token.priceUsd : 1 / token.priceUsd;
      setToAmount((Number(val) * rate).toFixed(6));
    } else {
      setToAmount('');
    }
  };

  const handleSwapDirection = () => {
    setIsSwapped(!isSwapped);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = () => {
    // Integration point: call XDEX swap API
    // For now this would open the XDEX swap interface
    const xdexSwapUrl = `https://app.xdex.xyz/swap?inputToken=${fromToken.address}&outputToken=${toToken.address}&amount=${fromAmount}`;
    window.open(xdexSwapUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-md bg-xdex-surface border border-xdex-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border">
          <h3 className="text-base font-semibold text-white">Swap</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-text hover:bg-xdex-hover transition-colors"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-xdex-hover transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Slippage settings */}
        {showSettings && (
          <div className="px-5 py-3 border-b border-xdex-border">
            <div className="text-xs text-xdex-text-muted mb-2">Slippage Tolerance</div>
            <div className="flex items-center gap-2">
              {[0.1, 0.5, 1.0, 3.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    slippage === s
                      ? 'bg-xdex-accent/20 text-xdex-accent border border-xdex-accent/40'
                      : 'bg-xdex-card border border-xdex-border text-xdex-text-secondary hover:text-xdex-text'
                  }`}
                >
                  {s}%
                </button>
              ))}
              <div className="flex items-center bg-xdex-card border border-xdex-border rounded-lg px-2">
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-12 py-1 text-xs bg-transparent text-white text-right"
                  step={0.1}
                  min={0.01}
                  max={50}
                />
                <span className="text-xs text-xdex-text-muted ml-1">%</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-2">
          {/* From token */}
          <div className="bg-xdex-card rounded-xl border border-xdex-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-xdex-text-muted">From</span>
              <span className="text-xs text-xdex-text-muted">Balance: --</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => handleFromChange(e.target.value)}
                className="flex-1 text-xl font-semibold bg-transparent text-white placeholder:text-xdex-text-muted font-mono"
              />
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-surface border border-xdex-border hover:border-xdex-accent/40 transition-colors">
                <div className="w-5 h-5 rounded-full bg-xdex-border flex items-center justify-center">
                  <span className="text-[8px] font-bold text-xdex-accent">
                    {fromToken.symbol.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{fromToken.symbol}</span>
                <ChevronDown size={14} className="text-xdex-text-muted" />
              </button>
            </div>
          </div>

          {/* Swap direction button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwapDirection}
              className="p-2 rounded-xl bg-xdex-card border border-xdex-border text-xdex-text-muted hover:text-xdex-accent hover:border-xdex-accent/40 transition-colors"
            >
              <ArrowDownUp size={16} />
            </button>
          </div>

          {/* To token */}
          <div className="bg-xdex-card rounded-xl border border-xdex-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-xdex-text-muted">To</span>
              <span className="text-xs text-xdex-text-muted">Balance: --</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={toAmount}
                readOnly
                className="flex-1 text-xl font-semibold bg-transparent text-white placeholder:text-xdex-text-muted font-mono"
              />
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xdex-surface border border-xdex-border hover:border-xdex-accent/40 transition-colors">
                <div className="w-5 h-5 rounded-full bg-xdex-border flex items-center justify-center">
                  <span className="text-[8px] font-bold text-xdex-accent">
                    {toToken.symbol.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{toToken.symbol}</span>
                <ChevronDown size={14} className="text-xdex-text-muted" />
              </button>
            </div>
          </div>

          {/* Rate info */}
          {fromAmount && toAmount && (
            <div className="px-2 py-2 text-xs text-xdex-text-muted">
              <div className="flex justify-between">
                <span>Rate</span>
                <span className="text-xdex-text-secondary">
                  1 {fromToken.symbol} = {(Number(toAmount) / Number(fromAmount)).toFixed(6)}{' '}
                  {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Slippage</span>
                <span className="text-xdex-text-secondary">{slippage}%</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Min received</span>
                <span className="text-xdex-text-secondary">
                  {(Number(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
            </div>
          )}

          {/* Swap button */}
          <button
            onClick={handleSwap}
            disabled={!fromAmount || Number(fromAmount) <= 0}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-xdex-accent text-white hover:opacity-90 active:scale-[0.98]"
          >
            Swap via XDEX
          </button>

          <div className="text-center">
            <span className="text-[10px] text-xdex-text-muted">
              Powered by XDEX AMM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
