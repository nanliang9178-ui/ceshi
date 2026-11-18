import { loadBoot, ensureLogin, BootData } from '../../utils/session';
import { http } from '../../utils/request';
import { call, go, syncTabBar, toast } from '../../utils/ui';
import { fen } from '../../utils/format';

interface SignatureVM {
  id: string;
  name: string;
  imageUrl: string;
  priceText: string;
  tags: string[];
}

Page({
  data: {
    boot: null as BootData | null,
    loading: true,
    error: '',
    theme: '#FF5A1F',
    slogan: '',
    announcement: '',
    banners: [] as Array<{ url: string }>,
    storeOpen: true,
    tableName: '',
    hasTable: false,
    activeBanner: 0,
    initial: '枢',
    signature: [] as SignatureVM[],
    deliveryText: '',
    deliveryFeeText: '',
    fullReduceText: '',
    orderCount: 0,
  },

  onLoad() {
    this.refresh();
    ensureLogin().catch(() => undefined);
  },

  onShow() {
    syncTabBar(this, 0);
    const boot = getApp().globalData.boot as BootData | null;
    if (boot && this.data.boot) this.apply(boot);
  },

  onPullDownRefresh() {
    this.refresh();
  },

  refresh() {
    this.setData({ loading: true, error: '' });
    loadBoot(true)
      .then((boot) => {
        this.apply(boot);
        return http.get<any[]>('/client/menu', { tenantCode: boot.tenant.code }, true);
      })
      .then((menu) => {
        const products: any[] = [];
        (menu || []).forEach((category: any) => {
          (category.products || []).forEach((product: any) => {
            if (!product.soldOut) products.push(product);
          });
        });
        const marked = products.filter((product) => (product.tags || []).length > 0);
        const picked = (marked.length >= 3 ? marked : products).slice(0, 6);
        this.setData({
          signature: picked.map((product) => ({
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl || '',
            priceText: fen(product.price),
            tags: product.tags || [],
          })),
          orderCount: products.length,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        wx.stopPullDownRefresh();
      });
  },

  apply(boot: BootData) {
    getApp().globalData.boot = boot;
    getApp().globalData.ready = true;
    const store = boot.store;
    this.setData({
      boot,
      loading: false,
      error: '',
      theme: (boot.brand && boot.brand.primaryColor) || '#FF5A1F',
      slogan: (boot.brand && boot.brand.slogan) || '',
      announcement: (boot.brand && boot.brand.announcement) || '',
      banners: ((boot.brand && boot.brand.banners) || []).slice(0, 3),
      storeOpen: store ? store.openStatus : true,
      hasTable: Boolean(boot.table),
      tableName: boot.table ? `${boot.table.area} ${boot.table.name}` : '',
      initial: (boot.tenant.name || '枢').slice(0, 1),
      deliveryText: store && store.deliveryRange ? store.deliveryRange : '支持外卖配送',
      deliveryFeeText: store ? (store.deliveryFee > 0 ? `配送费 ¥${fen(store.deliveryFee)}` : '免配送费') : '',
      fullReduceText:
        store && store.fullReduceThreshold > 0
          ? `满 ${Math.round(store.fullReduceThreshold / 100)} 减 ${Math.round(store.fullReduceAmount / 100)}`
          : '',
    });
    wx.setNavigationBarTitle({ title: store ? store.name : '扫码点单' });
    syncTabBar(this, 0);
  },

  startOrder(e: any) {
    const type = (e && e.currentTarget && e.currentTarget.dataset.type) || (this.data.hasTable ? 'DINE_IN' : 'DELIVERY');
    if (type === 'DINE_IN' && !this.data.hasTable) {
      toast('堂食请扫描桌面上的点单码');
      return;
    }
    if (!this.data.storeOpen) {
      toast('门店休息中，可先浏览菜单');
    }
    // tab 页不能带参数，用全局变量传递用餐方式
    getApp().globalData.pendingOrderType = type;
    go('/pages/menu/index');
  },

  goOrders() {
    go('/pages/orders/index');
  },

  goMine() {
    go('/pages/mine/index');
  },

  callShop() {
    const boot = this.data.boot;
    call((boot && (boot.store ? boot.store.phone : boot.brand.servicePhone)) || '');
  },

  onBannerChange(e: any) {
    this.setData({ activeBanner: e.detail.current || 0 });
  },

  previewBanner(e: any) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },

  onShareAppMessage() {
    const boot = this.data.boot;
    return {
      title: boot ? `${boot.store ? boot.store.name : boot.tenant.name} 扫码点单` : '扫码点单',
      path: '/pages/index/index',
    };
  },
});
