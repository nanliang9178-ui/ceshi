import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Check, ChefHat, Monitor, RefreshCw, Search, Store as StoreIcon, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { cn, durationText, fen, fenShort } from '../lib/utils';
import type { Category, DashboardData, Order, Product } from '../lib/types';

const ACTIVE_STATUS = ['PENDING', 'PREPARING'];

function todayLabel(): string {
  const date = new Date();
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export default function BossPage() {
  const { me, logout, refresh } = useAuth();
  const toast = useToast();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState('ALL');

  const store = me?.store;
  const isOpen = store?.openStatus !== false;

  // 品牌色跟随商户配置（白标）
  const brandColor = me?.brand?.primaryColor || '#FF5A1F';
  const brandDark = shadeHex(brandColor, -16);
  const brandVars = { '--brand': brandColor, '--brand-dark': brandDark } as CSSProperties;

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(true);
      try {
        const [dash, orderPage, productList, categoryList] = await Promise.all([
          api.get<DashboardData>('/admin/stats/dashboard'),
          api.get<{ list: Order[]; total: number }>('/admin/orders', { page: 1, pageSize: 50 }),
          api.get<Product[]>('/admin/menu/products'),
          api.get<Category[]>('/admin/menu/categories'),
        ]);
        setDashboard(dash);
        setOrders((orderPage.list || []).filter((order) => ACTIVE_STATUS.includes(order.status)));
        setProducts(productList || []);
        setCategories(categoryList || []);
      } catch (error: any) {
        if (!silent) toast.error(error?.message || '数据加载失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (order: Order, action: 'accept' | 'ready') => {
    setActing(order.id + action);
    try {
      await api.post(`/admin/orders/${order.id}/${action}`);
      toast.success(action === 'accept' ? '已接单' : '已出餐');
      await load(true);
    } catch (error: any) {
      toast.error(error?.message || '操作失败');
    } finally {
      setActing('');
    }
  };

  const toggleSoldOut = async (product: Product) => {
    setActing(product.id);
    try {
      await api.patch(`/admin/menu/products/${product.id}/availability`, { soldOut: !product.soldOut });
      setProducts((list) => list.map((item) => (item.id === product.id ? { ...item, soldOut: !item.soldOut } : item)));
      toast.success(product.soldOut ? '已恢复售卖' : '已标记估清');
    } catch (error: any) {
      toast.error(error?.message || '操作失败');
    } finally {
      setActing('');
    }
  };

  const toggleOpen = async () => {
    try {
      await api.put('/admin/store', { openStatus: !isOpen });
      await refresh();
      toast.success(!isOpen ? '已开始接单' : '已暂停接单');
    } catch (error: any) {
      toast.error(error?.message || '操作失败');
    }
  };

  const visibleProducts = useMemo(() => {
    const key = keyword.trim();
    return products.filter((product) => {
      if (tab !== 'ALL' && product.categoryId !== tab) return false;
      if (!key) return true;
      return product.name.includes(key);
    });
  }, [products, keyword, tab]);

  const pendingCount = orders.filter((order) => order.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#F6F1EA] pb-16" style={brandVars}>
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#FBF7F2]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[560px] items-center gap-3 px-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
          >
            {(store?.name || '店').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink-900">{store?.name || '我的门店'}</p>
            <p className="text-[11px] text-ink-900/40">{todayLabel()} · 老板台</p>
          </div>
          <button
            type="button"
            onClick={toggleOpen}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-inset transition',
              isOpen
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200',
            )}
          >
            {isOpen ? '接单中' : '已打烊'}
          </button>
          <Link
            to="/"
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-ink-900/45 transition hover:bg-black/5 hover:text-ink-900"
            title="进入完整商户后台"
          >
            <Monitor size={14} />
            后台
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] space-y-4 px-4 pt-4">
        {/* 今日盈利 */}
        <section
          className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_40px_-24px_rgba(23,24,28,0.55)]"
          style={{ backgroundImage: 'linear-gradient(140deg, var(--brand), var(--brand-dark))' }}
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-16 -left-6 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[12px] tracking-wide text-white/75">今日盈利（已收款）</p>
          <div className="relative mt-1 flex items-end gap-2">
            <span className="text-[22px] font-semibold leading-none">¥</span>
            <span className="num text-[46px] font-bold leading-none tracking-tight">
              {fenShort(dashboard?.today.amount || 0)}
            </span>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-white/65">订单数</p>
              <p className="num mt-0.5 text-[17px] font-semibold">{dashboard?.today.count || 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/65">客单价</p>
              <p className="num mt-0.5 text-[17px] font-semibold">¥{fenShort(dashboard?.today.avgPrice || 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/65">待做</p>
              <p className="num mt-0.5 text-[17px] font-semibold">{orders.length}</p>
            </div>
          </div>
        </section>

        {/* 待做订单 */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-900">
              待做订单
              {pendingCount > 0 && (
                <span
                  className="num rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  {pendingCount} 新
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => load(true)}
              className="flex cursor-pointer items-center gap-1 text-[11px] text-ink-900/40"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              10 秒自动刷新
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((item) => (
                <div key={item} className="skeleton h-28 rounded-2xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 py-10 ring-1 ring-inset ring-black/[0.04]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Utensils size={18} />
              </div>
              <p className="text-[13px] text-ink-900/50">当前没有待做订单，休息一下</p>
              <p className="text-[11px] text-ink-900/30">新订单会自动出现在这里并提示</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((order) => {
                const isDelivery = order.type === 'DELIVERY';
                const waiting = durationText(order.createdAt);
                return (
                  <article
                    key={order.id}
                    className={cn(
                      'rounded-2xl bg-white p-4 ring-1 ring-inset transition',
                      order.status === 'PENDING' ? 'ring-brand-200 shadow-[0_10px_26px_-22px_rgba(255,90,31,0.9)]' : 'ring-black/[0.05]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'num rounded-lg px-2 py-1 text-[12px] font-semibold text-white',
                            isDelivery ? 'bg-sky-500' : 'bg-ink-900',
                          )}
                        >
                          {isDelivery ? '外卖' : order.tableName || '自取'}
                        </span>
                        {!isDelivery && order.pickupNo && (
                          <span className="num text-[11px] text-ink-900/35">#{order.pickupNo}</span>
                        )}
                        {order.status === 'PREPARING' && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            制作中
                          </span>
                        )}
                      </div>
                      <span className="num text-[11px] text-ink-900/35">{waiting}</span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-[12.5px]">
                          <span className="num shrink-0 text-ink-900/35">{item.quantity}×</span>
                          <span className="truncate text-ink-900/75">{item.productName}</span>
                          {item.specText && (
                            <span className="hidden truncate text-[10.5px] text-ink-900/30 sm:inline">{item.specText}</span>
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-ink-900/30">等 {order.items.length} 项商品</p>
                      )}
                    </div>

                    {order.remark && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11.5px] text-amber-700">
                        备注：{order.remark}
                      </p>
                    )}

                    {isDelivery && order.address && (
                      <p className="mt-2 flex items-start gap-1 rounded-lg bg-sky-50 px-2 py-1.5 text-[11.5px] text-sky-800">
                        <Bike size={12} className="mt-0.5 shrink-0" />
                        <span className="flex-1">
                          {order.receiverName} {order.receiverPhone}
                          <br />
                          {order.address}
                        </span>
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="num text-[18px] font-bold text-ink-900">¥{fen(order.totalAmount)}</span>
                        <span className="text-[11px] text-ink-900/35">共 {order.itemCount} 件</span>
                      </div>
                      {order.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => act(order, 'accept')}
                          disabled={acting === order.id + 'accept'}
                          className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(23,24,28,0.5)] active:scale-[0.98] disabled:opacity-60"
                          style={{ backgroundImage: 'linear-gradient(180deg, var(--brand), var(--brand-dark))' }}
                        >
                          <ChefHat size={14} />
                          接单
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => act(order, 'ready')}
                          disabled={acting === order.id + 'ready'}
                          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[13px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
                        >
                          <Check size={14} />
                          出餐完成
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 我的菜品 */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-semibold text-ink-900">
              我的菜品
              <span className="num ml-1 text-[11px] font-normal text-ink-900/35">{products.length} 个</span>
            </h2>
            <Link to="/menu" className="text-[11px] text-brand-600">
              新增 / 编辑 →
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-inset ring-black/[0.05]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索菜品名称"
                className="h-9 w-full rounded-lg border-0 bg-[#F7F2EC] pl-8 pr-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-900/30"
              />
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTab('ALL')}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full px-3 py-1 text-[11.5px] transition',
                  tab === 'ALL' ? 'bg-ink-900 text-white' : 'bg-[#F7F2EC] text-ink-900/50',
                )}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setTab(category.id)}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-full px-3 py-1 text-[11.5px] transition',
                    tab === category.id ? 'bg-ink-900 text-white' : 'bg-[#F7F2EC] text-ink-900/50',
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="mt-1 divide-y divide-black/[0.04]">
              {visibleProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 py-2.5">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F7F2EC] text-lg">
                      🍲
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-[13px] font-medium', product.soldOut ? 'text-ink-900/35' : 'text-ink-900')}>
                      {product.name}
                    </p>
                    <p className="num text-[11px] text-ink-900/40">
                      ¥{fen(product.price)}
                      <span className="ml-1.5 font-sans">月售 {product.monthlySales}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSoldOut(product)}
                    disabled={acting === product.id}
                    className={cn(
                      'shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-inset transition disabled:opacity-50',
                      product.soldOut
                        ? 'bg-ink-900/5 text-ink-900/45 ring-black/5'
                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                    )}
                  >
                    {product.soldOut ? '已估清' : '在售'}
                  </button>
                </div>
              ))}
              {visibleProducts.length === 0 && (
                <div className="flex flex-col items-center gap-1 py-8 text-ink-900/35">
                  <StoreIcon size={18} />
                  <p className="text-[12px]">没有匹配的菜品</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-ink-900/30">
          <span>数据每 10 秒自动刷新</span>
          <button type="button" onClick={logout} className="cursor-pointer hover:text-ink-900/60">
            退出登录
          </button>
        </div>
      </main>
    </div>
  );
}

/** 把品牌色按百分比调暗，用于生成渐变的深色端 */
function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const value = parseInt(clean, 16);
  const delta = Math.round((255 * percent) / 100);
  const parts = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) =>
    Math.max(0, Math.min(255, c + delta)),
  );
  return `#${parts.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}