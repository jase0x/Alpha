'use client';

import { useState } from 'react';
import { Wallet, X, ExternalLink, Copy, Check } from 'lucide-react';

/**
 * Wallet stub component — placeholder for XDEX wallet provider integration.
 * When the XDEX provider.js is available, this will be replaced with real
 * wallet connection logic (connect, disconnect, read balances, sign txns).
 */

interface WalletStubProps {
  onClose: () => void;
}

export default function WalletStub({ onClose }: WalletStubProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[380px] bg-black border border-xdex-accent/30 rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-xdex-accent/10 flex items-center justify-center mx-auto mb-4">
            <Wallet size={24} className="text-xdex-accent" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Connect Wallet</h3>
          <p className="text-[11px] text-xdex-text-muted mb-6 leading-relaxed">
            Wallet integration is available through the XDEX platform.
            Connect your wallet to view portfolio, execute swaps, and manage boosts.
          </p>

          <a
            href="https://app.xdex.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all mb-3"
          >
            <Wallet size={16} />
            Connect via XDEX
            <ExternalLink size={12} />
          </a>

          <p className="text-[10px] text-xdex-text-muted/60">
            Supports MetaMask, WalletConnect, Phantom, and more
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Portfolio placeholder shown when wallet is not connected.
 * Will be replaced with real balance/PnL data once provider.js is integrated.
 */
export function PortfolioPlaceholder({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-xdex-accent/10 flex items-center justify-center mb-3">
        <Wallet size={20} className="text-xdex-accent" />
      </div>
      <p className="text-sm font-medium text-white mb-1">Portfolio Tracker</p>
      <p className="text-[11px] text-xdex-text-muted mb-4 max-w-xs leading-relaxed">
        Connect your wallet to see token balances, total value, and PnL across X1 and Solana.
      </p>
      <button
        onClick={onConnect}
        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all"
      >
        <Wallet size={14} />
        Connect Wallet
      </button>
    </div>
  );
}
