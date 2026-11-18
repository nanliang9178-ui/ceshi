import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ReceiptText,
  Store,
  Users,
  UtensilsCrossed,
  X,
  Palette,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { connectRealtime, disconnectRealtime, playNewOrderSound } from '../../lib/socket';
import { useToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import { ROLE_TEXT } from '../../lib/format';
import { Badge } from '../ui/card';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
}

const BUSINESS_NAV: NavItem[] = [
  { to: '/', label: '经营概览', icon: LayoutDashboard, end: true },
  { to: '/boss', label: '老板台（手机）', icon: Smartphone },
  { to: '/orders', label: '订单工作台', icon: ReceiptText },
  { to: '/menu', label: '菜品管理', icon: UtensilsCrossed },
  { to: '/tables', label: '桌码管理', icon: QrCode },
  { to: '/stats', label: '经营统计', icon: BarChart3 },
];

const SETTINGS_NAV: NavItem[] = [
  { to: '/settings/brand', label: '品牌白标', icon: Palette },
  { to: '/settings/store', label: '店铺设置', icon: Store },
  { to: '/settings/miniprogram', label: '小程序配置', icon: Smartphone },
  { to: '/settings/payment', label: '微信支付', icon: CreditCard },
  { to: '/settings/staff', label: '员工与权限', icon: Users },
];

const PLATFORM_NAV: NavItem[] = [
  { to: '/platform', label: '平台总览', icon: LayoutDashboard, end: true },
  { to: '/platform/merchants', label: '商户管理', icon: Building2 },
];

export default function AppShell() {
  const { me, isPlatform, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(false);

  const navGroups = useMemo(() => {
    if (isPlatform) return [{ title: '平台', items: PLATFORM_NAV }];
    return [
      { title: '经营', items: BUSINESS_NAV },
      { title: '配置', items: SETTINGS_NAV },
    ];
  }, [isPlatform]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // 商户端实时新单提醒
  useEffect(() => {
    if (!me || isPlatform) return;
    const socket = connectRealtime();
    if (!socket) return;

    const onConnect = () => setOnline(true);
    const onDisconnect = () => setOnline(false);
    const onNewOrder = (order: any) => {
      playNewOrderSound();
      toast.info(
        `新订单：${order.tableName ? `${order.tableName} 桌` : '自取'} · ¥${(order.totalAmount / 100).toFixed(2)} · ${
          order.items?.length || 0
        } 件商品`,
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:new', onNewOrder);
    if (socket.connected) setOnline(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:new', onNewOrder);
      disconnectRealtime();
    };
  }, [me, isPlatform, toast]);

  const currentTitle = useMemo(() => {
    const all = [...BUSINESS_NAV, ...SETTINGS_NAV, ...PLATFORM_NAV];
    const matched = all.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );
    return matched?.label || '天枢点单';
  }, [location.pathname]);

  const brandName = isPlatform ? '天枢点单' : me?.tenant?.name || '天枢点单';
  const logoUrl = me?.brand?.logoUrl;

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lift">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold">枢</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight">{brandName}</p>
          <p className="truncate text-[11px] text-white/40">
            {isPlatform ? '平台运营中心' : '天枢点单 · 商户工作台'}
          </p>
        </div>
        <button
          type="button"
          className="ml-auto cursor-pointer rounded-lg p-1 text-white/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭菜单"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_10px_24px_-14px_rgba(255,90,31,1)]'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
                    )
                  }
                >
                  <item.icon size={17} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight
                    size={14}
                    className="opacity-0 transition group-hover:opacity-40"
                  />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {me?.name?.slice(0, 1) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{me?.name}</p>
            <p className="truncate text-[11px] text-white/35">
              {ROLE_TEXT[me?.role || ''] || me?.role} · {me?.username}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-up">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="cursor-pointer rounded-lg p-2 text-ink-900/60 hover:bg-ink-900/5 lg:hidden"
              aria-label="打开菜单"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-ink-900">{currentTitle}</h1>
              <p className="hidden text-xs text-ink-900/40 sm:block">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>

            {!isPlatform && (
              <div className="hidden items-center gap-2 sm:flex">
                <Badge
                  tone={
                    me?.store?.openStatus
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-ink-900/5 text-ink-500 ring-ink-900/10'
                  }
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      me?.store?.openStatus ? 'bg-emerald-500' : 'bg-ink-900/30',
                    )}
                  />
                  {me?.store?.openStatus ? '营业中' : '休息中'}
                </Badge>
                <Badge tone={online ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-ink-900/5 text-ink-400 ring-ink-900/10'}>
                  {online ? '实时在线' : '轮询模式'}
                </Badge>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(isPlatform ? '/platform/merchants' : '/orders')}
              className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-ink-800 sm:inline-flex"
            >
              {isPlatform ? '商户列表' : '处理订单'}
              <ChevronRight size={14} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
