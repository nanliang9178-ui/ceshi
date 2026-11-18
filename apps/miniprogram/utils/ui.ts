export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none', duration = 2000): void {
  wx.showToast({ title, icon: icon === 'error' ? 'none' : icon, duration });
}

export function loading(title = '加载中'): void {
  wx.showLoading({ title, mask: true });
}

export function hideLoading(): void {
  wx.hideLoading();
}

export function confirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#FF5A1F',
      cancelColor: '#9E9E9E',
      success(res: any) {
        resolve(Boolean(res.confirm));
      },
      fail() {
        resolve(false);
      },
    });
  });
}

export function call(phone: string): void {
  if (!phone) {
    toast('商家暂未留电话');
    return;
  }
  wx.makePhoneCall({ phoneNumber: phone, fail: () => undefined });
}

export function previewImage(url: string): void {
  if (!url) return;
  wx.previewImage({ current: url, urls: [url] });
}

export function copy(text: string, tip = '已复制'): void {
  wx.setClipboardData({
    data: text,
    success: () => toast(tip),
  });
}

/** 底部 tab 页，只能用 switchTab 跳转 */
export const TAB_PAGES = [
  '/pages/index/index',
  '/pages/menu/index',
  '/pages/orders/index',
  '/pages/mine/index',
];

/** 页面跳转封装：自动识别 tab 页并处理层级过深 */
export function go(url: string): void {
  const path = url.split('?')[0];
  if (TAB_PAGES.indexOf(path) >= 0) {
    wx.switchTab({ url: path });
    return;
  }
  const pages = getCurrentPages();
  if (pages.length >= 9 && url.indexOf('/pages/') === 0) {
    wx.redirectTo({ url });
    return;
  }
  wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) });
}

/** 供 tab 页面在 onShow 时同步高亮 */
export function syncTabBar(page: any, index: number): void {
  if (typeof page.getTabBar !== 'function') return;
  const tabBar = page.getTabBar();
  if (!tabBar) return;
  const boot = getApp().globalData.boot;
  tabBar.setData({
    selected: index,
    theme: (boot && boot.brand && boot.brand.primaryColor) || '#FF5A1F',
  });
}
