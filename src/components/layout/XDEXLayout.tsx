'use client';

/**
 * XDEXLayout — Shared app shell for all XDEX pages.
 *
 * Provides the standard XDEX sidebar navigation and trending banner header.
 * Drop this into any XDEX page to get the consistent app chrome.
 *
 * Usage in xdex_frontend:
 *   import XDEXLayout from '@/components/layout/XDEXLayout';
 *   export default function SwapPage() {
 *     return <XDEXLayout activePage="swap"><SwapContent /></XDEXLayout>;
 *   }
 */

import { useState, ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TrendingBanner from '@/components/layout/TrendingBanner';
import { TokenPair, Chain } from '@/types/token';

interface XDEXLayoutProps {
  children: ReactNode;
  /** Which sidebar nav item to highlight as active */
  activePage?: string;
  /** Show the trending banner header (default: true) */
  showTrending?: boolean;
  /** Chain state (for pages that need chain selection) */
  activeChain?: Chain;
  onChainChange?: (chain: Chain) => void;
  x1Count?: number;
  solanaCount?: number;
  /** Sidebar action callbacks */
  onAdvertise?: () => void;
  onProfile?: () => void;
  /** Token click from trending banner */
  onTrendingTokenClick?: (token: TokenPair) => void;
  /** External token data for trending banner (optional — banner fetches own data if not provided) */
  trendingTokens?: TokenPair[];
  allTrendingTokens?: TokenPair[];
}

export default function XDEXLayout({
  children,
  activePage = 'alpha',
  showTrending = true,
  activeChain = 'x1',
  onChainChange,
  x1Count = 0,
  solanaCount = 0,
  onAdvertise,
  onProfile,
  onTrendingTokenClick,
  trendingTokens,
  allTrendingTokens,
}: XDEXLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-xdex-bg">
      {/* Sidebar — desktop */}
      <div className="sidebar-desktop">
        <Sidebar
          activePage={activePage}
          onAdvertise={onAdvertise}
          onProfile={onProfile}
          activeChain={activeChain}
          onChainChange={onChainChange}
          x1Count={x1Count}
          solanaCount={solanaCount}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[80] flex md:hidden">
          <div className="absolute inset-0 modal-overlay" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar
              activePage={activePage}
              onAdvertise={() => { onAdvertise?.(); setMobileSidebarOpen(false); }}
              onProfile={() => { onProfile?.(); setMobileSidebarOpen(false); }}
              activeChain={activeChain}
              onChainChange={onChainChange}
              x1Count={x1Count}
              solanaCount={solanaCount}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Trending banner */}
        {showTrending && (
          <TrendingBanner
            tokens={trendingTokens}
            allTokens={allTrendingTokens}
            onTokenClick={onTrendingTokenClick}
          />
        )}

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
