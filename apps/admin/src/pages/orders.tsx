import { useCallback, useEffect, useState } from 'react';
import { ChefHat, Clock3, RefreshCw, Search, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import type { Order } from '../lib/types';
import { durationText, fen, timeAgo, todayText } from '../lib/utils';
import { ORDER_STATUS_META, PAY_STATUS_META } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { getSocket } from '../lib/socket';
import { Badge, Card, Empty, Spinner } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input, SegmentedControl } from '../components/ui/field';
import { OrderDetailDrawer } from '../components/order-detail-drawer';
import { cn } from '../lib/utils';

const TABS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待接单' },
  { value: 'PREPARING', label: '制作中' },
  { value: 'READY', label: '待取餐' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'UNPAID', label: '待支付' },
  { value: 'CANCELLED', label: '已取消' },
];

export default function OrdersPage() {
  const { me } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<'today' | '7d' | 'all'>('today');
  const [list, setList] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [acting, setActing] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const dateFrom = range === 'today' ? todayText() : range === '7d' ? todayText(-6) : undefined;
      const data = await api.get<{ list: Order[]; counts: Record<string, number> }>('/admin/orders', {
        status,
        keyword: keyword.trim() || undefined,
        dateFrom,
        pageSize: 60,
      });
      setList(data.list);
      setCounts(data.counts || {});
      setRefreshing(false);
      setLoading(false);
    },
    [status, keyword, range],
  );

  useEffect(() => {
    load().catch((error) => {
      toast.error((error as Error).message);
      setLoading(false);
    });
  }, [load, toast]);

  // 15 秒静默轮询，Socket 在线时也保留兜底
  useEffect(() => {
    const timer = window.setInterval(() => load(true).catch(console.error), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => load(true).catch(console.error);
    socket.on('order:new', handler);
    socket.on('order:updated', handler);
    return () => {
      socket.off('order:new', handler);
      socket.off('order:updated', handler);
    };
  }, [load]);

  const quickAction = async (order: Order, action: 'accept' | 'ready' | 'complete') => {
    setActing(order.id + action);
    try {
      await api.post(`/admin/orders/${order.id}/${action}`);
      toast.success(action === 'accept' ? '已接单，开始制作' : action === 'ready' ? '已出餐，等待顾客取餐' : '订单已完成');
      await load(true);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setActing('');
    }
  };

  const totalPending = (counts.PENDING || 0) + (counts.PREPARING || 0);

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 !p-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto pb-0.5">
          {TABS.map((tab) => {
            const count = tab.value === 'ALL' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[tab.value] || 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  'relative shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                  status === tab.value ? 'bg-ink-900 text-white' : 'text-ink-900/50 hover:bg-ink-900/5',
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      'num ml-1 text-[11px]',
                      status === tab.value ? 'text-white/60' : 'text-ink-900/35',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索订单号 / 桌号"
              className="h-9 w-44 pl-8 text-[13px]"
            />
          </div>
          <SegmentedControl
            value={range}
            onChange={(value) => setRange(value as 'today' | '7d' | 'all')}
            options={[
              { value: 'today', label: '今日' },
              { value: '7d', label: '近 7 天' },
              { value: 'all', label: '全部' },
            ]}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => load()}
            title="刷新"
            className="h-9 w-9"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </Card>

      {totalPending > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-2.5 text-[12.5px] text-brand-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
          当前有 <b className="num">{totalPending}</b> 单待处理，请注意出餐时效
        </div>
      )}

      {loading ? (
        <Spinner label="正在加载订单…" />
      ) : list.length === 0 ? (
        <Card>
          <Empty
            title={status === 'ALL' ? '今天还没有订单' : '该状态下暂无订单'}
            description="顾客扫码下单后会实时出现在这里"
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            const waitMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            const urgent = ['PENDING', 'PREPARING'].includes(order.status) && waitMinutes >= 10;
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(order.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveId(order.id);
                  }
                }}
                className={cn(
                  'group cursor-pointer rounded-2xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card',
                  urgent ? 'border-brand-300 shadow-[0_0_0_3px_rgba(255,90,31,0.06)]' : 'border-line/80',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'num rounded-lg px-2.5 py-1 text-[13px] font-semibold text-white',
                        order.type === 'DELIVERY' ? 'bg-sky-500' : 'bg-ink-900',
                      )}
                    >
                      {order.type === 'DELIVERY' ? '外卖' : order.tableName || '自取'}
                    </span>
                    {order.type !== 'DELIVERY' && order.pickupNo && (
                      <span className="num text-[12px] text-ink-900/35">#{order.pickupNo}</span>
                    )}
                    {order.type === 'TAKEAWAY' && <Badge>自取</Badge>}
                  </div>
                  <Badge tone={meta?.tone}>{meta?.text || order.status}</Badge>
                </div>

                <div className="mt-3 space-y-1">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className="num shrink-0 text-ink-900/35">{item.quantity}×</span>
                      <span className="truncate text-ink-900/75">{item.productName}</span>
                      {item.specText && (
                        <span className="hidden shrink-0 truncate text-[11px] text-ink-900/30 sm:inline">
                          {item.specText}
                        </span>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-[11.5px] text-ink-900/30">等 {order.items.length} 项商品</p>
                  )}
                </div>

                {order.type === 'DELIVERY' && order.address && (
                  <p className="mt-2 line-clamp-2 rounded-md bg-sky-50 px-2 py-1 text-[11.5px] leading-relaxed text-sky-800">
                    {order.receiverName} {order.receiverPhone} · {order.address}
                  </p>
                )}

                {order.remark && (
                  <p className="mt-2 truncate rounded-md bg-amber-50 px-2 py-1 text-[11.5px] text-amber-700">
                    备注：{order.remark}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="num text-[17px] font-bold text-ink-900">¥{fen(order.totalAmount)}</span>
                    <Badge tone={PAY_STATUS_META[order.payStatus]?.tone}>{PAY_STATUS_META[order.payStatus]?.text}</Badge>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[11.5px]',
                      urgent ? 'font-medium text-brand-600' : 'text-ink-900/35',
                    )}
                  >
                    <Clock3 size={12} />
                    {order.status === 'PENDING' || order.status === 'PREPARING'
                      ? durationText(order.createdAt)
                      : timeAgo(order.createdAt)}
                  </span>
                </div>

                {order.allowedActions?.accept && (
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={acting === order.id + 'accept'}
                      icon={<ChefHat size={13} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        quickAction(order, 'accept');
                      }}
                    >
                      接单
                    </Button>
                  </div>
                )}
                {order.allowedActions?.ready && (
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={acting === order.id + 'ready'}
                      icon={<Utensils size={13} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        quickAction(order, 'ready');
                      }}
                    >
                      出餐完成
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OrderDetailDrawer
        open={Boolean(activeId)}
        orderId={activeId}
        shopName={me?.store?.name}
        onClose={() => setActiveId(null)}
        onChanged={() => load(true).catch(console.error)}
      />
    </div>
  );
}
