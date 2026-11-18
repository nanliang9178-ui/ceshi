import { API_BASE, STORAGE_KEYS } from './env';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string {
  return wx.getStorageSync(STORAGE_KEYS.token) || '';
}

export function setToken(token: string): void {
  wx.setStorageSync(STORAGE_KEYS.token, token);
}

export function clearToken(): void {
  wx.removeStorageSync(STORAGE_KEYS.token);
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, any>;
  /** 是否携带登录态，默认 true */
  auth?: boolean;
  /** 静默模式：不弹出错误提示 */
  silence?: boolean;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = true, silence = false } = options;

  return new Promise<T>((resolve, reject) => {
    const header: Record<string, string> = { 'content-type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) header.Authorization = `Bearer ${token}`;
    }

    wx.request({
      url: `${API_BASE}${url}`,
      method,
      data,
      header,
      timeout: 15000,
      success(res: any) {
        const body = res.data || {};
        const ok = res.statusCode >= 200 && res.statusCode < 300 && (body.code === 0 || body.code === undefined);

        if (ok) {
          resolve(body.data as T);
          return;
        }

        const message = body.message || '请求失败，请稍后重试';
        if (res.statusCode === 401) {
          clearToken();
          if (!silence) wx.showToast({ title: '登录已过期，请重新进入', icon: 'none' });
        } else if (!silence) {
          wx.showToast({ title: message, icon: 'none', duration: 2200 });
        }
        reject(new ApiError(message, res.statusCode));
      },
      fail(err: any) {
        const message = err && err.errMsg && err.errMsg.indexOf('timeout') >= 0 ? '网络超时，请重试' : '网络异常，请检查网络后重试';
        if (!silence) wx.showToast({ title: message, icon: 'none' });
        reject(new ApiError(message, 0));
      },
    });
  });
}

export const http = {
  get: <T = any>(url: string, params?: Record<string, any>, silence = false) => {
    let query = '';
    if (params) {
      const parts: string[] = [];
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
      });
      if (parts.length) query = `?${parts.join('&')}`;
    }
    return request<T>({ url: `${url}${query}`, silence });
  },
  post: <T = any>(url: string, data?: Record<string, any>, silence = false) =>
    request<T>({ url, method: 'POST', data, silence }),
  put: <T = any>(url: string, data?: Record<string, any>, silence = false) =>
    request<T>({ url, method: 'PUT', data, silence }),
};
