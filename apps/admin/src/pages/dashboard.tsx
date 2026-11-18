import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChefHat,
  CircleDollarSign,
  Flame,
  ReceiptText,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardData, Order } from '../lib/types';
import { fenShort, timeAgo } from '../lib/utils';
import { useToast } from '../lib/toast';
import { Badge, Card, CardTitle, Empty, Skeleton } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RevenueAreaChart } from '../components/charts';

function StatCard({
  label,
  value,
  prefix,
  suffix,
  hint,
  tone,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  tone: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  delta?: number | null;
}) {
  return (
    <div className="group card relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.09] blur-xl ${tone}`} />
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-medium text-ink-900/50">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone} bg-opacity-10 text-opacity-100`}>
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        {prefix && <span className="mb-1 text-sm text-ink-900/40">{prefix}</span>}
        <span className="num text-[30px] font-bold leading-none text-ink-900">{value}</span>
        {suffix && <span className="mb-0.5 text-xs text-ink-900/40">{suffix}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11.5px] font-medium ${
              delta >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.min(Math.abs(delta), 999)}%
          </span>
        )}
        {hint && <span className="text-[11.5px] text-ink-900/35">{hint}</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pending, setPending] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');

  const load = useCallback(async () => {
    const [dashboard, orders] = await Promise.all([
      api.get<DashboardData>('/admin/stats/dashboard'),
      api.get<{ list: Order[] }>('/admin/orders', { status: 'PENDING', pageSize: 6 }),
    ]);
    setData(dashboard);
    setPending(orders.list);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
    const timer = window.setInterval(() => {
      load().catch(console.error);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, toast]);

  const accept = async (order: Order) => {
    setActing(order.id);
    try {
      await api.post(`/admin/orders/${order.id}/accept`);
      toast.success(`${order.tableName || '自取'} 订单已接单`);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setActing('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 xl:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const today = data?.today;
  const peak = data?.trend.reduce(
    (acc, item) => (item.amount > acc.amount ? item : acc),
    { date: '-', amount: 0, count: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今日营业额"
          value={fenShort(today?.amount)}
          prefix="¥"
          delta={today?.compareRate}
          hint="较昨日"
          tone="bg-brand-500 text-brand-600"
          icon={CircleDollarSign}
        />
        <StatCard
          label="今日有效订单"
          value={String(today?.count || 0)}
          suffix="单"
          hint={`客单价 ¥${((today?.avgPrice || 0) / 100).toFixed(2)}`}
          tone="bg-blue-500 text-blue-600"
          icon={ReceiptText}
        />
        <StatCard
          label="待接单"
          value={String(today?.pendingCount || 0)}
          suffix="单"
          hint={today?.pendingCount ? '请尽快处理' : '暂无待处理'}
          tone="bg-amber-500 text-amber-600"
          icon={Timer}
        />
        <StatCard
          label="今日退款"
          value={String(today?.refundCount || 0)}
          suffix="单"
          hint={peak?.amount ? `峰值日 ${peak.date.slice(5)}` : '暂无数据'}
          tone="bg-emerald-500 text-emerald-600"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle
            title="近 7 日营业额趋势"
            subtitle="按下单支付时间统计，不含退款订单"
            action={
              <Badge tone="bg-brand-50 text-brand-700 ring-brand-200">
                <Flame size={11} /> 峰值 ¥{fenShort(peak?.amount || 0)}
              </Badge>
            }
          />
          <RevenueAreaChart data={data?.trend || []} height={252} />
        </Card>

        <Card className="flex flex-col">
          <CardTitle
            title="待接单"
            subtitle="实时推送到此列表"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/orders')}>
                全部订单
              </Button>
            }
          />
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5" style={{ maxHeight: 300 }}>
            {pending.length === 0 && <Empty title="太棒了" description="当前没有待处理的订单" />}
            {pending.map((order) => (
              <div
                key={order.id}
                className="group rounded-xl border border-line/80 bg-white p-3.5 transition hover:border-brand-200 hover:bg-brand-50/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="num rounded-lg bg-ink-900 px-2 py-1 text-[12px] font-semibold text-white">
                      {order.tableName || '自取'}
                    </span>
                    <span className="text-[12px] text-ink-900/40">{order.pickupNo ? `#${order.pickupNo}` : ''}</span>
                  </div>
                  <span className="num text-[15px] font-semibold text-brand-600">¥{fenShort(order.totalAmount)}</span>
                </div>
                <p className="mt-1.5 truncate text-[12px] text-ink-900/55">
                  {order.items.map((item) => `${item.productName}×${item.quantity}`).join('、')}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-ink-900/35">{timeAgo(order.createdAt)}</span>
                  <Button
                    size="sm"
                    loading={acting === order.id}
                    onClick={() => accept(order)}
                    className="h-7 px-3 text-[12px]"
                  >
                    接单
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="近 7 日热销榜" subtitle="按销售份数排序" action={<Badge>TOP 8</Badge>} />
          <div className="space-y-2.5">
            {(data?.topProducts || []).map((item, index) => {
              const max = data?.topProducts[0]?.quantity || 1;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span
                    className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                      index < 3 ? 'bg-brand-500 text-white' : 'bg-ink-900/5 text-ink-900/40'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-ink-900/80">{item.name}</span>
                      <span className="num shrink-0 text-[12px] text-ink-900/45">{item.quantity} 份</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-900/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${Math.max(6, (item.quantity / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {(data?.topProducts || []).length === 0 && <Empty title="还没有销售数据" />}
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-52 w-52 rounded-full bg-brand-500/10 blur-3xl" />
          <CardTitle title="快捷操作" subtitle="常用功能一键直达" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '添加菜品', desc: '上新一道招牌菜', icon: ChefHat, to: '/menu' },
              { label: '桌码打印', desc: '批量生成桌台码', icon: ReceiptText, to: '/tables' },
              { label: '品牌换装', desc: '换 logo 与主题色', icon: Flame, to: '/settings/brand' },
              { label: '经营报表', desc: '查看时段与品类', icon: TrendingUp, to: '/stats' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="group cursor-pointer rounded-xl border border-line/70 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                  <item.icon size={16} />
                </span>
                <p className="mt-2.5 text-[13px] font-medium text-ink-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-900/40">{item.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-ink-900 px-4 py-3.5 text-white">
            <p className="text-[12px] font-medium">今日收入已实时入账商户号</p>
            <p className="mt-1 text-[11px] leading-5 text-white/45">
              资金由微信支付直连商户号结算，平台不触碰交易资金，T+1 自动到账。
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
