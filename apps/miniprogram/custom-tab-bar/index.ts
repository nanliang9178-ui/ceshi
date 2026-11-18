import { getBoot } from '../utils/session';

Component({
  data: {
    selected: 0,
    theme: '#FF5A1F',
    cartCount: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/menu/index', text: '点单', icon: 'cup' },
      { pagePath: '/pages/orders/index', text: '订单', icon: 'list' },
      { pagePath: '/pages/mine/index', text: '我的', icon: 'user' },
    ],
  },

  lifetimes: {
    attached() {
      const boot = getBoot();
      if (boot && boot.brand) {
        this.setData({ theme: boot.brand.primaryColor || '#FF5A1F' });
      }
    },
  },

  methods: {
    switchTab(e: any) {
      const index = Number(e.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) return;
      if (index === this.data.selected) return;
      wx.switchTab({ url: item.pagePath });
    },
  },
});
