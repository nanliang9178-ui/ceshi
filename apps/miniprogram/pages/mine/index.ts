import { http } from '../../utils/request';
import { ensureLogin, getBoot, getCustomer, logoutLocal, resetBootCache } from '../../utils/session';
import { call, go, syncTabBar, toast } from '../../utils/ui';

Page({
  data: {
    theme: '#FF5A1F',
    shopName: '',
    logoUrl: '',
    customer: {} as any,
    avatarText: '客',
    phoneMasked: '',
    copyright: '',
    servicePhone: '',
    activeCount: 0,
  },

  onLoad() {
    this.apply();
  },

  onShow() {
    syncTabBar(this, 3);
    this.apply();
    this.loadActive();
  },

  apply() {
    const boot = getBoot();
    const customer = getCustomer();
    const phone = customer.phone || '';
    this.setData({
      theme: (boot && boot.brand && boot.brand.primaryColor) || '#FF5A1F',
      shopName: (boot && boot.store && boot.store.name) || (boot && boot.tenant.name) || '天枢点单',
      logoUrl: (boot && boot.brand && boot.brand.logoUrl) || '',
      copyright: (boot && boot.brand && boot.brand.copyright) || '本店由天枢点单提供技术支持',
      servicePhone: (boot && boot.store && boot.store.phone) || (boot && boot.brand.servicePhone) || '',
      customer,
      avatarText: (customer.nickname || '客').slice(0, 1),
      phoneMasked: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '',
    });
  },

  loadActive() {
    ensureLogin()
      .then(() => http.get<any>('/client/orders/active', undefined, true))
      .then((order) => this.setData({ activeCount: order ? 1 : 0 }))
      .catch(() => undefined);
  },

  bindPhone(e: any) {
    const code = e.detail && e.detail.code;
    if (!code) {
      toast('已取消授权');
      return;
    }
    wx.showLoading({ title: '绑定中', mask: true });
    ensureLogin()
      .then(() => http.post<{ phone: string }>('/client/phone', { code }))
      .then((data) => {
        wx.hideLoading();
        const customer = { ...this.data.customer, phone: data.phone };
        wx.setStorageSync('ts_mp_customer', customer);
        this.setData({
          customer,
          phoneMasked: data.phone ? `${data.phone.slice(0, 3)}****${data.phone.slice(-4)}` : '',
        });
        toast('手机号已绑定', 'success');
      })
      .catch((error) => {
        wx.hideLoading();
        toast((error && error.message) || '绑定失败');
      });
  },

  goOrders() {
    go('/pages/orders/index');
  },

  goMenu() {
    go('/pages/menu/index');
  },

  callShop() {
    call(this.data.servicePhone);
  },

  about() {
    wx.showModal({
      title: '关于天枢点单',
      content:
        '本小程序由「天枢点单」提供技术支持。\n\n扫码点单 · 微信支付 · 后厨直连\n如需为您的门店开通，请联系服务商。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#FF5A1F',
    });
  },

  clearCache() {
    wx.showModal({
      title: '清除本地缓存',
      content: '将清除登录信息与购物车，下次进入会重新登录。',
      confirmColor: '#FF5A1F',
      success: (res: any) => {
        if (!res.confirm) return;
        logoutLocal();
        resetBootCache();
        wx.removeStorageSync('ts_mp_cart');
        toast('已清除，正在重新加载', 'success');
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 800);
      },
    });
  },
});
