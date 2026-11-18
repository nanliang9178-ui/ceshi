export function fen(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value as number)) return '0.00';
  return (Math.round(value) / 100).toFixed(2);
}

export function yuan(value?: number | null): string {
  if (!value) return '0';
  const num = Math.round(value) / 100;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function specTextOf(
  groups: Array<{ name: string; options: Array<{ name: string; priceDelta: number; id: string }> }>,
  selectedIds: string[],
): string {
  return groups
    .map((group) => {
      const names = group.options.filter((option) => selectedIds.indexOf(option.id) >= 0).map((option) => option.name);
      return names.length ? `${group.name}:${names.join('+')}` : '';
    })
    .filter(Boolean)
    .join(' / ');
}

export function timeAgo(input?: string | null): string {
  if (!input) return '';
  const diff = Date.now() - new Date(input).getTime();
  const minute = 60 * 1000;
  if (diff < minute) return '刚刚';
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} 小时前`;
  return `${Math.floor(diff / (24 * 60 * minute))} 天前`;
}

export function formatTime(input?: string | null): string {
  if (!input) return '';
  const date = new Date(input);
  const hh = `0${date.getHours()}`.slice(-2);
  const mm = `0${date.getMinutes()}`.slice(-2);
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

export function isToday(input?: string | null): boolean {
  if (!input) return false;
  const date = new Date(input);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export const ORDER_STATUS_TEXT: Record<string, string> = {
  UNPAID: '待支付',
  PENDING: '已下单，等待接单',
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
