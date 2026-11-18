import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, QrCode, Save, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/button';
import { Card, CardTitle, Skeleton } from '../../components/ui/card';
import { Field, Input, Select } from '../../components/ui/field';

interface MiniprogramConfig {
  appId: string;
  appSecretMasked: string;
  hasAppSecret: boolean;
  envVersion: string;
  configured: boolean;
  homePage: string;
}

const ENV_OPTIONS = [
  { value: 'release', label: '正式版（顾客扫的码）' },
  { value: 'trial', label: '体验版（内部测试）' },
  { value: 'develop', label: '开发版（真机调试）' },
];

export default function MiniprogramSettingsPage() {
  const toast = useToast();
  const [config, setConfig] = useState<MiniprogramConfig | null>(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [envVersion, setEnvVersion] = useState('release');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<MiniprogramConfig>('/admin/pay/miniprogram')
      .then((data) => {
        setConfig(data);
        setAppId(data.appId || '');
        setEnvVersion(data.envVersion || 'release');
      })
      .catch((error) => toast.error((error as Error).message));
  }, [toast]);

  const save = async () => {
    if (!appId.trim()) {
      toast.error('请填写小程序 AppID');
      return;
    }
    if (!config?.hasAppSecret && !appSecret.trim()) {
      toast.error('请填写小程序 AppSecret');
      return;
    }
    setSaving(true);
    try {
      const data = await api.put<MiniprogramConfig>('/admin/pay/miniprogram', {
        appId: appId.trim(),
        appSecret: appSecret.trim() || undefined,
        envVersion,
      });
      setConfig(data);
      setAppSecret('');
      toast.success(data.configured ? '小程序配置已保存，可以去生成桌码了' : '已保存，但配置仍不完整');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Card
        className={
          config.configured
            ? 'border-emerald-200/70 bg-emerald-50/40'
            : 'border-amber-200/70 bg-amber-50/40'
        }
      >
        <div className="flex items-start gap-3">
          <div
            className={
              config.configured
                ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600'
                : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600'
            }
          >
            {config.configured ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink-900">
              {config.configured ? '已配置，可以生成可扫码打开的小程序码' : '未配置小程序，桌码暂时无法扫码打开'}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-900/55">
              {config.configured
                ? `当前版本：${ENV_OPTIONS.find((item) => item.value === config.envVersion)?.label || config.envVersion}　落地页：${config.homePage}`
                : '填写 AppID 与 AppSecret 后，桌码会生成微信小程序码（圆形码），顾客微信扫一扫即可直接进入点单页。'}
            </p>
            {config.configured && (
              <Link
                to="/tables"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-[12px] font-medium text-white"
              >
                <QrCode size={13} />
                去桌码管理生成
              </Link>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle title="小程序信息" subtitle="在微信公众平台 → 开发管理 → 开发设置 中获取" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="AppID" required>
            <Input
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder="wx1234567890abcdef"
              maxLength={40}
            />
          </Field>
          <Field label="AppSecret" required hint={config.hasAppSecret ? `已保存 ${config.appSecretMasked}，留空表示不修改` : '复制完整密钥，保存后仅显示掩码'}>
            <Input
              type="password"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder={config.hasAppSecret ? '不修改请留空' : '填写小程序密钥'}
              maxLength={64}
            />
          </Field>
          <Field label="生成码版本" hint="顾客实际扫码用「正式版」；没发布正式版前可先用体验版测试" className="sm:col-span-2">
            <Select value={envVersion} onChange={(event) => setEnvVersion(event.target.value)}>
              {ENV_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[12px] text-ink-900/45">
            <Smartphone size={13} className="text-brand-500" />
            扫码路径：顾客微信扫桌码 → 直接打开小程序点单页 → 自动识别桌号
          </p>
          <Button loading={saving} icon={<Save size={15} />} onClick={save}>
            保存配置
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle title="开通步骤" subtitle="四步之后，桌码才能被微信直接识别为小程序码" />
        <ol className="space-y-3">
          {[
            {
              title: '注册并认证小程序',
              desc: '微信公众平台注册小程序（主体建议与营业执照一致），完成微信认证；餐饮类目需营业执照 + 食品经营许可证。',
            },
            {
              title: '填写 AppID / AppSecret',
              desc: '公众平台 → 开发管理 → 开发设置，复制 AppID 与 AppSecret 填到上方并保存。',
            },
            {
              title: '上传并发布小程序代码',
              desc: '用微信开发者工具导入 apps/miniprogram，填入同一个 AppID，上传后在公众平台提交审核并发布（体验版可先选 trial 测试）。',
            },
            {
              title: '配置服务器域名后生成桌码',
              desc: '公众平台 → 开发管理 → 服务器域名，把 API 域名加入 request 合法域名；然后到桌码管理点「批量生成桌码」。',
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-xl bg-cream/50 px-4 py-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-[13px] font-medium text-ink-900">{step.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-900/45">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[11.5px] leading-relaxed text-amber-700">
          提示：小程序未发布、AppID 不匹配、或服务器域名未配置时，微信会拒绝生成小程序码，生成时会直接提示具体原因。
        </p>
      </Card>
    </div>
  );
}
