/**
 * 环境配置
 * 白标发布：改这里 + 后台「品牌白标」即可，无需改动业务代码。
 */

/**
 * 后端 API 地址
 *
 * 当前为「局域网调试」地址：电脑和手机连同一个 Wi-Fi 时，真机预览即可访问。
 * - 换电脑 / 换网络后 IP 会变，重新用 ipconfig 查 WLAN 的 IPv4 再改这里
 * - 只用电脑上的开发者工具模拟器调试时，可改回 'http://localhost:3000/api'
 * - 对外发布时必须改成已备案的 https 域名，例如 'https://order.example.com/api'
 */
export const API_BASE = 'http://192.168.137.151:3000/api';

/** 未扫码进入时使用的默认商户编码（编译期可替换） */
export const DEFAULT_TENANT_CODE = 'demo';

/** 门店信息兜底展示 */
export const FALLBACK_TENANT_NAME = '天枢点单';

export const STORAGE_KEYS = {
  token: 'ts_mp_token',
  tenantCode: 'ts_mp_tenant',
  cart: 'ts_mp_cart',
  customer: 'ts_mp_customer',
  recentOrder: 'ts_mp_recent_order',
};
