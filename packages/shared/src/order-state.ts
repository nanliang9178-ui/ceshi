import { OrderStatus } from './enums';

/**
 * 订单状态机 —— 全系统唯一的状态流转真理来源
 * 后端服务与前端状态按钮都由这里派生，避免两端判断不一致。
 */
const TRANSITIONS: Record<string, string[]> = {
  UNPAID: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  PENDING: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

const APPENDABLE: string[] = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY];
const REFUNDABLE: string[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];
const CUSTOMER_CANCELLABLE: string[] = [OrderStatus.UNPAID, OrderStatus.PENDING];

export const ORDER_FLOW: string[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

export function canTransition(from: string, to: string): boolean {
  const list = TRANSITIONS[from];
  if (!list) return false;
  return list.indexOf(to) !== -1;
}

export function nextStatuses(from: string): string[] {
  return TRANSITIONS[from] ? [...TRANSITIONS[from]] : [];
}

/** 订单进入该状态后是否仍可追加菜品 */
export function canAppendItems(status: string): boolean {
  return APPENDABLE.indexOf(status) !== -1;
}

/** 该状态下是否允许退款 */
export function canRefund(status: string): boolean {
  return REFUNDABLE.indexOf(status) !== -1;
}

/** 该状态下顾客是否可自行取消 */
export function canCustomerCancel(status: string): boolean {
  return CUSTOMER_CANCELLABLE.indexOf(status) !== -1;
}
