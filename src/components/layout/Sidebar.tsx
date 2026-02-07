'use client';

import { useState } from 'react';
import {
  ArrowLeftRight,
  Droplets,
  Sprout,
  Shield,
  ScanSearch,
  Landmark,
  Vote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  User,
} from 'lucide-react';
import DegenLogo from '@/components/ui/DegenLogo';

function XdexLogo({ size }: { size: number }) {
  return <img src="https://app.xdex.xyz/logo/logo.png" alt="XDEX" style={{ width: size, height: size }} className="object-contain" />;
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onAdvertise?: () => void;
  onProfile?: () => void;
}

const xdexNavItems: {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  isActive?: boolean;
  isExternal?: boolean;
  comingSoon?: boolean;
}[] = [
  { id: 'swap', label: 'Swap', icon: ArrowLeftRight, href: 'https://app.xdex.xyz/swap', isExternal: true },
  { id: 'liquidity', label: 'Liquidity', icon: Droplets, href: 'https://app.xdex.xyz/liquidity', isExternal: true },
  { id: 'farm', label: 'Farm', icon: Sprout, href: 'https://app.xdex.xyz/farm', isExternal: true },
  { id: 'stake', label: 'Stake', icon: Shield, href: 'https://app.xdex.xyz/stake', isExternal: true },
  { id: 'alpha', label: 'Alpha Scan', icon: ScanSearch, href: '#', isActive: true },
  { id: 'lendx', label: 'LendX', icon: Landmark, href: '#', comingSoon: true },
  { id: 'governance', label: 'Governance', icon: Vote, href: '#', comingSoon: true },
];

export default function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
  onAdvertise,
  onProfile,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  return (
    <aside
      className={`flex flex-col h-full bg-black border-r border-xdex-border transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* XDEX Logo */}
      <div className="flex items-center px-3 h-14 border-b border-xdex-border">
        <div className="flex items-center gap-2">
          <XdexLogo size={collapsed ? 26 : 28} />
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-tight">XDEX</span>
          )}
        </div>
      </div>

      {/* XDEX Navigation */}
      {!collapsed && (
        <div className="px-4 pb-1.5 pt-3">
          <span className="text-[10px] font-semibold text-xdex-text-muted uppercase tracking-widest">
            Platform
          </span>
        </div>
      )}

      <nav className="flex-1 px-2 pt-1">
        {xdexNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          if (item.isExternal) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-lg mb-0.5 transition-all text-xdex-text-secondary hover:text-xdex-text hover:bg-white/[0.03] ${
                  collapsed ? 'justify-center px-0' : ''
                }`}
              >
                <Icon size={16} strokeWidth={1.6} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    <ExternalLink size={10} className="ml-auto text-xdex-text-muted opacity-50" />
                  </>
                )}
              </a>
            );
          }

          return (
            <div key={item.id}>
              <button
                disabled={item.comingSoon}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-lg mb-0.5 transition-all ${
                  isActive
                    ? 'text-xdex-accent bg-xdex-accent/10 border border-xdex-accent/20'
                    : item.comingSoon
                    ? 'text-xdex-text-muted/50 cursor-not-allowed'
                    : 'text-xdex-text-secondary hover:text-xdex-text hover:bg-white/[0.03]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.6} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.comingSoon && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-xdex-border/40 text-xdex-text-muted">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Sub-links under Alpha Scan */}
              {isActive && !collapsed && (
                <div className="ml-7 mb-1 space-y-0.5">
                  <button
                    onClick={onAdvertise}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] rounded-md text-xdex-text-secondary hover:text-xdex-accent hover:bg-xdex-accent/5 transition-all"
                  >
                    <Zap size={13} strokeWidth={1.8} className="flex-shrink-0" />
                    <span>Advertise</span>
                  </button>
                  <button
                    onClick={onProfile}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] rounded-md text-xdex-text-secondary hover:text-xdex-accent hover:bg-xdex-accent/5 transition-all"
                  >
                    <User size={13} strokeWidth={1.8} className="flex-shrink-0" />
                    <span>My Boosts</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Degen LaunchPad button */}
      <div className="px-3 pb-3">
        <a
          href="https://app.xdex.xyz/launchpad"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 w-full py-2.5 text-[13px] font-semibold text-white transition-all rounded-lg bg-gradient-to-r from-xdex-accent/20 to-xdex-accent/10 border border-xdex-accent/30 hover:border-xdex-accent/60 hover:from-xdex-accent/30 hover:to-xdex-accent/15 ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <DegenLogo size={18} />
          {!collapsed && <span>Degen LaunchPad</span>}
        </a>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-9 border-t border-xdex-border text-xdex-text-muted hover:text-xdex-text transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
