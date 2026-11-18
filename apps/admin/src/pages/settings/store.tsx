import { useEffect, useState } from 'react';
import { Save, Store as StoreIcon } from 'lucide-react';
import { api } from '../../lib/api';
import type { StoreInfo } from '../../lib/types';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/button';
import { Card, CardTitle, Skeleton } from '../../components/ui/card';
import { Field, Input, Switch, Textarea } from '../../components/ui/field';

interface FormState {
  name: string;
  address: string;
  phone: string;
  businessHours: string;
  openStatus: boolean;
  autoAccept: boolean;
  packingFee: string;
  minOrderAmount: string;
  deliveryFee: string;
  deliveryMinAmount: string;
  deliveryRange: string;
  deliveryEta: string;
  fullReduceThreshold: string;
  fullReduceAmount: string;
  notice: string;
}

export default function StoreSettingsPage() {
  const toast = useToast();
  const { refresh } = useAuth();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ store: StoreInfo }>('/admin/store')
      .then((data) => {
        const store = data.store;
        setForm({
          name: store.name,
          address: store.address || '',
          phone: store.phone || '',
          businessHours: store.businessHours,
          openStatus: store.openStatus,
          autoAccept: store.autoAccept,
          packingFee: (store.packingFee / 100).toFixed(2).replace(/\.00$/, ''),
          minOrderAmount: (store.minOrderAmount / 100).toFixed(2).replace(/\.00$/, ''),
          deliveryFee: (store.deliveryFee / 100).toFixed(2).replace(/\.00$/, ''),
          deliveryMinAmount: (store.deliveryMinAmount / 100).toFixed(2).replace(/\.00$/, ''),
          deliveryRange: store.deliveryRange || '',
          deliveryEta: String(store.deliveryEta ?? 30),
          fullReduceThreshold: (store.fullReduceThreshold / 100).toFixed(2).replace(/\.00$/, ''),
          fullReduceAmount: (store.fullReduceAmount / 100).toFixed(2).replace(/\.00$/, ''),
          notice: store.notice || '',
        });
      })
      .catch((error) => toast.error((error as Error).message));
  }, [toast]);

  const patch = (value: Partial<FormState>) => setForm((prev) => (prev ? { ...prev, ...value } : prev));

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error('请输入门店名称');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/store', {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        businessHours: form.businessHours.trim(),
        openStatus: form.openStatus,
        autoAccept: form.autoAccept,
        packingFee: Math.round(Number(form.packingFee || 0) * 100),
        minOrderAmount: Math.round(Number(form.minOrderAmount || 0) * 100),
        deliveryFee: Math.round(Number(form.deliveryFee || 0) * 100),
        deliveryMinAmount: Math.round(Number(form.deliveryMinAmount || 0) * 100),
        deliveryRange: form.deliveryRange.trim(),
        deliveryEta: Math.round(Number(form.deliveryEta || 0)),
        fullReduceThreshold: Math.round(Number(form.fullReduceThreshold || 0) * 100),
        fullReduceAmount: Math.round(Number(form.fullReduceAmount || 0) * 100),
        notice: form.notice.trim(),
      });
      await refresh();
      toast.success('店铺设置已保存');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Card>
        <CardTitle title="门店信息" subtitle="顾客在小程序首页与订单页看到的基础信息" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="门店名称" required>
            <Input value={form.name} onChange={(event) => patch({ name: event.target.value })} maxLength={40} />
          </Field>
          <Field label="联系电话">
            <Input value={form.phone} onChange={(event) => patch({ phone: event.target.value })} maxLength={30} />
          </Field>
          <Field label="门店地址" className="sm:col-span-2">
            <Input value={form.address} onChange={(event) => patch({ address: event.target.value })} maxLength={120} />
          </Field>
          <Field label="营业时间" hint="仅作展示，接单开关请使用下方「接单状态」">
            <Input
              value={form.businessHours}
              onChange={(event) => patch({ businessHours: event.target.value })}
              placeholder="10:00-22:00"
            />
          </Field>
          <Field label="门店公告" hint="展示给顾客的温馨提示">
            <Input value={form.notice} onChange={(event) => patch({ notice: event.target.value })} maxLength={200} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle title="接单设置" subtitle="影响顾客能否下单与后厨自动化程度" />
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3.5">
            <div>
              <p className="text-[13.5px] font-medium text-ink-900">接单状态</p>
              <p className="mt-0.5 text-[11.5px] text-ink-900/40">关闭后顾客仍可浏览菜单，但无法下单</p>
            </div>
            <Switch checked={form.openStatus} onChange={(value) => patch({ openStatus: value })} label={form.openStatus ? '营业中' : '休息中'} />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3.5">
            <div>
              <p className="text-[13.5px] font-medium text-ink-900">自动接单</p>
              <p className="mt-0.5 text-[11.5px] text-ink-900/40">顾客支付成功后直接进入「制作中」，适合高峰期</p>
            </div>
            <Switch checked={form.autoAccept} onChange={(value) => patch({ autoAccept: value })} />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle title="外卖配送" subtitle="顾客选择「外卖」时生效，自行配送无需对接骑手平台" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="配送费（元）" hint="每单收取，0 表示免配送费">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.deliveryFee}
              onChange={(event) => patch({ deliveryFee: event.target.value })}
            />
          </Field>
          <Field label="外卖起送价（元）" hint="商品金额达到该值才可下单，0 表示不限">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.deliveryMinAmount}
              onChange={(event) => patch({ deliveryMinAmount: event.target.value })}
            />
          </Field>
          <Field label="配送范围说明" className="sm:col-span-2">
            <Input
              value={form.deliveryRange}
              onChange={(event) => patch({ deliveryRange: event.target.value })}
              placeholder="3 公里内配送，满 20 元起送"
              maxLength={100}
            />
          </Field>
          <Field label="预计送达（分钟）">
            <Input
              type="number"
              min="0"
              value={form.deliveryEta}
              onChange={(event) => patch({ deliveryEta: event.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle title="费用与优惠" subtitle="打包费仅对自取订单生效" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="打包费（元）" hint="自取订单收取，堂食不收">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.packingFee}
              onChange={(event) => patch({ packingFee: event.target.value })}
            />
          </Field>
          <Field label="起购金额（元）" hint="自取订单最低消费，0 表示不限制">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderAmount}
              onChange={(event) => patch({ minOrderAmount: event.target.value })}
            />
          </Field>
          <Field label="满减门槛（元）" hint="满多少元开始优惠，0 表示不启用">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.fullReduceThreshold}
              onChange={(event) => patch({ fullReduceThreshold: event.target.value })}
            />
          </Field>
          <Field label="满减金额（元）" hint="满足门槛后减多少钱">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.fullReduceAmount}
              onChange={(event) => patch({ fullReduceAmount: event.target.value })}
            />
          </Field>
        </div>
        {Number(form.fullReduceThreshold) > 0 && Number(form.fullReduceAmount) > 0 && (
          <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-[12.5px] text-brand-700">
            当前优惠：满 {form.fullReduceThreshold} 元减 {form.fullReduceAmount} 元，小程序结算页自动抵扣
          </div>
        )}
      </Card>

      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-glass backdrop-blur">
        <p className="flex items-center gap-1.5 text-[12px] text-ink-900/45">
          <StoreIcon size={13} className="text-brand-500" />
          修改后立即对顾客生效
        </p>
        <Button loading={saving} icon={<Save size={15} />} onClick={save}>
          保存设置
        </Button>
      </div>
    </div>
  );
}
