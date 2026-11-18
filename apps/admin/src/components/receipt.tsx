import type { Order } from '../lib/types';
import { fen, formatTime } from '../lib/utils';

/** 80mm 热敏小票预览，可直接打印 */
export function Receipt({ order, shopName }: { order: Order; shopName?: string }) {
  return (
    <div className="mx-auto w-[300px] bg-white px-4 py-5 text-[12px] leading-5 text-ink-900">
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-widest">{shopName || '天枢点单'}</p>
        <p className="mt-1 text-[11px] text-ink-900/50">
          {order.type === 'DINE_IN' ? `堂食 · ${order.tableName || '—'} 桌` : '自取带走'}
        </p>
      </div>

      <div className="my-3 border-t border-dashed border-ink-900/25" />

      <div className="space-y-0.5 text-[11px] text-ink-900/60">
        <div className="flex justify-between">
          <span>订单号</span>
          <span className="num">{order.orderNo}</span>
        </div>
        <div className="flex justify-between">
          <span>下单时间</span>
          <span className="num">{formatTime(order.createdAt, true)}</span>
        </div>
        {order.pickupNo && (
          <div className="flex justify-between">
            <span>取餐号</span>
            <span className="num text-[14px] font-bold text-ink-900">#{order.pickupNo}</span>
          </div>
        )}
        {order.peopleCount ? (
          <div className="flex justify-between">
            <span>用餐人数</span>
            <span className="num">{order.peopleCount} 人</span>
          </div>
        ) : null}
      </div>

      <div className="my-3 border-t border-dashed border-ink-900/25" />

      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex-1 font-medium">{item.productName}</span>
              <span className="num">x{item.quantity}</span>
              <span className="num w-14 text-right">{fen(item.amount)}</span>
            </div>
            {item.specText && <p className="text-[10.5px] text-ink-900/45">{item.specText}</p>}
            {item.remark && <p className="text-[10.5px] text-ink-900/45">备注：{item.remark}</p>}
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-ink-900/25" />

      <div className="space-y-1 text-[11.5px]">
        <div className="flex justify-between">
          <span>商品合计</span>
          <span className="num">¥{fen(order.itemAmount)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-brand-600">
            <span>满减优惠</span>
            <span className="num">-¥{fen(order.discountAmount)}</span>
          </div>
        )}
        {order.packingFee > 0 && (
          <div className="flex justify-between">
            <span>打包费</span>
            <span className="num">¥{fen(order.packingFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed border-ink-900/25 pt-1.5 text-[14px] font-bold">
          <span>实付</span>
          <span className="num">¥{fen(order.totalAmount)}</span>
        </div>
      </div>

      {order.remark && (
        <p className="mt-3 rounded bg-ink-900/[0.04] px-2 py-1.5 text-[11px]">备注：{order.remark}</p>
      )}

      <div className="my-3 border-t border-dashed border-ink-900/25" />
      <p className="text-center text-[10.5px] text-ink-900/40">感谢惠顾，欢迎再次光临</p>
      <p className="mt-1 text-center text-[10px] text-ink-900/30">扫码点单 · 天枢点单提供技术支持</p>
    </div>
  );
}
