import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode, ShieldCheck, Store, TrendingUp } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Field, Input } from '../components/ui/field';

export default function LoginPage() {
  const { loginStaff, loginPlatform } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'staff' | 'platform'>('staff');
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo888');
  const [tenantCode, setTenantCode] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next: 'staff' | 'platform') => {
    setMode(next);
    setError('');
    if (next === 'platform') {
      setUsername('admin');
      setPassword('admin888');
    } else {
      setUsername('demo');
      setPassword('demo888');
      setTenantCode('demo');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'platform') {
        await loginPlatform(username.trim(), password);
        navigate('/platform', { replace: true });
      } else {
        await loginStaff(username.trim(), password, tenantCode.trim() || undefined);
        // 手机端直接进入极简老板台，电脑端进入完整后台
        navigate(window.innerWidth < 900 ? '/boss' : '/', { replace: true });
      }
    } catch (err) {
      const message = (err as Error).message || '登录失败';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[1.05fr_1fr]">
      {/* 左侧品牌区 */}
      <div className="relative hidden overflow-hidden bg-ink-900 px-14 py-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-[120px]" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold shadow-lift">
            枢
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">天枢点单</p>
            <p className="text-[11px] text-white/40">Tianshu Ordering Cloud</p>
          </div>
        </div>

        <div className="relative mt-auto max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            已服务 1200+ 家街边小店
          </p>
          <h1 className="text-[38px] font-bold leading-[1.22] tracking-tight">
            扫码点单，
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-amber-300 bg-clip-text text-transparent">
              让小店也有一整套数字化后厨
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/50">
            顾客扫码即点、微信直接付款，后厨自动出单打印。菜单、桌码、优惠、报表一站式管理，换 logo 即成为你自己的品牌。
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { icon: QrCode, title: '扫码即点', desc: '免下载免注册' },
              { icon: TrendingUp, title: '经营看板', desc: '实时营业额' },
              { icon: ShieldCheck, title: '资金直达', desc: '商户号直收' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <item.icon size={18} className="text-brand-300" />
                <p className="mt-3 text-[13px] font-medium">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-white/35">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative mt-12 text-[11px] text-white/25">
          © 2026 天枢点单 · 多商户扫码点单 SaaS · 支持白标交付
        </p>
      </div>

      {/* 右侧表单 */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white">
              枢
            </div>
            <div>
              <p className="text-[15px] font-semibold">天枢点单</p>
              <p className="text-[11px] text-ink-900/40">商户工作台</p>
            </div>
          </div>

          <h2 className="text-[26px] font-bold tracking-tight text-ink-900">欢迎回来</h2>
          <p className="mt-1.5 text-[13px] text-ink-900/45">
            {mode === 'staff' ? '登录后管理你的菜品、桌码与订单' : '登录平台运营中心，管理所有商户'}
          </p>

          <div className="mt-6 inline-flex rounded-xl bg-ink-900/[0.05] p-1">
            {[
              { key: 'staff' as const, label: '商户登录' },
              { key: 'platform' as const, label: '平台运营' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchMode(tab.key)}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-[13px] font-medium transition ${
                  mode === tab.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-900/45 hover:text-ink-900/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="登录账号" required>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={mode === 'staff' ? '请输入商户账号' : '请输入平台账号'}
                autoComplete="username"
              />
            </Field>

            {mode === 'staff' && (
              <Field label="商户编码" hint="同一账号在多个商户下重复时需要填写">
                <Input
                  value={tenantCode}
                  onChange={(event) => setTenantCode(event.target.value)}
                  placeholder="如 demo"
                />
              </Field>
            )}

            <Field label="登录密码" required>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600 ring-1 ring-inset ring-red-100">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full" icon={<ArrowRight size={16} />}>
              进入工作台
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-line bg-white/70 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-900/70">
              <Store size={13} className="text-brand-500" />
              演示账号（点击可直接填入）
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[
                { label: '商户老板', user: 'demo', pass: 'demo888', code: 'demo' },
                { label: '店员', user: 'staff', pass: 'staff888', code: 'demo' },
                { label: '平台运营', user: 'admin', pass: 'admin888', code: '' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    switchMode(item.code ? 'staff' : 'platform');
                    setUsername(item.user);
                    setPassword(item.pass);
                    setTenantCode(item.code);
                  }}
                  className="cursor-pointer rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11.5px] text-ink-900/60 transition hover:border-brand-300 hover:text-brand-600"
                >
                  {item.label} {item.user}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
