import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

function useEscape(onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEscape(onClose, open);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-pop-in" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(23,24,28,0.5)] animate-pop-in',
          width,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-ink-900">{title}</h3>
              {description && <p className="mt-0.5 text-xs text-ink-900/45">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-ink-900"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line/70 bg-cream/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEscape(onClose, open);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px] animate-pop-in" onClick={onClose} />
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[-30px_0_80px_-40px_rgba(23,24,28,0.6)] animate-fade-up',
          width,
        )}
        style={{ animationDuration: '0.28s' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-900/45">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-ink-900"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line/70 bg-cream/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
