import {
  ORDER_STATUS_TEXT,
  PAY_STATUS_TEXT,
  canAppendItems,
  canCustomerCancel,
  canRefund,
  nextStatuses,
} from '@tianshu/shared';

/** 统一订单出参：前端按钮直接读 allowedActions，避免各处重复判断 */
export function serializeOrder(order: Record<string, any>): any {
  const status = order.status as string;
  const paid = order.payStatus === 'PAID';
  return {
    ...order,
    statusText: ORDER_STATUS_TEXT[status] || status,
    payStatusText: PAY_STATUS_TEXT[order.payStatus] || order.payStatus,
    itemCount: (order.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0),
    nextStatuses: nextStatuses(status),
    allowedActions: {
      accept: status === 'PENDING',
      reject: status === 'PENDING',
      ready: status === 'PREPARING',
      complete: status === 'READY',
      refund: paid && canRefund(status),
      append: paid && canAppendItems(status),
      customerCancel: canCustomerCancel(status),
      pay: status === 'UNPAID',
    },
  };
}

export function serializeOrderList(orders: Record<string, any>[]) {
  return orders.map(serializeOrder);
}
