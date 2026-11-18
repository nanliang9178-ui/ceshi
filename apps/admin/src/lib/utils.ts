import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function fen(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.00';
  return (Math.round(value) / 100).toFixed(2);
}

export function fenShort(value?: number | null): string {
  const yuan = Math.round(value || 0) / 100;
  if (Math.abs(yuan) >= 10000) return `${(yuan / 10000).toFixed(1)}w`;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

export function toFen(value: string | number): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function timeAgo(input?: string | Date | null): string {
  if (!input) return '-';
  const date = new Date(input);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  if (diff < minute) return '刚刚';
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} 小时前`;
  return `${Math.floor(diff / (24 * 60 * minute))} 天前`;
}

export function formatTime(input?: string | Date | null, withDate = false): string {
  if (!input) return '-';
  const date = new Date(input);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (!withDate) return `${hh}:${mm}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

export function formatDate(input?: string | Date | null): string {
  if (!input) return '-';
  const date = new Date(input);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

export function durationText(input?: string | Date | null): string {
  if (!input) return '-';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(input).getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}

export function todayText(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
