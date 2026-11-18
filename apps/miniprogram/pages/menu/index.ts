import { loadBoot, ensureLogin, BootData } from '../../utils/session';
import { http } from '../../utils/request';
import { addItem, changeQuantity, clearCart, getSummary, subscribe, CartSummary } from '../../utils/cart';
import { fen, yuan } from '../../utils/format';
import { confirm, go, syncTabBar, toast } from '../../utils/ui';

interface ProductVM {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  priceText: string;
  originalPriceText: string;
  soldOut: boolean;
  specGroups: any[];
  specPreview: string[];
  tags: string[];
  monthlySales: number;
  count: number;
}

interface CategoryVM {
  id: string;
  name: string;
  icon: string;
  promoLabel: string;
  promoTitle: string;
  products: ProductVM[];
}

Page({
  data: {
    boot: null as BootData | null,
    loading: true,
    error: '',
    theme: '#FF5A1F',
    categories: [] as CategoryVM[],
    activeId: '',
    current: null as CategoryVM | null,
    counts: {} as Record<string, number>,
    cart: { count: 0, amount: 0, items: [] } as CartSummary,
    cartItems: [] as Array<{ key: string; name: string; imageUrl: string; specText: string; quantity: number; priceText: string }>,
    cartAmountText: '0.00',
    cartVisible: false,
    specShow: false,
    specProduct: null as any,
    hasTable: false,
    tableName: '',
    storeOpen: true,
    storeName: '',
    orderType: 'DINE_IN',
    modeHint: '',
    storeNotice: '',
    reduceText: '',
    bannerUrl: '',
    minOrderText: '',
  },

  unsubscribe: null as null | (() => void),

  onLoad(query: any) {
    const app = getApp();
    const pending = app.globalData.pendingOrderType;
    const type =
      query && query.type ? (query.type === 'DELIVERY' ? 'DELIVERY' : 'DINE_IN') : pending === 'DELIVERY' ? 'DELIVERY' : pending === 'DINE_IN' ? 'DINE_IN' : '';
    app.globalData.pendingOrderType = '';
    this.setData({ orderType: type });
    this.unsubscribe = subscribe((summary) => this.syncCart(summary));
    this.init();
  },

  onShow() {
    syncTabBar(this, 1);
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
  },

  init() {
    this.setData({ loading: true, error: '' });
    loadBoot(true)
      .then((boot) => {
        const hasTable = Boolean(boot.table);
        const store = boot.store;
        let orderType = this.data.orderType || (hasTable ? 'DINE_IN' : 'DELIVERY');
        if (!hasTable && orderType === 'DINE_IN') orderType = 'DELIVERY';
        this.setData({
          boot,
          theme: (boot.brand && boot.brand.primaryColor) || '#FF5A1F',
          hasTable,
          tableName: boot.table ? `${boot.table.area} · ${boot.table.name}` : '未识别桌号',
          storeOpen: store ? store.openStatus : true,
          storeName: (store && store.name) || boot.tenant.name,
          orderType,
          modeHint:
            orderType === 'DELIVERY'
              ? store && store.deliveryRange
                ? store.deliveryRange
                : '配送到家'
              : hasTable
                ? `送至 ${boot.table!.area} ${boot.table!.name} 桌`
                : '请扫描桌码',
          storeNotice: (store && store.notice) || '',
          reduceText:
            store && store.fullReduceThreshold > 0
              ? `满 ${yuan(store.fullReduceThreshold)} 减 ${yuan(store.fullReduceAmount)}`
              : '',
          minOrderText:
            orderType === 'DELIVERY' && store && store.deliveryMinAmount > 0
              ? `¥${yuan(store.deliveryMinAmount)} 起送`
              : '',
          bannerUrl: (boot.brand && boot.brand.banners && boot.brand.banners[0] && boot.brand.banners[0].url) || '',
        });
        wx.setNavigationBarTitle({ title: '点单' });
        syncTabBar(this, 1);
        return http.get<any[]>('/client/menu', {
          tenantCode: boot.tenant.code,
          scene: boot.table ? boot.table.sceneCode : undefined,
        });
      })
      .then((menu) => {
        const categories: CategoryVM[] = (menu || []).map((category: any) => ({
          id: category.id,
          name: category.name,
          icon: category.icon || '',
          promoLabel: category.promoLabel || '',
          promoTitle: category.promoTitle || '',
          products: (category.products || []).map((product: any) => this.toVM(product)),
        }));
        const activeId = categories.length ? categories[0].id : '';
        this.setData(
          {
            categories,
            activeId,
            current: categories.find((item) => item.id === activeId) || null,
            loading: false,
          },
          () => this.syncCounts(),
        );
      })
      .catch((error) => {
        this.setData({ error: (error && error.message) || '菜单加载失败', loading: false });
      });

    ensureLogin().catch(() => undefined);
  },

  toVM(product: any): ProductVM {
    const preview: string[] = [];
    (product.specGroups || []).forEach((group: any) => {
      (group.options || []).forEach((option: any) => {
        if (preview.length < 3 && option.name && preview.indexOf(option.name) < 0) preview.push(option.name);
      });
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      price: product.price,
      priceText: fen(product.price),
      originalPriceText: product.originalPrice ? fen(product.originalPrice) : '',
      soldOut: Boolean(product.soldOut),
      specGroups: product.specGroups || [],
      specPreview: preview,
      tags: product.tags || [],
      monthlySales: product.monthlySales || 0,
      count: 0,
    };
  },

  syncCart(summary: CartSummary) {
    this.setData({
      cart: summary,
      cartItems: summary.items.map((item) => ({
        key: item.key,
        name: item.name,
        imageUrl: item.imageUrl,
        specText: item.specText,
        quantity: item.quantity,
        priceText: fen(item.unitPrice),
      })),
      cartAmountText: fen(summary.amount),
    });
    this.syncCounts();
  },

  syncCounts() {
    const counts: Record<string, number> = {};
    (this.data.cart.items || []).forEach((item) => {
      counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
    });
    this.setData({ counts });
  },

  selectCategory(e: any) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeId) return;
    const current = this.data.categories.find((item) => item.id === id) || null;
    this.setData({ activeId: id, current });
    wx.vibrateShort({ type: 'light' });
  },

  switchType(e: any) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.orderType) return;
    if (type === 'DINE_IN' && !this.data.hasTable) {
      toast('堂食请扫描桌面上的点单码');
      return;
    }
    const boot = this.data.boot;
    const store = boot && boot.store;
    this.setData({
      orderType: type,
      modeHint:
        type === 'DELIVERY'
          ? store && store.deliveryRange
            ? store.deliveryRange
            : '配送到家'
          : boot && boot.table
            ? `送至 ${boot.table.area} ${boot.table.name} 桌`
            : '请扫描桌码',
      minOrderText:
        type === 'DELIVERY' && store && store.deliveryMinAmount > 0 ? `¥${yuan(store.deliveryMinAmount)} 起送` : '',
    });
  },

  onAdd(e: any) {
    const id = e.currentTarget.dataset.id;
    const product = this.findProduct(id);
    if (!product) return;
    if (product.soldOut) {
      toast('该菜品已售罄');
      return;
    }
    if (!this.data.storeOpen) {
      toast('门店休息中，暂不接单');
      return;
    }

    if (product.specGroups && product.specGroups.length > 0) {
      this.setData({ specProduct: product, specShow: true });
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: product.price,
      basePrice: product.price,
      specOptionIds: [],
      specText: '',
    });
  },

  onSpecConfirm(e: any) {
    const detail = e.detail;
    addItem({
      productId: detail.productId,
      name: detail.name,
      imageUrl: detail.imageUrl,
      unitPrice: detail.unitPrice,
      basePrice: detail.basePrice,
      specOptionIds: detail.specOptionIds,
      specText: detail.specText,
      quantity: detail.quantity,
    });
  },

  onSpecClose() {
    this.setData({ specShow: false });
  },

  findProduct(id: string): ProductVM | null {
    for (const category of this.data.categories) {
      const found = category.products.find((product) => product.id === id);
      if (found) return found;
    }
    return null;
  },

  toggleCart() {
    if (this.data.cart.count === 0) return;
    this.setData({ cartVisible: !this.data.cartVisible });
  },

  closeCart() {
    this.setData({ cartVisible: false });
  },

  noop() {},

  onCartInc(e: any) {
    changeQuantity(e.currentTarget.dataset.key, 1);
  },

  onCartDec(e: any) {
    changeQuantity(e.currentTarget.dataset.key, -1);
  },

  async onClear() {
    const ok = await confirm('确定清空购物车吗？');
    if (ok) clearCart();
  },

  goCheckout() {
    if (this.data.cart.count === 0) {
      toast('请先选择菜品');
      return;
    }
    if (!this.data.storeOpen) {
      toast('门店休息中，暂不接单');
      return;
    }
    this.closeCart();
    go(`/pages/checkout/index?type=${this.data.orderType}`);
  },

  goOrders() {
    go('/pages/orders/index');
  },

  callShop() {
    const boot = this.data.boot;
    if (boot && boot.store && boot.store.phone) {
      wx.makePhoneCall({ phoneNumber: boot.store.phone, fail: () => undefined });
    } else {
      toast('商家暂未留电话');
    }
  },
});
