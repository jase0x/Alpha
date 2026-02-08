# Alpha Scan — Production Upload Manifest

Upload these files to `xdex_frontend` to integrate Alpha Scan into production.

---

## DEX-WIDE FILES (use across ALL XDEX pages)

These files are designed to work on any XDEX page — Swap, Liquidity, Farm, Stake, etc.

### Layout Shell
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/layout/XDEXLayout.tsx` | `components/layout/XDEXLayout.tsx` | Shared app shell (sidebar + trending banner + content). Wrap any page with this. |
| `src/components/layout/TrendingBanner.tsx` | `components/layout/TrendingBanner.tsx` | **DEX-wide trending ticker.** Self-fetches data every 60s. Drop into ANY page layout. |
| `src/components/layout/Sidebar.tsx` | `components/layout/Sidebar.tsx` | Sidebar navigation with `activePage` prop for highlighting. |

### How to add TrendingBanner to all XDEX pages

Option A — Per page:
```tsx
import TrendingBanner from '@/components/layout/TrendingBanner';
// No props needed — auto-fetches from XDEX API
<TrendingBanner />
```

Option B — Shared layout (recommended):
```tsx
import XDEXLayout from '@/components/layout/XDEXLayout';
export default function SwapPage() {
  return (
    <XDEXLayout activePage="swap">
      <SwapContent />
    </XDEXLayout>
  );
}
```

---

## ALPHA SCAN PAGE FILES

### Page Entry Point
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/app/page.tsx` | `app/alpha/page.tsx` (or wherever Alpha lives in your routing) | Main Alpha Scan page — uses XDEXLayout, FilterBar, useTokenData |

### Hooks
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/hooks/useTokenData.ts` | `hooks/useTokenData.ts` | Data fetching hook — loads pools from X1 + Solana, auto-refreshes 30s, checks alerts & sniper rules |

### Components — Screener
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/screener/FilterBar.tsx` | `components/screener/FilterBar.tsx` | Filter tabs (All/New/Gainers/Losers/Watchlist), timeframe toggle, search, tool buttons |
| `src/components/screener/ScreenerFilters.tsx` | `components/screener/ScreenerFilters.tsx` | Advanced screener filter panel (liquidity, mcap, volume, age, safety, etc.) |

### Components — Token
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/token/TokenTable.tsx` | `components/token/TokenTable.tsx` | Sortable token table with column customization |
| `src/components/token/TokenRow.tsx` | `components/token/TokenRow.tsx` | Individual token row with sparkline, safety badge, boost indicator |
| `src/components/token/TokenDetail.tsx` | `components/token/TokenDetail.tsx` | DexScreener-style token detail panel (chart, txns, top traders, holders, info) |
| `src/components/token/PnLSimulator.tsx` | `components/token/PnLSimulator.tsx` | Profit/Loss simulator for individual tokens |
| `src/components/token/WhaleTracker.tsx` | `components/token/WhaleTracker.tsx` | Whale activity tracker |

### Components — Chart
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/chart/PriceChart.tsx` | `components/chart/PriceChart.tsx` | Candlestick/line/area price chart (lightweight-charts) |

### Components — Swap
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/swap/SwapModal.tsx` | `components/swap/SwapModal.tsx` | Swap modal with token input/output |

### Components — Boost (Advertising)
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/boost/BoostForm.tsx` | `components/boost/BoostForm.tsx` | Boost/advertising form for token promotion |
| `src/components/boost/BoostProfile.tsx` | `components/boost/BoostProfile.tsx` | User's active boosts profile |

### Components — Compare
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/compare/TokenCompare.tsx` | `components/compare/TokenCompare.tsx` | Side-by-side token comparison modal |

### Components — Sniper
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/sniper/SniperPanel.tsx` | `components/sniper/SniperPanel.tsx` | Pair sniper — automated new pair matching rules |

### Components — UI
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/ui/Toast.tsx` | `components/ui/Toast.tsx` | Toast notification system (provider + hook) |
| `src/components/ui/KeyboardShortcuts.tsx` | `components/ui/KeyboardShortcuts.tsx` | Keyboard shortcuts help modal |
| `src/components/ui/ColumnSettings.tsx` | `components/ui/ColumnSettings.tsx` | Column visibility settings modal |
| `src/components/ui/WalletStub.tsx` | `components/ui/WalletStub.tsx` | Wallet connection stub |
| `src/components/ui/SearchModal.tsx` | `components/ui/SearchModal.tsx` | Global token search modal |
| `src/components/ui/ErrorBoundary.tsx` | `components/ui/ErrorBoundary.tsx` | React error boundary wrapper |
| `src/components/ui/AlphaLogo.tsx` | `components/ui/AlphaLogo.tsx` | Alpha logo SVG component |
| `src/components/ui/DegenLogo.tsx` | `components/ui/DegenLogo.tsx` | Degen LaunchPad logo component |
| `src/components/ui/X1Logo.tsx` | `components/ui/X1Logo.tsx` | X1 chain logo component |
| `src/components/ui/SolanaLogo.tsx` | `components/ui/SolanaLogo.tsx` | Solana chain logo component |

### Components — Providers
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/components/Providers.tsx` | `components/Providers.tsx` | Client-side providers wrapper (Toast) |

### Services (API & Data Stores)
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/services/api.ts` | `services/api.ts` | XDEX API client — fetchPoolList, fetchOHLCV, fetchTransactions |
| `src/services/rpc.ts` | `services/rpc.ts` | X1 RPC client for on-chain data |
| `src/services/boostStore.ts` | `services/boostStore.ts` | localStorage boost store |
| `src/services/alertStore.ts` | `services/alertStore.ts` | Price alert store (localStorage) |
| `src/services/sniperStore.ts` | `services/sniperStore.ts` | Sniper rule store (localStorage) |
| `src/services/sentimentStore.ts` | `services/sentimentStore.ts` | Community sentiment voting store |
| `src/services/whaleStore.ts` | `services/whaleStore.ts` | Whale tracking store |

### Utilities
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/utils/format.ts` | `utils/format.ts` | Number formatting (USD, percent, compact, price) |
| `src/utils/safetyScore.ts` | `utils/safetyScore.ts` | Token safety score computation |
| `src/utils/rugDetector.ts` | `utils/rugDetector.ts` | Rug pull risk detection heuristics |
| `src/utils/columnPrefs.ts` | `utils/columnPrefs.ts` | Column preferences + CSV export |

### Types
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/types/token.ts` | `types/token.ts` | TokenPair, Chain, FilterView, TimeFilter types |
| `src/types/boost.ts` | `types/boost.ts` | ActiveBoost, BoostTier types |

### App Layout
| File | Upload To | Purpose |
|------|-----------|---------|
| `src/app/layout.tsx` | `app/alpha/layout.tsx` (or merge into existing root layout) | Root layout with Providers, fonts, metadata |
| `src/app/globals.css` | Merge into existing `globals.css` | XDEX custom styles (animations, scrollbar, live-dot, etc.) |

---

## CONFIGURATION FILES

These contain XDEX-specific config that may need merging with your existing setup.

| File | Purpose | Action |
|------|---------|--------|
| `tailwind.config.js` | XDEX color palette (`xdex-*` colors), Poppins + JetBrains Mono fonts | **Merge** `theme.extend.colors.xdex` and `fontFamily` into your existing tailwind config |
| `next.config.js` | Remote image patterns | **Merge** `images.remotePatterns` if not already present |
| `package.json` | Dependencies | **Add** `lightweight-charts@^4.2.1` and `lucide-react@^0.460.0` if not already installed |
| `tsconfig.json` | Path aliases | Ensure `@/*` maps to `src/*` |
| `postcss.config.js` | PostCSS plugins | Standard Tailwind setup — likely already configured |

---

## BACKWARD COMPATIBILITY

| File | Note |
|------|------|
| `src/components/layout/Header.tsx` | **Kept for backward compatibility.** The old header component still works. New pages should use `TrendingBanner` or `XDEXLayout` instead. |

---

## QUICK START

1. Copy all `src/` files to your `xdex_frontend/src/` maintaining the same directory structure
2. Merge tailwind colors into your `tailwind.config`
3. Add `lightweight-charts` to dependencies: `npm install lightweight-charts@^4.2.1`
4. Add the Alpha page route at `/alpha` (or wherever you want it)
5. For DEX-wide trending banner, wrap each page with `<XDEXLayout>` or add `<TrendingBanner />` to your shared layout

## FILE COUNT

- **Total files**: 46 source files + 5 config files = **51 files**
- **DEX-wide reusable**: 3 files (XDEXLayout, TrendingBanner, Sidebar)
- **Alpha-specific**: 43 source files
