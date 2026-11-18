import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CircleDollarSign, Clock3, Plus, ReceiptText, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { fenShort, timeAgo } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { Badge, Card, CardTitle, Empty, Skeleton } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface PlatformOverview {
  tenants: { total: number; active: number; expiring: number };
  today: { gmv: number; orders: number };
  recentTenants: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    storeName: string;
    orders: number;
    createdAt: string;
    expireAt?: string | null;
  }>;
}

export default function PlatformOverviewPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PlatformOverview>('/platform/overview')
      .then(setData)
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11.5px] uppercase tracking-[0.2em] text-white/35">Platform Console</p>
            <h2 className="mt-1.5 text-[24px] font-bold tracking-tight">今日平台经营概况</h2>
            <p className="mt-1 text-[12.5px] text-white/45">
              共 {data?.tenants.total || 0} 家商户在运营，今日产生 {data?.today.orders || 0} 笔订单
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => navigate('/platform/merchants')}
            >
              开通商户
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              onClick={() => navigate('/platform/merchants')}
            >
              商户管理 <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '今日平台 GMV', value: `¥${fenShort(data?.today.gmv || 0)}`, icon: CircleDollarSign, tone: 'bg-brand-500 text-brand-600' },
          { label: '今日订单数', value: `${data?.today.orders || 0} 单`, icon: ReceiptText, tone: 'bg-blue-500 text-blue-600' },
          { label: '活跃商户', value: `${data?.tenants.active || 0} / ${data?.tenants.total || 0}`, icon: Building2, tone: 'bg-emerald-500 text-emerald-600' },
          { label: '7 天内到期', value: `${data?.tenants.expiring || 0} 家`, icon: Clock3, tone: 'bg-amber-500 text-amber-600' },
        ].map((item) => (
          <div key={item.label} className="card flex items-center gap-4 p-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone} bg-opacity-10`}>
              <item.icon size={19} />
            </span>
            <div>
              <p className="text-[12px] text-ink-900/45">{item.label}</p>
              <p className="num mt-1 text-[21px] font-bold leading-none text-ink-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="self-start lg:col-span-2">
          <CardTitle
            title="最近开通的商户"
            subtitle="按开通时间倒序"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/platform/merchants')}>
                查看全部
              </Button>
            }
          />
          {(data?.recentTenants.length || 0) === 0 ? (
            <Empty title="还没有商户" description="点击右上角「开通商户」开始" />
          ) : (
            <div className="space-y-2.5">
              {data?.recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center gap-3 rounded-xl border border-line/70 px-3.5 py-3 transition hover:border-brand-200 hover:bg-brand-50/20"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-[13px] font-semibold text-brand-600">
                    {tenant.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{tenant.name}</p>
                    <p className="truncate text-[11px] text-ink-900/40">
                      {tenant.storeName} · 编码 {tenant.code}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="num text-[12.5px] text-ink-900/70">{tenant.orders} 单</p>
                    <p className="text-[10.5px] text-ink-900/35">{timeAgo(tenant.createdAt)}开通</p>
                  </div>
                  <Badge
                    tone={
                      tenant.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-red-50 text-red-600 ring-red-200'
                    }
                  >
                    {tenant.status === 'ACTIVE' ? '正常' : '停用'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="平台运营要点" subtitle="交付与续费 checklist" />
          <div className="space-y-3">
            {[
              { title: '开通即交付', desc: '创建商户后自动生成品牌、门店、老板账号' },
              { title: '商户自助配置', desc: '换 logo、主题色、菜品与桌码全部由商户自行维护' },
              { title: '资金不过平台', desc: '商户使用自己的微信支付商户号，平台零资金风险' },
              { title: '到期提醒', desc: '服务到期后商户后台自动锁定，续费即恢复' },
            ].map((item, index) => (
              <div key={item.title} className="flex gap-3 rounded-xl bg-cream/60 px-3.5 py-3">
                <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-semibold text-brand-600">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-ink-900/85">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-ink-900/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-[11.5px] text-brand-700">
            <TrendingUp size={13} />
            建议按 2999 元/年定价，20 家商户即可覆盖团队成本
          </div>
        </Card>
      </div>
    </div>
  );
}
