'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, React.ComponentType<any>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'border-xdex-green/40 bg-xdex-green/10 text-xdex-green',
  error: 'border-xdex-red/40 bg-xdex-red/10 text-xdex-red',
  warning: 'border-xdex-yellow/40 bg-xdex-yellow/10 text-xdex-yellow',
  info: 'border-xdex-accent/40 bg-xdex-accent/10 text-xdex-accent',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast_${++counterRef.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-slide-in ${colors[t.type]}`}
              style={{ minWidth: 260, maxWidth: 380 }}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="text-xs font-medium text-white flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X size={12} className="text-xdex-text-muted" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
