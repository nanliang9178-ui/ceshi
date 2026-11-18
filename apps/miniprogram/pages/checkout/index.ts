import { getBoot, ensureLogin, getCustomer } from '../../utils/session';
import { http } from '../../utils/request';
import { getSummary, clearCart, buildOrderItems } from '../../utils/cart';
import { fen, yuan } from '../../utils/format';
import { confirm, go, toast } from '../../utils/ui';
import { STORAGE_KEYS } from '../../utils/env';

Page({
  data: {
    theme: '#FF5A1F',
    items: [] as Array<{ key: string; name: string; imageUrl: string; specText: string; quantity: number; amountText: string }>,
    itemCount: 0,
    type: 'DINE_IN',
    hasTable: false,
    tableName: '',
    storeName: '',
    storeAddr: '',
    peopleCount: 1,
    remark: '',
    itemAmountText: '0.00',
    discountText: '0.00',
    packingText: '0.00',
    deliveryText: '0.00',
    totalText: '0.00',
    totalFen: 0,
    discountVisible: false,
    packingVisible: false,
    deliveryVisible: false,
    reduceHint: '',
    minOrderHint: '',
    deliveryRange: '',
    deliveryEta: 0,
    storeOpen: true,
    submitting: false,
    canSubmit: true,
    receiverName: '',
    receiverPhone: '',
    address: '',
    addressError: '',
  },

  onLoad(query: any) {
    const type = query && query.type === 'DELIVERY' ? 'DELIVERY' : 'DINE_IN';
    const customer = getCustomer();
    const cacheKey = 'ts_last_address';
    const cached = wx.getStorageSync(cacheKey) || {};
    this.setData({
      type,
      receiverName: cached.name || customer.nickname || '',
      receiverPhone: cached.phone || customer.phone || '',
      address: cached.address || '',
    });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const boot = getBoot();
    const summary = getSummary();

    if (!summary.items.length) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    if (!boot) {
      setTimeout(() => this.refresh(), 300);
      return;
    }

    const store = boot.store;
    const hasTable = Boolean(boot.table);
    let type = this.data.type;
    if (type === 'DINE_IN' && !hasTable) type = 'DELIVERY';

    const threshold = store ? store.fullReduceThreshold : 0;
    const reduce = store ? store.fullReduceAmount : 0;
    const discount = threshold > 0 && summary.amount >= threshold ? reduce : 0;
    const packing = type === 'TAKEAWAY' && store ? store.packingFee : 0;
    const delivery = type === 'DELIVERY' && store ? store.deliveryFee : 0;
    const total = Math.max(0, summary.amount - discount + packing + delivery);

    const minAmount = type === 'DELIVERY' && store ? store.deliveryMinAmount : store ? store.minOrderAmount : 0;
    const enough = type === 'DELIVERY' ? summary.amount >= (store ? store.deliveryMinAmount : 0) : true;

    this.setData({
      theme: (boot.brand && boot.brand.primaryColor) || '#FF5A1F',
      storeName: (store && store.name) || boot.tenant.name,
      storeAddr: (store && store.address) || '',
      hasTable,
      type,
      tableName: boot.table ? `${boot.table.area} · ${boot.table.name}` : '请扫描桌码',
      storeOpen: store ? store.openStatus : true,
      items: summary.items.map((item) => ({
        key: item.key,
        name: item.name,
        imageUrl: item.imageUrl,
        specText: item.specText,
        quantity: item.quantity,
        amountText: fen(item.unitPrice * item.quantity),
      })),
      itemCount: summary.count,
      itemAmountText: fen(summary.amount),
      discountText: fen(discount),
      packingText: fen(packing),
      deliveryText: fen(delivery),
      totalText: fen(total),
      totalFen: total,
      discountVisible: discount > 0,
      packingVisible: packing > 0,
      deliveryVisible: delivery > 0,
      reduceHint: threshold > 0 ? `满 ${yuan(threshold)} 元减 ${yuan(reduce)} 元` : '',
      minOrderHint:
        type === 'DELIVERY'
          ? store && store.deliveryMinAmount > 0
            ? `外卖满 ${yuan(store.deliveryMinAmount)} 元起送`
            : ''
          : store && store.minOrderAmount > 0
            ? `自取需满 ${yuan(store.minOrderAmount)} 元`
            : '',
      deliveryRange: (store && store.deliveryRange) || '',
      deliveryEta: (store && store.deliveryEta) || 30,
      canSubmit: Boolean(store && store.openStatus) && enough,
    });
  },

  switchType(e: any) {
    const type = e.currentTarget.dataset.type;
    if (type === 'DINE_IN' && !this.data.hasTable) {
      toast('堂食请扫描桌面上的点单码');
      return;
    }
    this.setData({ type }, () => this.refresh());
  },

  onPeopleInc() {
    if (this.data.peopleCount >= 30) return;
    this.setData({ peopleCount: this.data.peopleCount + 1 });
  },

  onPeopleDec() {
    if (this.data.peopleCount <= 1) return;
    this.setData({ peopleCount: this.data.peopleCount - 1 });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  onReceiverInput(e: any) {
    this.setData({ receiverName: e.detail.value, addressError: '' });
  },

  onPhoneInput(e: any) {
    this.setData({ receiverPhone: e.detail.value, addressError: '' });
  },

  onAddressInput(e: any) {
    this.setData({ address: e.detail.value, addressError: '' });
  },

  validateDelivery(): boolean {
    if (this.data.type !== 'DELIVERY') return true;
    const name = this.data.receiverName.trim();
    const phone = this.data.receiverPhone.trim();
    const address = this.data.address.trim();
    if (!name) {
      this.setData({ addressError: '请填写收货人' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ addressError: '请填写正确的手机号' });
      return false;
    }
    if (address.length < 5) {
      this.setData({ addressError: '请填写详细地址（不少于 5 个字）' });
      return false;
    }
    return true;
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.canSubmit) {
      toast(this.data.storeOpen ? this.data.minOrderHint || '当前不满足下单条件' : '门店休息中，暂不接单');
      return;
    }
    if (!this.validateDelivery()) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '正在下单', mask: true });

    try {
      await ensureLogin();
      const boot = getBoot();
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const isDelivery = this.data.type === 'DELIVERY';

      const order = await http.post<any>('/client/orders', {
        type: this.data.type,
        tableId: this.data.type === 'DINE_IN' && boot && boot.table ? boot.table.id : undefined,
        peopleCount: this.data.type === 'DINE_IN' ? this.data.peopleCount : undefined,
        remark: this.data.remark || undefined,
        receiverName: isDelivery ? this.data.receiverName.trim() : undefined,
        receiverPhone: isDelivery ? this.data.receiverPhone.trim() : undefined,
        address: isDelivery ? this.data.address.trim() : undefined,
        items: buildOrderItems(),
        idempotencyKey,
      });

      wx.hideLoading();

      if (isDelivery) {
        wx.setStorageSync('ts_last_address', {
          name: this.data.receiverName.trim(),
          phone: this.data.receiverPhone.trim(),
          address: this.data.address.trim(),
        });
      }

      clearCart();
      wx.setStorageSync(STORAGE_KEYS.recentOrder, order.id);

      const payResult = await http.post<any>(`/client/orders/${order.id}/pay`, {}, true);
      if (payResult && payResult.mock) {
        wx.redirectTo({ url: `/pages/result/index?id=${order.id}` });
        return;
      }

      const params = payResult && payResult.payParams;
      if (!params) {
        wx.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
        return;
      }

      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
        success: () => {
          wx.redirectTo({ url: `/pages/result/index?id=${order.id}` });
        },
        fail: () => {
          toast('支付已取消，可在订单中继续支付');
          wx.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
        },
      });
    } catch (error: any) {
      wx.hideLoading();
      const message = (error && error.message) || '下单失败，请重试';
      if (message.indexOf('歇业') >= 0 || message.indexOf('休息') >= 0) {
        toast(message);
      } else {
        const ok = await confirm(`${message}\n是否返回菜单重新选择？`, '下单未成功');
        if (ok) wx.navigateBack({ delta: 1 });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },
});
