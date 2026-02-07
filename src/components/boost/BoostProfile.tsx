'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { BoostOrder, BoostTier, BOOST_TIERS } from '@/types/boost';
import {
  getAllOrders,
  cancelOrder,
  expireOldBoosts,
} from '@/services/boostStore';

interface BoostProfileProps {
  onClose: () => void;
  onNewBoost: () => void;
}

/** Renders 1, 2, or 3 neon yellow lightning bolts */
function BoltIcon({ count, size = 18 }: { count: number; size?: number }) {
  const boltSize = count === 1 ? size : size - 2;
  return (
    <span className="inline-flex items-center">
      {Array.from({ length: count }).map((_, i) => (
        <Zap key={i} size={boltSize} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -4 : 0 }} />
      ))}
    </span>
  );
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  pending: { label: 'Pending', color: 'text-xdex-yellow', icon: Clock },
  active: { label: 'Active', color: 'text-xdex-green', icon: CheckCircle2 },
  expired: { label: 'Expired', color: 'text-xdex-text-muted', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-xdex-red', icon: XCircle },
};

export default function BoostProfile({ onClose, onNewBoost }: BoostProfileProps) {
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'pending'>('all');

  const loadOrders = () => {
    expireOldBoosts();
    setOrders(getAllOrders().sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = (orderId: string) => {
    if (cancelOrder(orderId)) {
      loadOrders();
    }
  };

  const filteredOrders =
    filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const activeCount = orders.filter((o) => o.status === 'active').length;
  const totalSpent = orders
    .filter((o) => o.status === 'active' || o.status === 'expired')
    .reduce(
      (acc, o) => {
        if (o.paymentCurrency === 'XNT') acc.xnt += o.paymentAmount;
        else acc.sol += o.paymentAmount;
        return acc;
      },
      { xnt: 0, sol: 0 },
    );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeRemaining = (expiresAt?: number) => {
    if (!expiresAt) return '--';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[600px] max-h-[85vh] bg-black border border-xdex-accent/30 rounded-2xl shadow-2xl shadow-xdex-accent/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-xdex-accent" />
            <h3 className="text-base font-semibold text-white">My Boosts</h3>
            {activeCount > 0 && (
              <span className="text-[10px] text-xdex-green bg-xdex-green/10 px-2 py-0.5 rounded font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadOrders}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-xdex-border/30 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-xdex-text-muted">Active</span>
            <span className="text-xs font-semibold text-xdex-green">{activeCount}</span>
          </div>
          <div className="w-px h-4 bg-xdex-border/40" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-xdex-text-muted">Total Orders</span>
            <span className="text-xs font-semibold text-white">{orders.length}</span>
          </div>
          <div className="w-px h-4 bg-xdex-border/40" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-xdex-text-muted">Spent</span>
            <span className="text-xs font-semibold text-white font-mono">
              {totalSpent.xnt > 0 ? `${totalSpent.xnt} XNT` : ''}
              {totalSpent.xnt > 0 && totalSpent.sol > 0 ? ' / ' : ''}
              {totalSpent.sol > 0 ? `${totalSpent.sol} SOL` : ''}
              {totalSpent.xnt === 0 && totalSpent.sol === 0 ? '--' : ''}
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 flex-shrink-0">
          {(['all', 'active', 'pending', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-xdex-accent/15 text-xdex-accent'
                  : 'text-xdex-text-muted hover:text-xdex-text hover:bg-white/5'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 text-[9px] opacity-70">
                {f === 'all'
                  ? orders.length
                  : orders.filter((o) => o.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="text-xdex-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-xdex-text-muted mb-1">No boost orders yet</p>
              <p className="text-[11px] text-xdex-text-muted/60 mb-4">
                Boost your tokens to increase visibility on Alpha Scan
              </p>
              <button
                onClick={onNewBoost}
                className="px-4 py-2 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                Create Boost
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {filteredOrders.map((order) => {
                const config = BOOST_TIERS[order.tier];
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border p-4 transition-all ${
                      order.status === 'active'
                        ? 'border-xdex-green/20 bg-xdex-green/[0.02]'
                        : 'border-xdex-border/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Tier icon — neon yellow bolts */}
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${config.color}15` }}
                      >
                        <BoltIcon count={config.boltCount} size={18} />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            {order.tokenSymbol}
                          </span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              color: config.color,
                              backgroundColor: `${config.color}15`,
                            }}
                          >
                            {config.name}
                          </span>
                          <div className="flex items-center gap-1 ml-auto">
                            <StatusIcon size={11} className={status.color} />
                            <span className={`text-[10px] font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-xdex-text-muted">
                          <span className="font-mono">
                            {order.paymentAmount} {order.paymentCurrency}
                          </span>
                          <span>&middot;</span>
                          <span>+{config.rankBoost} rank</span>
                          <span>&middot;</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>

                        {order.status === 'active' && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-xdex-border/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-xdex-green rounded-full transition-all"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      ((order.expiresAt! - Date.now()) /
                                        (config.durationDays * 86400000)) *
                                        100,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-xdex-green font-mono flex-shrink-0">
                              {timeRemaining(order.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-red hover:bg-xdex-red/10 transition-colors flex-shrink-0"
                          title="Cancel order"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {(order.status === 'expired' || order.status === 'cancelled') && (
                        <button
                          onClick={onNewBoost}
                          className="p-1.5 rounded-lg text-xdex-text-muted hover:text-xdex-accent hover:bg-xdex-accent/10 transition-colors flex-shrink-0"
                          title="Re-boost"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {orders.length > 0 && (
          <div className="px-5 py-3 border-t border-xdex-border/30 flex-shrink-0">
            <button
              onClick={onNewBoost}
              className="w-full py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              New Boost
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
