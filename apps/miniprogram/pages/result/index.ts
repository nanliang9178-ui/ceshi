import { http } from '../../utils/request';
import { getBoot } from '../../utils/session';
import { fen, formatTime } from '../../utils/format';
import { go } from '../../utils/ui';

Page({
  data: {
    id: '',
    order: null as any,
    theme: '#FF5A1F',
    totalText: '0.00',
    loading: true,
    isTakeaway: false,
    isDelivery: false,
    etaText: '30',
    createdText: '',
  },

  onLoad(query: any) {
    const boot = getBoot();
    this.setData({
      id: (query && query.id) || '',
      theme: (boot && boot.brand && boot.brand.primaryColor) || '#FF5A1F',
    });
    this.load();
  },

  load() {
    if (!this.data.id) {
      wx.redirectTo({ url: '/pages/orders/index' });
      return;
    }
    http
      .get<any>(`/client/orders/${this.data.id}`, undefined, true)
      .then((order) => {
        this.setData({
          order,
          loading: false,
          totalText: fen(order.totalAmount),
          isTakeaway: order.type === 'TAKEAWAY',
          isDelivery: order.type === 'DELIVERY',
          etaText: String(order.deliveryEta || 30),
          createdText: formatTime(order.createdAt),
        });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  goDetail() {
    wx.redirectTo({ url: `/pages/order-detail/index?id=${this.data.id}` });
  },

  goMenu() {
    go('/pages/menu/index');
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/orders/index' });
  },
});
