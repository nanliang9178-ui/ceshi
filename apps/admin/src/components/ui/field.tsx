import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const baseInput =
  'w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-900/35 transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:bg-cream disabled:text-ink-900/40';

export function Field({
  label,
  hint,
  required,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-800">
          {label}
          {required && <span className="text-brand-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs leading-5 text-ink-900/45">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInput, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInput, 'min-h-[84px] py-2.5 leading-6', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseInput, 'h-10 cursor-pointer appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-500' : 'bg-ink-900/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
      {label && <span className="text-sm text-ink-800">{label}</span>}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-ink-900/[0.05] p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all',
            value === option.value
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-900/50 hover:text-ink-900/80',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
