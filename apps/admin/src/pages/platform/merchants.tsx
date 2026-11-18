import { useCallback, useEffect, useState } from 'react';
import { Building2, KeyRound, Plus, Search, ShieldCheck, Store, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PLAN_TEXT } from '../../lib/format';
import { fenShort, formatDate, formatTime } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { Badge, Card, Empty, Spinner } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Field, Input, Select } from '../../components/ui/field';
import { Modal } from '../../components/ui/modal';

interface TenantRow {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
  contactPhone?: string | null;
  status: string;
  plan: string;
  expireAt?: string | null;
  createdAt: string;
  storeName?: string;
  openStatus?: boolean;
  orderCount: number;
  staffCount: number;
  gmv: number;
}

interface TenantDetail extends TenantRow {
  brand?: { primaryColor?: string; logoUrl?: string; slogan?: string };
  store?: { name: string; address?: string; businessHours?: string; openStatus?: boolean };
  staff?: Array<{ id: string; username: string; name: string; role: string; status: string }>;
  stats?: { gmv: number; todayOrders: number; orderCount: number };
  paymentConfig?: { appId?: string; mchId?: string; enabled: boolean; verifiedAt?: string | null } | null;
  _count?: Record<string, number>;
}

const EMPTY_FORM = {
  name: '',
  contactName: '',
  contactPhone: '',
  storeName: '',
  plan: 'BASIC',
  expireAt: '',
  ownerUsername: '',
  ownerPassword: '',
};

export default function MerchantsPage() {
  const toast = useToast();
  const [list, setList] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const data = await api.get<{ list: TenantRow[] }>('/platform/tenants', {
      keyword: keyword.trim() || undefined,
      status,
      pageSize: 50,
    });
    setList(data.list);
  }, [keyword, status]);

  useEffect(() => {
    load()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [load, toast]);

  const create = async () => {
    if (!form.name.trim() || !form.ownerUsername.trim() || form.ownerPassword.length < 6) {
      toast.error('请填写商户名称、登录账号，且密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      const result = await api.post<{ loginCode: string; ownerUsername: string }>('/platform/tenants', {
        ...form,
        name: form.name.trim(),
        ownerUsername: form.ownerUsername.trim(),
        storeName: form.storeName.trim() || undefined,
        expireAt: form.expireAt || undefined,
      });
      toast.success(`商户已开通，登录编码 ${result.loginCode}，账号 ${result.ownerUsername}`);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tenant: TenantRow) => {
    setBusy(tenant.id);
    try {
      const next = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api.put(`/platform/tenants/${tenant.id}`, { status: next });
      toast.success(next === 'ACTIVE' ? '已恢复该商户' : '已停用该商户');
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy('');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const data = await api.get<TenantDetail>(`/platform/tenants/${id}`);
      setDetail(data);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const resetPassword = async () => {
    if (!detail) return;
    if (newPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/platform/tenants/${detail.id}/owner-password`, { password: newPassword });
      toast.success('老板密码已重置');
      setPwdOpen(false);
      setNewPassword('');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索商户名称 / 编码 / 电话"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-28 text-[13px]">
            <option value="ALL">全部状态</option>
            <option value="ACTIVE">正常</option>
            <option value="SUSPENDED">已停用</option>
          </Select>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            开通商户
          </Button>
        </div>
      </Card>

      {loading ? (
        <Spinner label="正在加载商户…" />
      ) : list.length === 0 ? (
        <Card>
          <Empty title="没有符合条件的商户" icon={<Building2 size={22} />} />
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="bg-cream/70 text-[11.5px] text-ink-900/45">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">商户</th>
                  <th className="px-4 py-3 text-left font-medium">套餐</th>
                  <th className="px-4 py-3 text-right font-medium">累计 GMV</th>
                  <th className="px-4 py-3 text-right font-medium">订单</th>
                  <th className="px-4 py-3 text-left font-medium">到期时间</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((tenant) => {
                  const expiring =
                    tenant.expireAt && new Date(tenant.expireAt).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
                  return (
                    <tr key={tenant.id} className="border-t border-line/60 transition hover:bg-cream/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-[13px] font-semibold text-brand-600">
                            {tenant.name.slice(0, 1)}
                          </span>
                          <div>
                            <p className="font-medium text-ink-900">{tenant.name}</p>
                            <p className="text-[11px] text-ink-900/35">
                              {tenant.storeName || '-'} · 编码 <span className="font-mono">{tenant.code}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="bg-ink-900/5 text-ink-600 ring-ink-900/10">{PLAN_TEXT[tenant.plan] || tenant.plan}</Badge>
                      </td>
                      <td className="num px-4 py-3 text-right text-ink-900/80">¥{fenShort(tenant.gmv)}</td>
                      <td className="num px-4 py-3 text-right text-ink-900/55">{tenant.orderCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[12px] ${expiring ? 'font-medium text-amber-600' : 'text-ink-900/50'}`}>
                          {tenant.expireAt ? formatDate(tenant.expireAt) : '长期'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            tenant.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-red-50 text-red-600 ring-red-200'
                          }
                        >
                          {tenant.status === 'ACTIVE' ? '正常' : '已停用'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(tenant.id)}>
                            详情
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busy === tenant.id}
                            onClick={() => toggleStatus(tenant)}
                            className={tenant.status === 'ACTIVE' ? 'text-red-500' : 'text-emerald-600'}
                          >
                            {tenant.status === 'ACTIVE' ? '停用' : '启用'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="开通新商户"
        description="开通后自动生成品牌配置、门店与老板账号，可直接交付使用"
        width="max-w-2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={create}>
              确认开通
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="商户名称" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="如 椒香里·川味小馆" maxLength={40} />
          </Field>
          <Field label="门店名称" hint="默认与商户名称一致">
            <Input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} placeholder="如 万象城店" />
          </Field>
          <Field label="套餐">
            <Select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>
              <option value="BASIC">基础版</option>
              <option value="PRO">专业版</option>
              <option value="FLAGSHIP">旗舰版</option>
            </Select>
          </Field>
          <Field label="联系人">
            <Input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} maxLength={20} />
          </Field>
          <Field label="联系电话">
            <Input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} maxLength={20} />
          </Field>
          <Field label="服务到期时间" hint="留空默认一年">
            <Input type="date" value={form.expireAt} onChange={(event) => setForm({ ...form, expireAt: event.target.value })} />
          </Field>
          <div className="sm:col-span-2 mt-1 rounded-xl bg-cream/70 px-4 py-3">
            <p className="mb-2.5 text-[12px] font-medium text-ink-900/70">老板登录账号</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={form.ownerUsername}
                onChange={(event) => setForm({ ...form, ownerUsername: event.target.value })}
                placeholder="登录账号，如 jiaoxiangli"
                maxLength={30}
              />
              <Input
                value={form.ownerPassword}
                onChange={(event) => setForm({ ...form, ownerPassword: event.target.value })}
                placeholder="初始密码，至少 6 位"
                maxLength={32}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || '商户详情'}
        description={detail ? `编码 ${detail.code} · 开通于 ${formatDate(detail.createdAt)}` : ''}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPwdOpen(true)} icon={<KeyRound size={14} />}>
              重置老板密码
            </Button>
            <Button size="sm" onClick={() => setDetail(null)}>
              关闭
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '累计营业额', value: `¥${fenShort(detail.stats?.gmv || 0)}` },
                { label: '累计订单', value: `${detail.stats?.orderCount || 0} 单` },
                { label: '今日订单', value: `${detail.stats?.todayOrders || 0} 单` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-cream/70 px-3.5 py-3">
                  <p className="text-[11px] text-ink-900/40">{item.label}</p>
                  <p className="num mt-1 text-[17px] font-semibold text-ink-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-line/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-900/70">
                <Store size={13} className="text-brand-500" /> 门店信息
              </p>
              <div className="grid gap-1 text-[12px] text-ink-900/55 sm:grid-cols-2">
                <p>名称：{detail.store?.name || '-'}</p>
                <p>营业时间：{detail.store?.businessHours || '-'}</p>
                <p className="sm:col-span-2">地址：{detail.store?.address || '-'}</p>
                <p>菜品数：{detail._count?.products || 0}</p>
                <p>桌位数：{detail._count?.tables || 0}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-line/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-900/70">
                <ShieldCheck size={13} className="text-brand-500" /> 支付与账号
              </p>
              <p className="text-[12px] text-ink-900/55">
                微信支付：{detail.paymentConfig?.enabled ? '已启用' : '未启用'}
                {detail.paymentConfig?.mchId ? ` · 商户号 ${detail.paymentConfig.mchId}` : ' · 演示模式'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(detail.staff || []).map((staff) => (
                  <span
                    key={staff.id}
                    className="rounded-lg bg-cream px-2.5 py-1 text-[11.5px] text-ink-900/55"
                  >
                    {staff.name}（{staff.username}）
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3">
              <div>
                <p className="text-[12.5px] font-medium text-amber-800">商户状态</p>
                <p className="text-[11px] text-amber-700/70">停用后商户后台立即锁定，顾客端同时停止接单</p>
              </div>
              <Button
                variant={detail.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                loading={busy === detail.id}
                onClick={() => {
                  toggleStatus(detail);
                  setDetail(null);
                }}
                icon={<Trash2 size={13} />}
              >
                {detail.status === 'ACTIVE' ? '停用商户' : '恢复商户'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        title="重置老板密码"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPwdOpen(false)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={resetPassword}>
              确认重置
            </Button>
          </>
        }
      >
        <Field label="新密码" required hint={`请线下告知 ${detail?.name || '商户'} 的老板`}>
          <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} maxLength={32} />
        </Field>
      </Modal>
    </div>
  );
}
