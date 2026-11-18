import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CartBar } from '../components/CartBar';
import { SpecSheet, type SpecPick } from '../components/SpecSheet';
import { addLine, countOf, getLines, subscribe } from '../lib/cart';
import { api } from '../lib/api';
import { fen, yuan } from '../lib/format';
import { useShop } from '../shop';
import type { Category, Product } from '../lib/types';
import { useSyncExternalStore } from 'react';

type OrderType = 'DINE_IN' | 'DELIVERY';

interface ProductVM extends Product {
  specPreview: string[];
}

type MenuCategory = Omit<Category, 'products'> & { products: ProductVM[] };

export default function MenuPage() {
  const { boot, scene } = useShop();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState('');
  const [specProduct, setSpecProduct] = useState<ProductVM | null>(null);
  const [toast, setToast] = useState('');

  const hasTable = Boolean(boot?.table);
  const [orderType, setOrderType] = useState<OrderType>(() => {
    const fromQuery = search.get('type');
    if (fromQuery === 'DELIVERY') return 'DELIVERY';
    if (fromQuery === 'DINE_IN' && hasTable) return 'DINE_IN';
    return hasTable ? 'DINE_IN' : 'DELIVERY';
  });

  useSyncExternalStore(subscribe, getLines, getLines);

  useEffect(() => {
    let alive = true;
    api
      .get<Category[]>(`/client/menu?scene=${encodeURIComponent(scene)}`)
      .then((data) => {
        if (!alive) return;
        const mapped = data.map((category) => ({
          ...category,
          products: category.products.map((product) => ({
            ...product,
            specPreview: previewOf(product),
          })),
        }));
        setMenu(mapped);
        setActiveId(mapped[0]?.id || '');
      })
      .catch((err) => alive && setError((err as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scene]);

  const current = useMemo(() => menu.find((item) => item.id === activeId) || menu[0], [menu, activeId]);
  const store = boot?.store;

  const storageHint =
    orderType === 'DELIVERY'
      ? store && store.deliveryMinAmount > 0
        ? `满 ${yuan(store.deliveryMinAmount)} 元起送`
        : '配送到家'
      : hasTable
        ? `送至 ${boot?.table?.area} ${boot?.table?.name} 桌`
        : '请扫描桌码';

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const switchType = (type: OrderType) => {
    if (type === 'DINE_IN' && !hasTable) {
      showToast('堂食请扫描桌面上的点单码');
      return;
    }
    setOrderType(type);
  };

  const handleProduct = (product: ProductVM) => {
    if (product.soldOut) {
      showToast('该菜品已售罄');
      return;
    }
    if (store && !store.openStatus) {
      showToast('门店休息中，暂不接单');
      return;
    }
    if (product.specGroups.length > 0) {
      setSpecProduct(product);
      return;
    }
    addLine({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl || '',
      unitPrice: product.price,
      specOptionIds: [],
      specText: '',
    });
  };

  const handleSpecConfirm = (pick: SpecPick) => {
    addLine(pick);
    setSpecProduct(null);
  };

  const checkout = () => {
    if (store && !store.openStatus) {
      showToast('门店休息中，暂不接单');
      return;
    }
    navigate(`/t/${scene}/checkout?type=${orderType}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 shrink-0 bg-[#FBF7F2]/95 backdrop-blur">
        <div className="flex items-center justify-between px-3 pt-2.5">
          <div className="flex rounded-[13px] bg-[#F1EBE3] p-[3px]">
            {(['DINE_IN', 'DELIVERY'] as OrderType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                className={
                  orderType === type
                    ? 'h-7 cursor-pointer rounded-[10px] bg-ink-900 px-3.5 text-[12px] font-semibold text-white'
                    : `h-7 cursor-pointer rounded-[10px] px-3.5 text-[12px] ${type === 'DINE_IN' && !hasTable ? 'text-ink-400/50' : 'text-ink-500'}`
                }
              >
                {type === 'DINE_IN' ? '堂食' : '外卖'}
              </button>
            ))}
          </div>
          <Link to={`/t/${scene}/orders`} className="text-[12px] text-ink-400">
            我的订单 ›
          </Link>
        </div>

        <div className="px-3 pb-2 pt-2">
          <h1 className="truncate text-[19px] font-bold leading-tight">{store?.name || boot?.tenant.name}</h1>
          <p className="mt-0.5 truncate text-[11px] text-ink-400">
            <span className={store?.openStatus ? 'text-emerald-600' : 'text-amber-500'}>
              {store?.openStatus ? '营业中' : '休息中'}
            </span>
            <span className="mx-1 text-line">|</span>
            {storageHint}
            {orderType === 'DELIVERY' && store && store.deliveryEta > 0 && ` · 约 ${store.deliveryEta} 分钟`}
          </p>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2.5">
          {menu.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveId(category.id)}
              className={
                activeId === category.id
                  ? 'btn-brand shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold'
                  : 'shrink-0 cursor-pointer rounded-full bg-[#F5F0E9] px-3.5 py-1.5 text-[12.5px] text-ink-500'
              }
            >
              {category.icon ? `${category.icon} ` : ''}
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-3 p-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-[13px] text-ink-500">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 cursor-pointer rounded-full border border-line px-4 py-1.5 text-[12px]"
          >
            重新加载
          </button>
        </div>
      ) : (
        <div className="flex flex-1">
          <aside className="w-[78px] shrink-0 bg-[#F8F4EE]">
            {menu.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveId(category.id)}
                className={`relative flex min-h-[62px] w-full cursor-pointer flex-col items-center justify-center px-1.5 py-2 text-center ${
                  activeId === category.id ? 'bg-white' : ''
                }`}
              >
                {activeId === category.id && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand" />
                )}
                {category.promoTitle ? (
                  <span
                    className={
                      activeId === category.id
                        ? 'w-full rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] px-1 py-1.5'
                        : 'w-full rounded-lg bg-brand-light px-1 py-1.5'
                    }
                  >
                    <span className={`block truncate text-[9px] ${activeId === category.id ? 'text-white/75' : 'text-brand'}`}>
                      {category.promoLabel}
                    </span>
                    <span className={`mt-0.5 block text-[11px] font-semibold leading-tight ${activeId === category.id ? 'text-white' : 'text-ink-900'}`}>
                      {category.promoTitle}
                    </span>
                  </span>
                ) : (
                  <span className={`text-[11.5px] leading-tight ${activeId === category.id ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>
                    {category.name}
                  </span>
                )}
              </button>
            ))}
            <div className="h-28" />
          </aside>

          <main className="min-w-0 flex-1 px-3">
            <p className="pb-1 pt-3 text-[13px] font-bold">{current?.name}</p>
            {current?.products.map((product) => {
              const count = countOf(product.id);
              return (
                <div key={product.id} className={`flex gap-2.5 border-b border-line/60 py-2.5 ${product.soldOut ? 'opacity-60' : ''}`}>
                  <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-xl bg-cream">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🍲</div>
                    )}
                    {product.tags?.[0] && (
                      <span className="absolute left-0 top-0 rounded-br-lg rounded-tl-xl bg-gradient-to-br from-red-500 to-brand-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        {product.tags[0]}
                      </span>
                    )}
                    {product.soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink-900/45 text-[10px] tracking-widest text-white">
                        售罄
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-[13.5px] font-semibold leading-tight">{product.name}</p>
                    {product.specPreview.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {product.specPreview.map((chip) => (
                          <span key={chip} className="rounded bg-[#F7F3EE] px-1.5 py-0.5 text-[9.5px] text-ink-400">
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {product.description && (
                      <p className="mt-0.5 truncate text-[10.5px] text-ink-400">{product.description}</p>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-1.5">
                      <p className="flex items-baseline gap-1 text-brand">
                        <span className="text-[11px] font-semibold">¥</span>
                        <span className="font-num text-[17px] font-bold">{fen(product.price)}</span>
                        {product.originalPrice ? (
                          <span className="text-[10px] text-ink-400 line-through">¥{fen(product.originalPrice)}</span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <span className="rounded-full bg-brand-light px-1.5 py-0.5 font-num text-[10px] text-brand">
                            {count}
                          </span>
                        )}
                        {product.soldOut ? (
                          <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-400">售罄</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleProduct(product)}
                            className={
                              product.specGroups.length > 0
                                ? 'cursor-pointer rounded-full border border-brand px-2.5 py-1 text-[11px] font-semibold text-brand active:scale-95'
                                : 'btn-brand flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[16px] leading-none'
                            }
                          >
                            {product.specGroups.length > 0 ? '选规格' : '+'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[9.5px] text-ink-400/70">月售 {product.monthlySales || 0}</p>
                  </div>
                </div>
              );
            })}
            <p className="py-6 text-center text-[10px] text-ink-400/60">— 共 {current?.products.length || 0} 款商品 —</p>
            <div className="h-24" />
          </main>
        </div>
      )}

      <CartBar onCheckout={checkout} hint={orderType === 'DELIVERY' ? storageHint : undefined} />

      {specProduct && (
        <SpecSheet product={specProduct} onClose={() => setSpecProduct(null)} onConfirm={handleSpecConfirm} />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-[12px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

function previewOf(product: Product): string[] {
  const preview: string[] = [];
  product.specGroups.forEach((group) => {
    group.options.forEach((option) => {
      if (preview.length < 3 && option.name && !preview.includes(option.name)) preview.push(option.name);
    });
  });
  return preview;
}
