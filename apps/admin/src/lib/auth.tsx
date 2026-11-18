import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, setToken } from './api';
import type { MeInfo } from './types';

interface AuthContextValue {
  me: MeInfo | null;
  loading: boolean;
  isPlatform: boolean;
  loginStaff: (username: string, password: string, tenantCode?: string) => Promise<void>;
  loginPlatform: (username: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.get<MeInfo>('/auth/me');
    setMe(data);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ts_token');
    if (!token) {
      setLoading(false);
      return;
    }
    refresh()
      .catch((error) => {
        console.error('恢复登录态失败', error);
        clearToken();
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const loginStaff = useCallback(async (username: string, password: string, tenantCode?: string) => {
    const res = await api.post<{ token: string; user: unknown }>('/auth/login', {
      username,
      password,
      tenantCode: tenantCode || undefined,
    });
    setToken(res.token);
    const data = await api.get<MeInfo>('/auth/me');
    setMe(data);
  }, []);

  const loginPlatform = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: unknown }>('/auth/platform/login', { username, password });
    setToken(res.token);
    const data = await api.get<MeInfo>('/auth/me');
    setMe(data);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setMe(null);
    location.href = '/login';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ me, loading, isPlatform: me?.type === 'platform', loginStaff, loginPlatform, refresh, logout }),
    [me, loading, loginStaff, loginPlatform, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
