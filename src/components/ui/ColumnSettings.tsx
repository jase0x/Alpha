'use client';

import { X, Settings2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { ColumnId, ALL_COLUMNS } from '@/utils/columnPrefs';

interface ColumnSettingsProps {
  visible: Set<ColumnId>;
  onChange: (cols: Set<ColumnId>) => void;
  onClose: () => void;
}

export default function ColumnSettings({ visible, onChange, onClose }: ColumnSettingsProps) {
  const toggle = (id: ColumnId) => {
    if (id === 'token') return; // Token column always visible
    const next = new Set(visible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const resetDefaults = () => {
    onChange(new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[320px] bg-black border border-xdex-border/60 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border/60">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-xdex-accent" />
            <h3 className="text-sm font-semibold text-white">Columns</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetDefaults}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
          {ALL_COLUMNS.map((col) => {
            const isVisible = visible.has(col.id);
            const isLocked = col.id === 'token';

            return (
              <button
                key={col.id}
                onClick={() => toggle(col.id)}
                disabled={isLocked}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-all ${
                  isLocked
                    ? 'text-xdex-text-muted/50 cursor-not-allowed'
                    : isVisible
                    ? 'text-white hover:bg-white/5'
                    : 'text-xdex-text-muted hover:bg-white/5'
                }`}
              >
                <span className="font-medium">{col.label}</span>
                {isLocked ? (
                  <Eye size={14} className="text-xdex-text-muted/30" />
                ) : isVisible ? (
                  <Eye size={14} className="text-xdex-accent" />
                ) : (
                  <EyeOff size={14} className="text-xdex-text-muted/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
