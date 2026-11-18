import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fen, timeText } from '../lib/format';
import { useShop } from '../shop';
import type { Order } from '../lib/types';

export default function ResultPage() {
  const { scene, boot } = useShop();
  const navigate = useNavigate();
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api
      .get<Order>(`/client/orders/${orderId}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [orderId]);

  const isDelivery = order?.type === 'DELIVERY';

  return (
    <div className="min-h-screen bg-cream pb-10">
      <div className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] px-6 pb-16 pt-12 text-center text-white">
        <div className="mx-auto flex h-16 w-16 animate-pop items-center justify-center rounded-full border-2 border-white/60 bg-white/20 text-3xl">
          ✓
        </div>
        <p className="mt-3 text-[22px] font-bold tracking-wide">下单成功</p>
        <p className="mt-1 text-[12px] text-white/80">已通知商家，请留意出餐进度</p>
      </div>

      <div className="-mt-10 px-3">
        <div className="rounded-3xl bg-white px-4 py-5 text-center shadow-card">
          <p className="text-[11px] tracking-widest text-ink-400">{isDelivery ? '预计送达' : '取餐号 / 桌号'}</p>
          <p className="mt-1 font-num text-[46px] font-bold leading-none text-brand">
            {isDelivery
              ? `${order?.deliveryEta || 30}`
              : order?.pickupNo
                ? order.pickupNo
                : order?.tableName || '堂食'}
            {isDelivery && <span className="ml-1 text-[16px] font-semibold">分钟</span>}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink-400">
            {isDelivery ? '商家正在备餐，配送员将电话联系您' : order?.type === 'TAKEAWAY' ? '请凭取餐号到取餐口取餐' : '餐品将送至您的餐桌'}
          </p>

          {isDelivery && order?.address && (
            <div className="mt-3 border-t border-dashed border-line pt-3 text-left">
              <p className="text-[12px] text-ink-700">
                {order.receiverName} {order.receiverPhone}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">{order.address}</p>
            </div>
          )}
        </div>

        {order && (
          <div className="mt-2.5 space-y-2 rounded-2xl bg-white px-4 py-3 text-[12px]">
            <div className="flex justify-between py-0.5">
              <span className="text-ink-400">订单号</span>
              <span className="font-num text-ink-700">{order.orderNo}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-ink-400">下单时间</span>
              <span className="text-ink-700">{timeText(order.createdAt)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-ink-400">商品</span>
              <span className="text-ink-700">{order.itemCount} 件</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-ink-400">实付</span>
              <span className="font-num text-[14px] font-bold text-brand">¥{fen(order.totalAmount)}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2.5">
          <Link
            to={`/t/${scene}/orders`}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-line bg-white text-[13px] text-ink-700"
          >
            我的订单
          </Link>
          <button
            type="button"
            onClick={() => navigate(`/t/${scene}/orders/${orderId}`, { replace: true })}
            className="btn-brand h-11 flex-1 cursor-pointer rounded-full text-[13px] font-semibold"
          >
            查看进度
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/t/${scene}`, { replace: true })}
          className="mt-4 w-full cursor-pointer text-center text-[12px] text-brand"
        >
          继续加菜 →
        </button>

        <p className="mt-8 text-center text-[10px] text-ink-400/70">
          {boot?.brand.copyright || '本店由天枢点单提供技术支持'}
        </p>
      </div>
    </div>
  );
}
