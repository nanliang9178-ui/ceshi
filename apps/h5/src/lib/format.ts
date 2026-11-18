export function fen(value?: number | null): string {
  if (!value) return '0.00';
  return (Math.round(value) / 100).toFixed(2);
}

export function yuan(value?: number | null): string {
  if (!value) return '0';
  const num = Math.round(value) / 100;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export const ORDER_STATUS_TEXT: Record<string, string> = {
  UNPAID: '待支付',
  PENDING: '等待商家接单',
  PREPARING: '商家正在制作',
  READY: '餐品已出，请取餐',
  COMPLETED: '订单已完成',
  CANCELLED: '订单已取消',
};

export const ORDER_STATUS_DESC: Record<string, string> = {
  UNPAID: '请尽快完成支付，超时订单将自动关闭',
  PENDING: '商家即将确认，请耐心等待',
  PREPARING: '后厨正在加紧制作，约 10-15 分钟',
  READY: '请前往取餐口报取餐号取餐',
  COMPLETED: '感谢惠顾，期待下次光临',
  CANCELLED: '如有疑问请联系门店店员',
};

export function timeText(input?: string | null): string {
  if (!input) return '';
  const date = new Date(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function durationText(input?: string | null): string {
  if (!input) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(input).getTime()) / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时`;
}
