'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Crosshair,
  Plus,
  Trash2,
  Bell,
  Volume2,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Chain } from '@/types/token';
import {
  SniperRule,
  SniperMatch,
  getRules,
  createRule,
  deleteRule,
  toggleRule,
  getMatches,
  dismissMatch,
  clearMatches,
} from '@/services/sniperStore';
import { formatUsd, formatAge } from '@/utils/format';

interface Props {
  onClose: () => void;
  onTokenClick: (address: string, chain: Chain) => void;
}

export default function SniperPanel({ onClose, onTokenClick }: Props) {
  const [rules, setRules] = useState<SniperRule[]>(() => getRules());
  const [matches, setMatches] = useState<SniperMatch[]>(() => getMatches());
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'rules' | 'matches'>('rules');

  // Form state
  const [name, setName] = useState('');
  const [chain, setChain] = useState<'x1' | 'solana' | 'any'>('any');
  const [minLiq, setMinLiq] = useState('');
  const [maxLiq, setMaxLiq] = useState('');
  const [minMakers, setMinMakers] = useState('');
  const [quoteToken, setQuoteToken] = useState('');
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifySound, setNotifySound] = useState(false);

  const refresh = useCallback(() => {
    setRules(getRules());
    setMatches(getMatches());
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    createRule({
      name: name.trim(),
      enabled: true,
      chain,
      minLiquidity: minLiq ? Number(minLiq) : null,
      maxLiquidity: maxLiq ? Number(maxLiq) : null,
      minMakers: minMakers ? Number(minMakers) : null,
      quoteToken: quoteToken.trim() || null,
      notifyBrowser,
      notifySound,
    });
    setName('');
    setMinLiq('');
    setMaxLiq('');
    setMinMakers('');
    setQuoteToken('');
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteRule(id);
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleRule(id);
    refresh();
  };

  const handleDismiss = (matchedAt: number) => {
    dismissMatch(matchedAt);
    refresh();
  };

  const handleClearMatches = () => {
    clearMatches();
    refresh();
  };

  const activeMatches = matches.filter((m) => !m.dismissed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] bg-black border border-xdex-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-xdex-border">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-xdex-accent" />
            <span className="text-sm font-bold text-white">Pair Sniper</span>
            {activeMatches.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-xdex-green/15 text-xdex-green font-medium animate-pulse">
                {activeMatches.length} new
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-xdex-text-muted hover:text-white hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-xdex-border">
          <button
            onClick={() => setTab('rules')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === 'rules' ? 'text-xdex-accent border-xdex-accent' : 'text-xdex-text-muted border-transparent'
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => setTab('matches')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === 'matches' ? 'text-xdex-accent border-xdex-accent' : 'text-xdex-text-muted border-transparent'
            }`}
          >
            Matches ({activeMatches.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'rules' && (
            <div className="p-4 space-y-3">
              {/* Create rule */}
              {showForm ? (
                <div className="p-3 rounded-lg border border-xdex-accent/30 bg-xdex-card/20 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Rule name (e.g. 'High Liq SOL pairs')"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-xdex-border/60 bg-black text-xs text-white outline-none focus:border-xdex-accent/30"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {(['any', 'x1', 'solana'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChain(c)}
                        className={`py-1.5 text-[10px] rounded font-medium transition-colors ${
                          chain === c
                            ? 'bg-xdex-accent/15 text-xdex-accent border border-xdex-accent/30'
                            : 'bg-xdex-card/30 text-xdex-text-muted border border-xdex-border/40'
                        }`}
                      >
                        {c === 'any' ? 'Any Chain' : c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-xdex-text-muted uppercase block mb-0.5">Min Liquidity</label>
                      <input
                        type="number"
                        placeholder="$0"
                        value={minLiq}
                        onChange={(e) => setMinLiq(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-xdex-border/60 bg-black text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-xdex-text-muted uppercase block mb-0.5">Max Liquidity</label>
                      <input
                        type="number"
                        placeholder="No max"
                        value={maxLiq}
                        onChange={(e) => setMaxLiq(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-xdex-border/60 bg-black text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-xdex-text-muted uppercase block mb-0.5">Min Makers</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={minMakers}
                        onChange={(e) => setMinMakers(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-xdex-border/60 bg-black text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-xdex-text-muted uppercase block mb-0.5">Quote Token</label>
                      <input
                        type="text"
                        placeholder="e.g. WX1, SOL"
                        value={quoteToken}
                        onChange={(e) => setQuoteToken(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-xdex-border/60 bg-black text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyBrowser}
                        onChange={(e) => setNotifyBrowser(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-xdex-accent"
                      />
                      <Bell size={10} className="text-xdex-text-muted" />
                      <span className="text-[10px] text-xdex-text-secondary">Browser</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifySound}
                        onChange={(e) => setNotifySound(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-xdex-accent"
                      />
                      <Volume2 size={10} className="text-xdex-text-muted" />
                      <span className="text-[10px] text-xdex-text-secondary">Sound</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreate}
                      className="flex-1 py-2 rounded bg-xdex-accent text-white text-xs font-semibold hover:brightness-110 transition-all"
                    >
                      Create Rule
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-3 py-2 rounded text-xs text-xdex-text-muted hover:text-white hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 w-full py-2.5 rounded-lg border border-dashed border-xdex-border/60 text-xdex-text-muted hover:border-xdex-accent/40 hover:text-xdex-accent transition-colors justify-center"
                >
                  <Plus size={12} />
                  <span className="text-xs font-medium">New Sniper Rule</span>
                </button>
              )}

              {/* Rules list */}
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    rule.enabled ? 'border-xdex-border/50 bg-xdex-card/10' : 'border-xdex-border/20 bg-black opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Crosshair size={11} className={rule.enabled ? 'text-xdex-accent' : 'text-xdex-text-muted'} />
                      <span className="text-xs font-semibold text-white">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(rule.id)}
                        className={`p-1 rounded transition-colors ${
                          rule.enabled ? 'text-xdex-green hover:text-xdex-green/70' : 'text-xdex-text-muted hover:text-white'
                        }`}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        <Power size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1 rounded text-xdex-text-muted hover:text-xdex-red transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-card/30 text-xdex-text-secondary">
                      {rule.chain === 'any' ? 'Any Chain' : rule.chain.toUpperCase()}
                    </span>
                    {rule.minLiquidity !== null && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-card/30 text-xdex-text-secondary">
                        Liq &ge; ${rule.minLiquidity}
                      </span>
                    )}
                    {rule.maxLiquidity !== null && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-card/30 text-xdex-text-secondary">
                        Liq &le; ${rule.maxLiquidity}
                      </span>
                    )}
                    {rule.minMakers !== null && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-card/30 text-xdex-text-secondary">
                        Makers &ge; {rule.minMakers}
                      </span>
                    )}
                    {rule.quoteToken && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-xdex-card/30 text-xdex-text-secondary">
                        Quote: {rule.quoteToken}
                      </span>
                    )}
                    {rule.notifyBrowser && <Bell size={9} className="text-xdex-accent" />}
                    {rule.notifySound && <Volume2 size={9} className="text-xdex-accent" />}
                  </div>
                </div>
              ))}

              {rules.length === 0 && !showForm && (
                <div className="text-center py-8 text-xdex-text-muted text-xs">
                  No sniper rules yet. Create one to get alerted when new pairs matching your criteria appear.
                </div>
              )}
            </div>
          )}

          {tab === 'matches' && (
            <div className="p-4 space-y-2">
              {activeMatches.length > 0 && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={handleClearMatches}
                    className="text-[10px] text-xdex-text-muted hover:text-xdex-red transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
              {activeMatches.map((m, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-xdex-green/20 bg-xdex-green/5 cursor-pointer hover:bg-xdex-green/10 transition-colors"
                  onClick={() => {
                    onTokenClick(m.token.address, m.token.chain);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{m.token.baseToken.symbol}</span>
                      <span className="text-[10px] text-xdex-text-muted">/{m.token.quoteToken.symbol}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-xdex-accent/10 text-xdex-accent">{m.token.chain.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(m.matchedAt); }}
                      className="text-xdex-text-muted hover:text-white text-xs"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-xdex-text-secondary">
                    <span>Liq: {formatUsd(m.token.liquidity)}</span>
                    <span>{m.token.makers} makers</span>
                    <span>Age: {formatAge(m.token.createdAt)}</span>
                  </div>
                  <div className="text-[9px] text-xdex-text-muted mt-1">
                    Matched rule: <span className="text-xdex-accent">{m.rule.name}</span>
                  </div>
                </div>
              ))}
              {activeMatches.length === 0 && (
                <div className="text-center py-8 text-xdex-text-muted text-xs">
                  No matches yet. New pairs matching your sniper rules will appear here.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
