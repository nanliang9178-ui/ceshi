/**
 * 全局枚举与状态常量
 * 说明：数据库使用字符串存储（兼容 SQLite / MySQL），类型层面强约束。
 */

export const OrderStatus = {
  /** 已下单未支付 */
  UNPAID: 'UNPAID',
  /** 已支付待接单 */
  PENDING: 'PENDING',
  /** 已接单制作中 */
  PREPARING: 'PREPARING',
  /** 已出餐待取餐/待上菜 */
  READY: 'READY',
  /** 已完成 */
  COMPLETED: 'COMPLETED',
  /** 已取消 */
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PayStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  REFUNDING: 'REFUNDING',
  REFUNDED: 'REFUNDED',
  CLOSED: 'CLOSED',
} as const;
export type PayStatus = (typeof PayStatus)[keyof typeof PayStatus];

export const OrderType = {
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const StaffRole = {
  /** 商户老板：全部权限 */
  OWNER: 'OWNER',
  /** 店长：除支付配置/员工外 */
  MANAGER: 'MANAGER',
  /** 店员：订单与菜品估清 */
  STAFF: 'STAFF',
  /** 平台运营 */
  PLATFORM: 'PLATFORM',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const ProductStatus = {
  ON: 'ON',
  OFF: 'OFF',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const RefundStatus = {
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const PAY_CHANNEL = {
  WECHAT: 'WECHAT',
  MOCK: 'MOCK',
} as const;
export type PayChannel = (typeof PAY_CHANNEL)[keyof typeof PAY_CHANNEL];

export const ORDER_STATUS_TEXT: Record<string, string> = {
  UNPAID: '待支付',
  PENDING: '待接单',
  PREPARING: '制作中',
  READY: '待取餐',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export const PAY_STATUS_TEXT: Record<string, string> = {
  UNPAID: '未支付',
  PAID: '已支付',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  CLOSED: '已关闭',
};

export const STAFF_ROLE_TEXT: Record<string, string> = {
  OWNER: '老板',
  MANAGER: '店长',
  STAFF: '店员',
  PLATFORM: '平台运营',
};
