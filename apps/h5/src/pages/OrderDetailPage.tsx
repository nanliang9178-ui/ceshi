import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fen, ORDER_STATUS_DESC, ORDER_STATUS_TEXT, timeText } from '../lib/format';
import { useShop } from '../shop';
import type { Order } from '../lib/types';

const FLOW = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
const FLOW_LABEL: Record<string, string> = {
  PENDING: '已下单',
  PREPARING: '制作中',
  READY: '待取餐',
  COMPLETED: '已完成',
};

export default function OrderDetailPage() {
  const { scene } = useShop();
  const { scene: sceneParam, orderId = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get<Order>(`/client/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      setToast((err as Error).message);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      load();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [load]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const cancel = async () => {
    if (!window.confirm('取消后如已支付将原路退款，确定取消订单吗？')) return;
    try {
      await api.post(`/client/orders/${orderId}/cancel`, { reason: '顾客取消' });
      flash('订单已取消');
      load();
    } catch (err) {
      flash((err as Error).message);
    }
  };

  const remind = async () => {
    try {
      await api.post(`/client/orders/${orderId}/remind`, {});
      flash('已提醒商家，请稍候');
    } catch (err) {
      flash((err as Error).message);
    }
  };

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-[13px] text-ink-400">
        正在加载订单…
      </div>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  const index = FLOW.indexOf(order.status);
  const isDelivery = order.type === 'DELIVERY';
  const back = `/t/${scene || sceneParam}`;

  return (
    <div className="min-h-screen bg-cream pb-24">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-[#FBF7F2]/95 px-3 backdrop-blur">
        <button type="button" onClick={() => navigate(`/t/${scene || sceneParam}/orders`)} className="cursor-pointer text-[15px] text-ink-500">
          ‹
        </button>
        <p className="text-[14px] font-semibold">订单详情</p>
      </header>

      <div className="p-3">
        <div
          className={`relative overflow-hidden rounded-2xl px-4 py-5 text-white ${
            cancelled
              ? 'bg-gradient-to-br from-ink-500 to-ink-900'
              : 'bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]'
          }`}
        >
          <p className="text-[18px] font-bold">{ORDER_STATUS_TEXT[order.status] || order.statusText}</p>
          <p className="mt-1 text-[11.5px] text-white/75">
            {cancelled ? order.remark || '订单已关闭' : ORDER_STATUS_DESC[order.status]}
          </p>
          {!cancelled && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
              <p className="text-[9.5px] text-white/60">{isDelivery ? '预计' : order.type === 'TAKEAWAY' ? '取餐号' : '桌号'}</p>
              <p className="font-num text-[30px] font-bold leading-none">
                {isDelivery ? `${order.deliveryEta || 30}分` : order.pickupNo || order.tableName || '堂食'}
              </p>
            </div>
          )}
        </div>

        {!cancelled && (
          <div className="mt-2.5 flex items-center rounded-2xl bg-white px-2 py-3">
            {FLOW.map((step, stepIndex) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className="relative flex h-3 w-full items-center justify-center">
                  {stepIndex < FLOW.length - 1 && (
                    <span
                      className={`absolute left-1/2 top-1/2 h-[2px] w-full -translate-y-1/2 ${
                        index > stepIndex ? 'bg-brand/40' : 'bg-line'
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 rounded-full ${
                      index >= stepIndex ? 'h-2.5 w-2.5 bg-brand' : 'h-2 w-2 bg-line'
                    }`}
                  />
                </div>
                <span className={`mt-1.5 text-[10px] ${index >= stepIndex ? 'text-ink-700' : 'text-ink-400'}`}>
                  {FLOW_LABEL[step]}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2.5 rounded-2xl bg-white p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-semibold">{isDelivery ? '外卖订单' : `${order.tableName || ''} ${order.type === 'TAKEAWAY' ? '自取' : ''}`}</p>
            <p className="text-[10.5px] text-ink-400">共 {order.itemCount} 件</p>
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 border-b border-line/60 py-2 last:border-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="h-11 w-11 rounded-lg object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream text-base">🍲</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{item.productName}</p>
                {item.specText && <p className="truncate text-[10px] text-ink-400">{item.specText}</p>}
              </div>
              <div className="text-right">
                <p className="font-num text-[12.5px] font-semibold">¥{fen(item.amount)}</p>
                <p className="text-[10px] text-ink-400">x{item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        {isDelivery && order.address && (
          <div className="mt-2.5 rounded-2xl bg-sky-50 p-3">
            <p className="text-[12px] font-medium text-sky-900">配送信息</p>
            <p className="mt-1 text-[11.5px] text-sky-800">
              {order.receiverName} · {order.receiverPhone}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sky-700">{order.address}</p>
          </div>
        )}

        <div className="mt-2.5 rounded-2xl bg-white p-3 text-[12px]">
          <div className="flex justify-between py-1 text-ink-500">
            <span>商品金额</span>
            <span className="font-num">¥{fen(order.itemAmount)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between py-1 text-brand">
              <span>满减优惠</span>
              <span className="font-num">-¥{fen(order.discountAmount)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between py-1 text-ink-500">
              <span>配送费</span>
              <span className="font-num">¥{fen(order.deliveryFee)}</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-line/70 pt-2">
            <span className="text-[13px] font-semibold">实付</span>
            <span className="text-brand">
              <span className="text-[11px]">¥</span>
              <span className="font-num text-[18px] font-bold">{fen(order.totalAmount)}</span>
            </span>
          </div>
        </div>

        <div className="mt-2.5 space-y-1.5 rounded-2xl bg-white p-3 text-[12px]">
          <div className="flex justify-between">
            <span className="text-ink-400">订单号</span>
            <span className="font-num text-ink-700">{order.orderNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-400">下单时间</span>
            <span className="text-ink-700">{timeText(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-400">支付状态</span>
            <span className="text-ink-700">{order.payStatusText}</span>
          </div>
          {order.remark && (
            <div className="flex justify-between gap-6">
              <span className="shrink-0 text-ink-400">备注</span>
              <span className="text-right text-ink-700">{order.remark}</span>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-2 border-t border-line bg-white px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        {order.allowedActions?.customerCancel && (
          <button
            type="button"
            onClick={cancel}
            className="h-9 cursor-pointer rounded-full border border-line px-4 text-[12.5px] text-ink-500"
          >
            取消订单
          </button>
        )}
        {(order.status === 'PENDING' || order.status === 'PREPARING') && (
          <button
            type="button"
            onClick={remind}
            className="h-9 cursor-pointer rounded-full border border-line px-4 text-[12.5px] text-ink-500"
          >
            催一下
          </button>
        )}
        {['PENDING', 'PREPARING', 'READY'].includes(order.status) && (
          <button
            type="button"
            onClick={() => navigate(back)}
            className="btn-brand h-9 cursor-pointer rounded-full px-5 text-[12.5px] font-semibold"
          >
            加菜
          </button>
        )}
        {cancelled && (
          <button
            type="button"
            onClick={() => navigate(back)}
            className="btn-brand h-9 cursor-pointer rounded-full px-5 text-[12.5px] font-semibold"
          >
            再点一单
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-[12px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
