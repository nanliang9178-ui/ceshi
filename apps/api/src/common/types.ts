export interface AuthUser {
  /** 账号 id */
  sub: string;
  /** staff | platform | customer */
  type: 'staff' | 'platform' | 'customer';
  tenantId?: string;
  storeId?: string;
  role: string;
  name: string;
  username?: string;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
