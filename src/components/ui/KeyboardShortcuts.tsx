'use client';

import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: ['/'], description: 'Focus search' },
  { keys: ['Esc'], description: 'Close panel / modal' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['J'], description: 'Next token in list' },
  { keys: ['K'], description: 'Previous token in list' },
  { keys: ['Enter'], description: 'Open selected token detail' },
  { keys: ['F'], description: 'Toggle favorite on selected' },
  { keys: ['1'], description: 'All Pairs filter' },
  { keys: ['2'], description: 'New Pairs filter' },
  { keys: ['3'], description: 'Gainers filter' },
  { keys: ['4'], description: 'Losers filter' },
  { keys: ['5'], description: 'Watchlist filter' },
  { keys: ['E'], description: 'Export CSV' },
];

export default function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[400px] bg-black border border-xdex-border/60 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border/60">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-xdex-accent" />
            <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-xdex-text-secondary">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 text-[10px] font-mono font-semibold text-white bg-xdex-border/40 border border-xdex-border rounded"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-xdex-border/30 text-center">
          <span className="text-[10px] text-xdex-text-muted">
            Press <kbd className="px-1 py-0.5 text-[9px] font-mono bg-xdex-border/40 rounded">?</kbd> to toggle this panel
          </span>
        </div>
      </div>
    </div>
  );
}
