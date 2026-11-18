export const ORDER_STATUS_META: Record<string, { text: string; tone: string }> = {
  UNPAID: { text: '待支付', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PENDING: { text: '待接单', tone: 'bg-brand-50 text-brand-700 ring-brand-200' },
  PREPARING: { text: '制作中', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  READY: { text: '待取餐', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED: { text: '已完成', tone: 'bg-ink-900/5 text-ink-600 ring-ink-900/10' },
  CANCELLED: { text: '已取消', tone: 'bg-red-50 text-red-600 ring-red-200' },
};

export const PAY_STATUS_META: Record<string, { text: string; tone: string }> = {
  UNPAID: { text: '未支付', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PAID: { text: '已支付', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REFUNDING: { text: '退款中', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  REFUNDED: { text: '已退款', tone: 'bg-ink-900/5 text-ink-600 ring-ink-900/10' },
  CLOSED: { text: '已关闭', tone: 'bg-ink-900/5 text-ink-500 ring-ink-900/10' },
};

export const ROLE_TEXT: Record<string, string> = {
  OWNER: '老板',
  MANAGER: '店长',
  STAFF: '店员',
  PLATFORM: '平台运营',
};

export const PLAN_TEXT: Record<string, string> = {
  BASIC: '基础版',
  PRO: '专业版',
  FLAGSHIP: '旗舰版',
};
