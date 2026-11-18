const BASE = '/api';
export const TOKEN_KEY = 'ts_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (res.status === 401) {
    clearToken();
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  }
  if (!res.ok || (json.code !== undefined && json.code !== 0)) {
    throw new ApiError(json.message || `请求失败（${res.status}）`, res.status);
  }
  return json.data as T;
}

type Params = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, params?: Params): string {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>(withQuery(path, params)),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async (file: File, scope = 'image'): Promise<{ url: string; absoluteUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string; absoluteUrl: string }>(`/admin/upload?scope=${scope}`, {
      method: 'POST',
      body: form,
    });
  },
};
