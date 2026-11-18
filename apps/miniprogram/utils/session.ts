import { DEFAULT_TENANT_CODE, STORAGE_KEYS } from './env';
import { http, getToken, setToken, clearToken } from './request';

export interface BrandInfo {
  logoUrl: string;
  coverUrl: string;
  primaryColor: string;
  accentColor: string;
  slogan: string;
  announcement: string;
  servicePhone: string;
  copyright: string;
  banners: Array<{ url: string; link?: string }>;
}

export interface BootData {
  tenant: { id: string; code: string; name: string };
  brand: BrandInfo;
  store: {
    id: string;
    name: string;
    address: string;
    phone: string;
    businessHours: string;
    openStatus: boolean;
    packingFee: number;
    minOrderAmount: number;
    deliveryFee: number;
    deliveryMinAmount: number;
    deliveryRange: string;
    deliveryEta: number;
    fullReduceThreshold: number;
    fullReduceAmount: number;
    notice: string;
  } | null;
  table: { id: string; name: string; area: string; seats: number; sceneCode: string } | null;
  wechat: { appId: string; mock: boolean };
}

let cachedBoot: BootData | null = null;
let bootPromise: Promise<BootData> | null = null;
let loginPromise: Promise<string> | null = null;
let currentScene = '';

export function setScene(scene: string): void {
  currentScene = scene || '';
}

export function getScene(): string {
  return currentScene;
}

export function getTenantCode(): string {
  return wx.getStorageSync(STORAGE_KEYS.tenantCode) || DEFAULT_TENANT_CODE;
}

export function setTenantCode(code: string): void {
  if (code) wx.setStorageSync(STORAGE_KEYS.tenantCode, code);
}

export function getBoot(): BootData | null {
  return cachedBoot;
}

/** 拉取品牌 / 门店 / 桌号配置（白标核心） */
export function loadBoot(force = false): Promise<BootData> {
  if (!force && cachedBoot && !currentScene) return Promise.resolve(cachedBoot);
  if (!force && bootPromise) return bootPromise;

  bootPromise = http
    .get<BootData>('/client/bootstrap', { tenantCode: getTenantCode(), scene: currentScene || undefined }, true)
    .then((data) => {
      const previous = wx.getStorageSync(STORAGE_KEYS.tenantCode);
      cachedBoot = data;
      setTenantCode(data.tenant.code);
      // 换了门店：清空上一家店的购物车，避免把 A 店菜品下到 B 店
      if (previous && previous !== data.tenant.code) {
        wx.removeStorageSync(STORAGE_KEYS.cart);
      }
      applyBrand(data);
      return data;
    })
    .catch((error) => {
      bootPromise = null;
      throw error;
    });

  return bootPromise;
}

/** 品牌色写入导航栏，页面内使用 CSS 变量 */
export function applyBrand(boot: BootData): void {
  const brand = boot.brand;
  if (!brand) return;
  wx.setNavigationBarTitle({ title: boot.store?.name || boot.tenant.name || '扫码点单' });
  wx.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: '#FBF7F2',
    animation: { duration: 200, timingFunc: 'easeIn' },
  });
}

/** 静默登录：wx.login → 后端换 openid → 本地 token */
export function ensureLogin(force = false): Promise<string> {
  const token = getToken();
  if (token && !force) return Promise.resolve(token);
  if (loginPromise) return loginPromise;

  loginPromise = new Promise<string>((resolve, reject) => {
    wx.login({
      success(loginRes: any) {
        if (!loginRes.code) {
          reject(new Error('微信登录失败，请重试'));
          return;
        }
        http
          .post<{ token: string; mock: boolean; customer: any }>(
            '/client/login',
            { tenantCode: getTenantCode(), code: loginRes.code },
            true,
          )
          .then((data) => {
            setToken(data.token);
            wx.setStorageSync(STORAGE_KEYS.customer, data.customer || {});
            resolve(data.token);
          })
          .catch(reject);
      },
      fail() {
        reject(new Error('微信登录失败，请检查网络'));
      },
    });
  }).finally(() => {
    loginPromise = null;
  }) as Promise<string>;

  return loginPromise;
}

export function logoutLocal(): void {
  clearToken();
  cachedBoot = null;
  bootPromise = null;
  wx.removeStorageSync(STORAGE_KEYS.customer);
}

export function getCustomer(): { nickname?: string; phone?: string; avatarUrl?: string } {
  return wx.getStorageSync(STORAGE_KEYS.customer) || {};
}

export function resetBootCache(): void {
  cachedBoot = null;
  bootPromise = null;
}
