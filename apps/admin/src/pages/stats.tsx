import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, CircleDollarSign, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { fen, fenShort, todayText } from '../lib/utils';
import { useToast } from '../lib/toast';
import { Badge, Card, CardTitle, Empty, Spinner } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/field';
import { CategoryPieChart, HourBarChart, RevenueAreaChart } from '../components/charts';

interface Overview {
  range: { from: string; to: string };
  summary: { amount: number; count: number; avgPrice: number; itemCount: number };
  daily: Array<{ date: string; amount: number; count: number }>;
  hours: Array<{ hour: number; amount: number; count: number }>;
  categories: Array<{ name: string; amount: number; quantity: number }>;
}

export default function StatsPage() {
  const toast = useToast();
  const [from, setFrom] = useState(todayText(-6));
  const [to, setTo] = useState(todayText());
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (dateFrom = from, dateTo = to) => {
      setLoading(true);
      const result = await api.get<Overview>('/admin/stats/overview', { dateFrom, dateTo });
      setData(result);
      setLoading(false);
    },
    [from, to],
  );

  useEffect(() => {
    load().catch((error) => {
      toast.error((error as Error).message);
      setLoading(false);
    });
  }, [load, toast]);

  const quick = (days: number) => {
    const start = todayText(-(days - 1));
    const end = todayText();
    setFrom(start);
    setTo(end);
    load(start, end).catch(console.error);
  };

  const peak = data?.hours.reduce((acc, item) => (item.amount > acc.amount ? item : acc), {
    hour: 0,
    amount: 0,
    count: 0,
  });

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 !p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-brand-500" />
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 w-40 text-[13px]" />
          <span className="text-ink-900/30">至</span>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 w-40 text-[13px]" />
          <Button size="sm" onClick={() => load()} loading={loading}>
            查询
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => quick(1)}>
            今日
          </Button>
          <Button variant="outline" size="sm" onClick={() => quick(7)}>
            近 7 天
          </Button>
          <Button variant="outline" size="sm" onClick={() => quick(30)}>
            近 30 天
          </Button>
        </div>
      </Card>

      {loading && !data ? (
        <Spinner label="正在统计…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '营业额', value: `¥${fenShort(data?.summary.amount || 0)}`, icon: CircleDollarSign, tone: 'bg-brand-500 text-brand-600' },
              { label: '有效订单', value: `${data?.summary.count || 0} 单`, icon: ReceiptText, tone: 'bg-blue-500 text-blue-600' },
              { label: '客单价', value: `¥${fen(data?.summary.avgPrice || 0)}`, icon: TrendingUp, tone: 'bg-emerald-500 text-emerald-600' },
              { label: '售出菜品', value: `${data?.summary.itemCount || 0} 份`, icon: ShoppingBag, tone: 'bg-amber-500 text-amber-600' },
            ].map((item) => (
              <div key={item.label} className="card flex items-center gap-4 p-4">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone} bg-opacity-10`}>
                  <item.icon size={19} />
                </span>
                <div>
                  <p className="text-[12px] text-ink-900/45">{item.label}</p>
                  <p className="num mt-1 text-[22px] font-bold leading-none text-ink-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardTitle
              title="营业额趋势"
              subtitle={`${data?.range.from} 至 ${data?.range.to}`}
              action={
                <Badge tone="bg-brand-50 text-brand-700 ring-brand-200">
                  峰值时段 {peak?.hour}:00
                </Badge>
              }
            />
            {data?.daily.length ? (
              <RevenueAreaChart data={data.daily} height={260} />
            ) : (
              <Empty title="该时间段暂无数据" />
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle title="时段分布" subtitle="用于排班与备货参考" />
              {data?.hours && data.hours.some((item) => item.amount > 0) ? (
                <HourBarChart data={data.hours} />
              ) : (
                <Empty title="暂无时段数据" />
              )}
            </Card>

            <Card>
              <CardTitle title="品类占比" subtitle="按分类统计营业额" />
              {data?.categories.length ? <CategoryPieChart data={data.categories} /> : <Empty title="暂无品类数据" />}
            </Card>
          </div>

          <Card>
            <CardTitle title="热销明细" subtitle="按品类汇总的销售表现" />
            <div className="overflow-hidden rounded-xl border border-line/70">
              <table className="w-full text-[13px]">
                <thead className="bg-cream/70 text-[11.5px] text-ink-900/45">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">分类</th>
                    <th className="px-4 py-2.5 text-right font-medium">销售份数</th>
                    <th className="px-4 py-2.5 text-right font-medium">营业额</th>
                    <th className="px-4 py-2.5 text-right font-medium">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.categories || []).map((item) => {
                    const total = data?.summary.amount || 1;
                    return (
                      <tr key={item.name} className="border-t border-line/60">
                        <td className="px-4 py-2.5 text-ink-900/80">{item.name}</td>
                        <td className="num px-4 py-2.5 text-right text-ink-900/60">{item.quantity}</td>
                        <td className="num px-4 py-2.5 text-right font-medium text-ink-900">¥{fen(item.amount)}</td>
                        <td className="num px-4 py-2.5 text-right text-ink-900/45">
                          {Math.round((item.amount / total) * 100)}%
                        </td>
                      </tr>
                    );
                  })}
                  {(!data || data.categories.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[12.5px] text-ink-900/35">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
