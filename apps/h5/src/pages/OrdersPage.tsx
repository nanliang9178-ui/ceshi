import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fen, ORDER_STATUS_TEXT, timeText } from '../lib/format';
import type { Order } from '../lib/types';
import { useShop } from '../shop';

const ACTIVE = ['UNPAID', 'PENDING', 'PREPARING', 'READY'];

export default function OrdersPage() {
  const { scene } = useShop();
  const { scene: sceneParam } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ list: Order[] }>('/client/orders?page=1&pageSize=50');
      setOrders(data.list || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === 'active' ? orders.filter((order) => ACTIVE.includes(order.status)) : orders;

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-[#FBF7F2]/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-3">
          <button type="button" onClick={() => navigate(`/t/${scene || sceneParam}`)} className="cursor-pointer text-[15px] text-ink-500">
            ‹
          </button>
          <p className="text-[14px] font-semibold">我的订单</p>
        </div>
        <div className="flex gap-5 px-4">
          {[
            { key: 'active' as const, label: '进行中' },
            { key: 'all' as const, label: '全部' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`relative cursor-pointer pb-2 text-[13px] ${
                tab === item.key ? 'font-semibold text-ink-900' : 'text-ink-400'
              }`}
            >
              {item.label}
              {tab === item.key && <span className="absolute inset-x-0 -bottom-px mx-auto h-[2px] w-6 rounded bg-brand" />}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-2.5 p-3">
        {loading && [0, 1, 2].map((item) => <div key={item} className="skeleton h-24 rounded-2xl" />)}

        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl">🧾</div>
            <p className="text-[12.5px] text-ink-500">{tab === 'active' ? '暂无进行中的订单' : '还没有下过单'}</p>
            <button
              type="button"
              onClick={() => navigate(`/t/${scene || sceneParam}`)}
              className="mt-2 cursor-pointer rounded-full border border-line px-4 py-1.5 text-[12px]"
            >
              去点单
            </button>
          </div>
        )}

        {list.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => navigate(`/t/${scene || sceneParam}/orders/${order.id}`)}
            className="w-full cursor-pointer rounded-2xl bg-white p-3.5 text-left shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-md px-2 py-0.5 font-num text-[11px] font-semibold text-white ${
                    order.type === 'DELIVERY' ? 'bg-sky-500' : 'bg-ink-900'
                  }`}
                >
                  {order.type === 'DELIVERY' ? '外卖' : order.tableName || '自取'}
                </span>
                {order.type !== 'DELIVERY' && order.pickupNo && (
                  <span className="font-num text-[10.5px] text-ink-400">#{order.pickupNo}</span>
                )}
              </div>
              <span className={`text-[11.5px] ${ACTIVE.includes(order.status) ? 'font-semibold text-brand' : 'text-ink-400'}`}>
                {ORDER_STATUS_TEXT[order.status] || order.statusText}
              </span>
            </div>

            <p className="mt-2 line-clamp-1 text-[12.5px] text-ink-700">
              {order.items.map((item) => `${item.productName}×${item.quantity}`).join('、')}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-ink-400">{timeText(order.createdAt)}</span>
              <span className="flex items-baseline gap-1">
                <span className="text-[10px] text-ink-400">共 {order.itemCount} 件</span>
                <span className="font-num text-[15px] font-bold">¥{fen(order.totalAmount)}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
