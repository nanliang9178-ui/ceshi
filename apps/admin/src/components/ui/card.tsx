import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card p-5', className)}>{children}</div>;
}

export function CardTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-900/45">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = 'bg-ink-900/5 text-ink-600 ring-ink-900/10',
  className,
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Empty({
  title = '暂无数据',
  description,
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-ink-900/25">
        {icon || <span className="text-2xl">🍽️</span>}
      </div>
      <div>
        <p className="text-sm font-medium text-ink-900/70">{title}</p>
        {description && <p className="mt-1 text-xs text-ink-900/40">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-900/40">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-900/15 border-t-brand-500" />
      {label || '加载中…'}
    </div>
  );
}
