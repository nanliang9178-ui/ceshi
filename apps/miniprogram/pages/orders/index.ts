import { http } from '../../utils/request';
import { ensureLogin, getBoot } from '../../utils/session';
import { fen, timeAgo, ORDER_STATUS_TEXT } from '../../utils/format';
import { go, syncTabBar, toast } from '../../utils/ui';

const ACTIVE = ['UNPAID', 'PENDING', 'PREPARING', 'READY'];

Page({
  data: {
    theme: '#FF5A1F',
    tab: 'active',
    list: [] as any[],
    all: [] as any[],
    loading: true,
    error: '',
  },

  onLoad() {
    const boot = getBoot();
    this.setData({ theme: (boot && boot.brand && boot.brand.primaryColor) || '#FF5A1F' });
    this.load();
  },

  onShow() {
    syncTabBar(this, 2);
    if (this.data.all.length) this.load(true);
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load(silent = false) {
    if (!silent) this.setData({ loading: true, error: '' });
    return ensureLogin()
      .then(() => http.get<{ list: any[] }>('/client/orders', { page: 1, pageSize: 50 }, true))
      .then((data) => {
        const all = (data.list || []).map((order) => ({
          ...order,
          statusLabel: ORDER_STATUS_TEXT[order.status] || order.status,
          totalText: fen(order.totalAmount),
          timeText: timeAgo(order.createdAt),
          summaryText: order.items
            .slice(0, 3)
            .map((item: any) => `${item.productName}×${item.quantity}`)
            .join('、'),
          isActive: ACTIVE.indexOf(order.status) >= 0,
          isTakeaway: order.type === 'TAKEAWAY',
          isDelivery: order.type === 'DELIVERY',
          placeText: order.type === 'DELIVERY' ? '外卖' : order.tableName || (order.type === 'TAKEAWAY' ? '自取' : '堂食'),
        }));
        this.setData({ all, loading: false }, () => this.applyTab());
      })
      .catch((error) => {
        this.setData({ loading: false, error: (error && error.message) || '加载失败' });
      });
  },

  applyTab() {
    const tab = this.data.tab;
    this.setData({
      list: tab === 'active' ? this.data.all.filter((order) => order.isActive) : this.data.all,
    });
  },

  switchTab(e: any) {
    this.setData({ tab: e.currentTarget.dataset.tab }, () => this.applyTab());
  },

  openOrder(e: any) {
    const id = e.currentTarget.dataset.id;
    go(`/pages/order-detail/index?id=${id}`);
  },

  goMenu() {
    go('/pages/menu/index');
  },

  retry() {
    this.load();
  },
});
