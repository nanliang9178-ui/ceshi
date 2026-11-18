import { http } from '../../utils/request';
import { ensureLogin, getBoot } from '../../utils/session';
import { fen, formatTime, ORDER_STATUS_DESC, ORDER_STATUS_TEXT } from '../../utils/format';
import { call, confirm, go, toast } from '../../utils/ui';

const FLOW = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
const FLOW_LABEL: Record<string, string> = {
  PENDING: '已下单',
  PREPARING: '制作中',
  READY: '待取餐',
  COMPLETED: '已完成',
};

Page({
  data: {
    id: '',
    order: null as any,
    theme: '#FF5A1F',
    statusText: '',
    statusDesc: '',
    steps: [] as Array<{ key: string; label: string; done: boolean; active: boolean }>,
    items: [] as any[],
    itemCountText: '',
    itemAmountText: '0.00',
    discountText: '0.00',
    packingText: '0.00',
    totalText: '0.00',
    createdText: '',
    cancelled: false,
    canPay: false,
    canCancel: false,
    canRemind: false,
    canAppend: false,
    isTakeaway: false,
    isDelivery: false,
    etaText: '',
    paying: false,
    loading: true,
    storePhone: '',
  },

  timer: 0 as any,

  onLoad(query: any) {
    const boot = getBoot();
    this.setData({
      id: (query && query.id) || '',
      theme: (boot && boot.brand && boot.brand.primaryColor) || '#FF5A1F',
      storePhone: (boot && boot.store && boot.store.phone) || '',
    });
    this.load();
    this.timer = setInterval(() => this.load(true), 5000);
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },

  onHide() {
    if (this.timer) clearInterval(this.timer);
  },

  onShow() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.load(true), 5000);
    if (this.data.id) this.load(true);
  },

  load(silent = false) {
    if (!this.data.id) return;
    ensureLogin()
      .then(() => http.get<any>(`/client/orders/${this.data.id}`, undefined, true))
      .then((order) => {
        const status = order.status;
        const cancelIndex = FLOW.indexOf(status);
        const steps = FLOW.map((key, index) => ({
          key,
          label: FLOW_LABEL[key],
          done: status !== 'CANCELLED' && (cancelIndex >= index || status === 'COMPLETED'),
          active: status !== 'CANCELLED' && cancelIndex === index && status !== 'COMPLETED',
        }));

        this.setData({
          order,
          loading: false,
          statusText: ORDER_STATUS_TEXT[status] || status,
          statusDesc: ORDER_STATUS_DESC[status] || '',
          steps,
          items: (order.items || []).map((item: any) => ({
            ...item,
            amountText: fen(item.amount),
          })),
          itemCountText: `共 ${order.itemCount || 0} 件`,
          itemAmountText: fen(order.itemAmount),
          discountText: fen(order.discountAmount),
          packingText: fen(order.packingFee),
          totalText: fen(order.totalAmount),
          createdText: formatTime(order.createdAt),
          cancelled: status === 'CANCELLED',
          isTakeaway: order.type === 'TAKEAWAY',
          isDelivery: order.type === 'DELIVERY',
          etaText: order.deliveryEta ? String(order.deliveryEta) : '',
          canPay: status === 'UNPAID',
          canCancel: Boolean(order.allowedActions && order.allowedActions.customerCancel),
          canRemind: status === 'PENDING' || status === 'PREPARING',
          canAppend: Boolean(order.allowedActions && order.allowedActions.append) && order.payStatus === 'PAID',
        });

        if (['COMPLETED', 'CANCELLED'].indexOf(status) >= 0 && this.timer) {
          clearInterval(this.timer);
          this.timer = 0;
        }
      })
      .catch((error) => {
        if (!silent) {
          this.setData({ loading: false });
          toast((error && error.message) || '订单加载失败');
        }
      });
  },

  async payNow() {
    if (this.data.paying) return;
    this.setData({ paying: true });
    wx.showLoading({ title: '正在发起支付', mask: true });
    try {
      const result = await http.post<any>(`/client/orders/${this.data.id}/pay`, {}, true);
      wx.hideLoading();
      if (result && result.mock) {
        toast('支付成功', 'success');
        this.load(true);
        return;
      }
      const params = result && result.payParams;
      if (!params) {
        toast('支付参数获取失败，请稍后重试');
        return;
      }
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
        success: () => {
          toast('支付成功', 'success');
          this.load(true);
        },
        fail: () => toast('支付已取消'),
      });
    } catch (error: any) {
      wx.hideLoading();
      toast((error && error.message) || '支付失败');
    } finally {
      this.setData({ paying: false });
    }
  },

  async cancelOrder() {
    const ok = await confirm('取消后如已支付将原路退款，确定取消订单吗？', '取消订单');
    if (!ok) return;
    wx.showLoading({ title: '处理中', mask: true });
    try {
      await http.post(`/client/orders/${this.data.id}/cancel`, { reason: '顾客取消' });
      wx.hideLoading();
      toast('订单已取消');
      this.load(true);
    } catch (error: any) {
      wx.hideLoading();
      toast((error && error.message) || '取消失败');
    }
  },

  remind() {
    http
      .post(`/client/orders/${this.data.id}/remind`, {}, true)
      .then(() => toast('已提醒商家，请稍候'))
      .catch((error) => toast((error && error.message) || '操作过于频繁'));
  },

  appendItems() {
    go('/pages/menu/index');
  },

  callShop() {
    call(this.data.storePhone);
  },

  copyOrderNo() {
    wx.setClipboardData({
      data: this.data.order ? this.data.order.orderNo : '',
      success: () => toast('订单号已复制'),
    });
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/orders/index' });
  },
});
