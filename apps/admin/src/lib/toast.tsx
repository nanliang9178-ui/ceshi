import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from './utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let seed = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      seed += 1;
      const id = seed;
      setItems((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => remove(id), type === 'error' ? 4200 : 2600);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-5 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-lift animate-pop-in',
              item.type === 'success' && 'bg-ink-900 text-white',
              item.type === 'error' && 'bg-red-600 text-white',
              item.type === 'info' && 'bg-white text-ink-900 ring-1 ring-line',
            )}
          >
            {item.type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />}
            {item.type === 'error' && <XCircle size={16} className="shrink-0" />}
            {item.type === 'info' && <Info size={16} className="shrink-0 text-brand-500" />}
            <span className="leading-5">{item.message}</span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="ml-1 cursor-pointer rounded-full p-0.5 opacity-60 transition hover:opacity-100"
              aria-label="关闭提示"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}
