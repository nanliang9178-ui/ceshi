import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Copy,
  KeyRound,
  Loader2,
  PlugZap,
  Save,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/button';
import { Badge, Card, CardTitle, Skeleton } from '../../components/ui/card';
import { Field, Input, Switch, Textarea } from '../../components/ui/field';

interface PayConfigView {
  appId: string;
  appSecretMasked: string;
  mchId: string;
  serialNo: string;
  apiV3KeyMasked: string;
  privateKeyMasked: string;
  hasPrivateKey: boolean;
  enabled: boolean;
  verifiedAt: string | null;
  statusMsg: string | null;
  notifyUrl: string;
  mockAllowed: boolean;
  ready: boolean;
}

export default function PaymentSettingsPage() {
  const toast = useToast();
  const [view, setView] = useState<PayConfigView | null>(null);
  const [form, setForm] = useState({
    appId: '',
    appSecret: '',
    mchId: '',
    serialNo: '',
    apiV3Key: '',
    privateKey: '',
    enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const load = () =>
    api
      .get<PayConfigView>('/admin/pay/config')
      .then((data) => {
        setView(data);
        setForm((prev) => ({
          ...prev,
          appId: data.appId || '',
          mchId: data.mchId || '',
          serialNo: data.serialNo || '',
          enabled: data.enabled,
        }));
      })
      .catch((error) => toast.error((error as Error).message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setTestResult('');
    try {
      const data = await api.put<PayConfigView>('/admin/pay/config', {
        appId: form.appId.trim() || undefined,
        appSecret: form.appSecret.trim() || undefined,
        mchId: form.mchId.trim() || undefined,
        serialNo: form.serialNo.trim() || undefined,
        apiV3Key: form.apiV3Key.trim() || undefined,
        privateKey: form.privateKey.trim() || undefined,
        enabled: form.enabled,
      });
      setView(data);
      setForm((prev) => ({ ...prev, appSecret: '', apiV3Key: '', privateKey: '' }));
      toast.success('支付配置已保存');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const result = await api.post<{ success: boolean; certCount: number; message: string }>(
        '/admin/pay/config/test',
      );
      setTestResult(result.message);
      toast.success(result.message);
      await load();
    } catch (error) {
      const message = (error as Error).message;
      setTestResult(message);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const copyNotify = () => {
    if (!view?.notifyUrl) return;
    navigator.clipboard.writeText(view.notifyUrl);
    toast.success('回调地址已复制');
  };

  if (!view) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="!p-0">
          <div className="flex flex-col gap-3 border-b border-line/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-ink-900">微信支付（商户号直收）</h3>
                {view.verifiedAt ? (
                  <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">
                    <BadgeCheck size={11} /> 已验证
                  </Badge>
                ) : view.ready ? (
                  <Badge tone="bg-amber-50 text-amber-700 ring-amber-200">待验证</Badge>
                ) : (
                  <Badge tone="bg-ink-900/5 text-ink-500 ring-ink-900/10">未配置</Badge>
                )}
              </div>
              <p className="mt-1 text-[12px] text-ink-900/40">
                资金直接进入商户号，平台不触碰交易资金；密钥加密存储，后台不可回显
              </p>
            </div>
            <Button variant="outline" size="sm" loading={testing} icon={<PlugZap size={14} />} onClick={test}>
              测试连接
            </Button>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="小程序 AppID" required hint="微信公众平台 → 开发设置">
                <Input
                  value={form.appId}
                  onChange={(event) => setForm({ ...form, appId: event.target.value })}
                  placeholder="wx1234567890abcdef"
                />
              </Field>
              <Field label="小程序 AppSecret" hint={view.appSecretMasked ? `已保存：${view.appSecretMasked}` : '用于微信登录换取 openid'}>
                <Input
                  type="password"
                  value={form.appSecret}
                  onChange={(event) => setForm({ ...form, appSecret: event.target.value })}
                  placeholder={view.appSecretMasked ? '留空表示不修改' : '填写 AppSecret'}
                />
              </Field>
              <Field label="商户号 MchID" required hint="微信支付商户平台 → 账户中心">
                <Input
                  value={form.mchId}
                  onChange={(event) => setForm({ ...form, mchId: event.target.value })}
                  placeholder="1900000001"
                />
              </Field>
              <Field label="证书序列号" required hint="apiclient_cert.pem 的序列号">
                <Input
                  value={form.serialNo}
                  onChange={(event) => setForm({ ...form, serialNo: event.target.value })}
                  placeholder="5F2A1B..."
                />
              </Field>
              <Field
                label="APIv3 密钥"
                required
                hint={view.apiV3KeyMasked ? `已保存：${view.apiV3KeyMasked}（32 位）` : '商户平台 → API 安全'}
              >
                <Input
                  type="password"
                  value={form.apiV3Key}
                  onChange={(event) => setForm({ ...form, apiV3Key: event.target.value })}
                  placeholder={view.apiV3KeyMasked ? '留空表示不修改' : '填写 32 位 APIv3 密钥'}
                  maxLength={32}
                />
              </Field>
              <Field label="回调地址" hint="复制到商户平台「支付回调」无需填写，系统自动使用">
                <div className="flex gap-2">
                  <Input value={view.notifyUrl} readOnly className="bg-cream font-mono text-[11.5px]" />
                  <Button variant="outline" size="icon" onClick={copyNotify} title="复制" className="h-10 w-10 shrink-0">
                    <Copy size={14} />
                  </Button>
                </div>
              </Field>
            </div>

            <Field
              label="商户 API 私钥（apiclient_key.pem）"
              hint={
                view.hasPrivateKey
                  ? '已上传并加密存储。如需更换，重新粘贴或上传即可覆盖'
                  : '仅在服务器与微信支付之间使用，加密存储，不会回显'
              }
            >
              <div className="space-y-2">
                <Textarea
                  value={form.privateKey}
                  onChange={(event) => setForm({ ...form, privateKey: event.target.value })}
                  placeholder={view.hasPrivateKey ? '已上传，留空表示不修改' : '-----BEGIN PRIVATE KEY-----'}
                  className="font-mono text-[11px] leading-5"
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-900/60 transition hover:border-brand-300 hover:text-brand-600">
                  <Upload size={13} />
                  上传 pem 文件
                  <input
                    type="file"
                    accept=".pem,.txt,.key"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setForm((prev) => ({ ...prev, privateKey: String(reader.result || '') }));
                      reader.onerror = () => toast.error('读取文件失败');
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </Field>

            <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3.5">
              <div>
                <p className="text-[13.5px] font-medium text-ink-900">启用微信支付</p>
                <p className="mt-0.5 text-[11.5px] text-ink-900/40">关闭后使用演示支付（仅用于店内演示，不产生真实扣款）</p>
              </div>
              <Switch checked={form.enabled} onChange={(value) => setForm({ ...form, enabled: value })} />
            </div>

            {view.statusMsg && (
              <div
                className={`rounded-xl px-4 py-3 text-[12.5px] ${
                  view.verifiedAt
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
                }`}
              >
                {view.statusMsg}
              </div>
            )}
            {testResult && <div className="rounded-xl bg-cream px-4 py-3 text-[12.5px] text-ink-900/60">{testResult}</div>}

            <div className="flex items-center justify-end gap-2 border-t border-line/70 pt-4">
              <Button loading={saving} icon={<Save size={15} />} onClick={save}>
                保存配置
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardTitle title="配置步骤" subtitle="5 分钟完成真实收款接入" />
          <ol className="space-y-3">
            {[
              {
                title: '准备小程序主体',
                desc: '小程序需完成认证，并在「开发管理 → 服务器域名」把本系统域名加入 requestFile 白名单',
              },
              {
                title: '绑定商户号',
                desc: '在微信支付商户平台「产品中心 → AppID 账号管理」关联该小程序 AppID',
              },
              {
                title: '下载 API 证书',
                desc: '商户平台 → 账户中心 → API 安全 → 申请证书，得到 apiclient_key.pem 与证书序列号',
              },
              {
                title: '设置 APIv3 密钥',
                desc: '同一页面设置 32 位 APIv3 密钥，务必自行备份',
              },
              {
                title: '保存并测试',
                desc: '点击「测试连接」，显示「配置校验通过」即可正常收款',
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-semibold text-brand-600">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-ink-900/85">{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-ink-900/40">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="border-amber-200/70 bg-amber-50/50">
          <div className="flex gap-2.5">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-[12px] leading-5 text-amber-800">
              <p className="font-medium">安全提示</p>
              <p className="mt-1 text-amber-700/80">
                商户私钥与 APIv3 密钥使用 AES-256-GCM 加密落库，接口永不回显明文。请勿把私钥发送给任何第三方。
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title="演示支付" subtitle="未配置商户号时的兜底能力" />
          <div className="flex items-start gap-2.5 text-[12px] leading-5 text-ink-900/55">
            <KeyRound size={15} className="mt-0.5 shrink-0 text-brand-500" />
            <p>
              当前
              {view.mockAllowed ? '已开启' : '已关闭'}演示支付。开启时，未配置支付或使用演示小程序登录的订单会直接标记为已支付，
              便于完整走通点单 → 接单 → 出餐 → 完成流程，不会产生真实资金流。
            </p>
          </div>
          {testing && (
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-900/40">
              <Loader2 size={12} className="animate-spin" /> 正在与微信支付通信…
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
