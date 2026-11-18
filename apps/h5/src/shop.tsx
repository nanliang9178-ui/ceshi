import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { api, getClientId, setToken } from './lib/api';
import { configureCart } from './lib/cart';
import type { LoginResult, ShopBoot } from './lib/types';

interface ShopState {
  boot: ShopBoot | null;
  scene: string;
  loading: boolean;
  error: string;
  reload: () => void;
}

const ShopContext = createContext<ShopState | null>(null);

/** 同一 scene 的配置缓存，页面间跳转不重复请求 */
const bootCache = new Map<string, ShopBoot>();

export function ShopProvider({ children }: { children: ReactNode }) {
  const { scene = '' } = useParams();
  const [boot, setBoot] = useState<ShopBoot | null>(bootCache.get(scene) || null);
  const [loading, setLoading] = useState(!bootCache.has(scene));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!scene) {
      setError('缺少桌码，请重新扫码');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const login = await api.post<LoginResult>('/h5/login', { clientId: getClientId(), scene }, false);
      setToken(login.token);

      const data = await api.get<ShopBoot>(`/client/bootstrap?scene=${encodeURIComponent(scene)}`);
      bootCache.set(scene, data);
      setBoot(data);

      const brand = data.brand?.primaryColor || '#FF5A1F';
      document.documentElement.style.setProperty('--brand', brand);
      document.documentElement.style.setProperty('--brand-dark', shade(brand, -14));
      document.documentElement.style.setProperty('--brand-light', tint(brand, 0.92));
      const colorMeta = document.querySelector('meta[name="theme-color"]');
      if (colorMeta) colorMeta.setAttribute('content', brand);

      configureCart(data.tenant.code);
      document.title = data.store?.name || data.tenant.name || '扫码点单';
    } catch (err) {
      setError((err as Error).message || '门店信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [scene]);

  useEffect(() => {
    if (bootCache.has(scene)) {
      const cached = bootCache.get(scene)!;
      setBoot(cached);
      setLoading(false);
      configureCart(cached.tenant.code);
      return;
    }
    load();
  }, [scene, load]);

  return (
    <ShopContext.Provider value={{ boot, scene, loading, error, reload: load }}>{children}</ShopContext.Provider>
  );
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop 必须在 ShopProvider 内使用');
  return ctx;
}

function toRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function shade(hex: string, percent: number): string {
  const rgb = toRgb(hex);
  return toHex(rgb.map((value) => value + (255 * percent) / 100));
}

function tint(hex: string, ratio: number): string {
  const rgb = toRgb(hex);
  return toHex(rgb.map((value) => value + (255 - value) * ratio));
}
