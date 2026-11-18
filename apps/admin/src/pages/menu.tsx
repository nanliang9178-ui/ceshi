import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Layers, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Product } from '../lib/types';
import { fen } from '../lib/utils';
import { useToast } from '../lib/toast';
import { Badge, Card, Empty, Spinner } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/field';
import { Modal } from '../components/ui/modal';
import { ProductFormDrawer } from '../components/product-form';
import { cn } from '../lib/utils';

export default function MenuPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    id?: string;
    name: string;
    icon: string;
    promoLabel: string;
    promoTitle: string;
  }>({ open: false, name: '', icon: '', promoLabel: '', promoTitle: '' });
  const [confirm, setConfirm] = useState<{ open: boolean; type: 'product' | 'category'; id: string; name: string }>({
    open: false,
    type: 'product',
    id: '',
    name: '',
  });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [categoryList, productList] = await Promise.all([
      api.get<Category[]>('/admin/menu/categories'),
      api.get<Product[]>('/admin/menu/products'),
    ]);
    setCategories(categoryList);
    setProducts(productList);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [load, toast]);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        if (activeCategory !== 'ALL' && product.categoryId !== activeCategory) return false;
        if (keyword.trim() && !product.name.includes(keyword.trim())) return false;
        return true;
      }),
    [products, activeCategory, keyword],
  );

  const toggleSoldOut = async (product: Product) => {
    setBusy(product.id + 'soldout');
    try {
      await api.patch(`/admin/menu/products/${product.id}/availability`, { soldOut: !product.soldOut });
      setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, soldOut: !item.soldOut } : item)));
      toast.success(product.soldOut ? '已恢复售卖' : '已标记售罄');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy('');
    }
  };

  const toggleStatus = async (product: Product) => {
    setBusy(product.id + 'status');
    try {
      const status = product.status === 'ON' ? 'OFF' : 'ON';
      await api.patch(`/admin/menu/products/${product.id}/availability`, { status });
      setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, status } : item)));
      toast.success(status === 'ON' ? '已上架' : '已下架');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy('');
    }
  };

  const duplicate = async (product: Product) => {
    setBusy(product.id + 'copy');
    try {
      await api.post(`/admin/menu/products/${product.id}/duplicate`);
      await load();
      toast.success('已复制为新菜品（默认下架）');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy('');
    }
  };

  const saveCategory = async () => {
    if (!categoryModal.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    const payload = {
      name: categoryModal.name.trim(),
      icon: categoryModal.icon.trim() || undefined,
      promoLabel: categoryModal.promoLabel.trim() || undefined,
      promoTitle: categoryModal.promoTitle.trim() || undefined,
    };
    try {
      if (categoryModal.id) {
        await api.put(`/admin/menu/categories/${categoryModal.id}`, payload);
        toast.success('分类已更新');
      } else {
        await api.post('/admin/menu/categories', payload);
        toast.success('分类已创建');
      }
      setCategoryModal({ open: false, name: '', icon: '', promoLabel: '', promoTitle: '' });
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const doDelete = async () => {
    try {
      if (confirm.type === 'product') {
        await api.del(`/admin/menu/products/${confirm.id}`);
        toast.success('菜品已删除');
      } else {
        await api.del(`/admin/menu/categories/${confirm.id}`);
        toast.success('分类已删除');
        if (activeCategory === confirm.id) setActiveCategory('ALL');
      }
      setConfirm({ ...confirm, open: false });
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (loading) return <Spinner label="正在加载菜单…" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[228px_1fr]">
      {/* 分类 */}
      <Card className="h-fit !p-3 lg:sticky lg:top-[84px]">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-900/35">菜品分类</p>
          <button
            type="button"
            onClick={() => setCategoryModal({ open: true, name: '', icon: '', promoLabel: '', promoTitle: '' })}
            className="cursor-pointer rounded-md p-1 text-brand-600 transition hover:bg-brand-50"
            aria-label="新增分类"
          >
            <Plus size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveCategory('ALL')}
          className={cn(
            'mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
            activeCategory === 'ALL' ? 'bg-ink-900 text-white' : 'text-ink-900/60 hover:bg-ink-900/5',
          )}
        >
          <span>全部菜品</span>
          <span className="num text-[11px] opacity-60">{products.length}</span>
        </button>

        {categories.map((category) => (
          <div key={category.id} className="group relative">
            <button
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
                activeCategory === category.id
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-900/60 hover:bg-ink-900/5',
              )}
            >
              <span className="truncate pr-10 text-left">{category.name}</span>
              <span className="num text-[11px] opacity-60">
                {products.filter((product) => product.categoryId === category.id).length}
              </span>
            </button>
            <div className="absolute right-1 top-1 hidden items-center gap-0.5 rounded-md bg-white/90 px-1 py-0.5 shadow-sm group-hover:flex">
              <button
                type="button"
                onClick={() =>
                  setCategoryModal({
                    open: true,
                    id: category.id,
                    name: category.name,
                    icon: category.icon || '',
                    promoLabel: category.promoLabel || '',
                    promoTitle: category.promoTitle || '',
                  })
                }
                className="cursor-pointer rounded p-1 text-ink-900/40 hover:text-brand-600"
                aria-label="编辑分类"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => setConfirm({ open: true, type: 'category', id: category.id, name: category.name })}
                className="cursor-pointer rounded p-1 text-ink-900/40 hover:text-red-500"
                aria-label="删除分类"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-ink-900/35">还没有分类，先创建一个</p>
        )}
      </Card>

      {/* 菜品 */}
      <div className="space-y-3">
        <Card className="flex items-center gap-3 !p-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索菜品名称"
              className="h-9 pl-9 text-[13px]"
            />
          </div>
          <Button
            size="md"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
            className="h-9"
          >
            新增菜品
          </Button>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <Empty
              title="这个分类下还没有菜品"
              description="添加第一道菜，顾客扫码后即可点单"
              icon={<UtensilsCrossed size={22} />}
              action={
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setEditing(null);
                    setDrawerOpen(true);
                  }}
                >
                  添加菜品
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card',
                  product.status === 'OFF' ? 'border-line/60 opacity-70' : 'border-line/80',
                )}
              >
                <div className="relative h-36 overflow-hidden bg-cream">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className={cn(
                        'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
                        product.soldOut && 'grayscale',
                      )}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-900/15">
                      <UtensilsCrossed size={30} />
                    </div>
                  )}
                  {product.soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-900/45">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-ink-900">
                        已售罄
                      </span>
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {product.status === 'OFF' && <Badge tone="bg-ink-900/70 text-white ring-white/20">已下架</Badge>}
                    {product.specGroups && product.specGroups.length > 0 && (
                      <Badge tone="bg-white/85 text-ink-900 ring-white/40">
                        <Layers size={10} /> {product.specGroups.length} 规格
                      </Badge>
                    )}
                  </div>
                  <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(product);
                        setDrawerOpen(true);
                      }}
                      className="cursor-pointer rounded-lg bg-white/90 p-1.5 text-ink-900/60 backdrop-blur transition hover:text-brand-600"
                      aria-label="编辑"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(product)}
                      className="cursor-pointer rounded-lg bg-white/90 p-1.5 text-ink-900/60 backdrop-blur transition hover:text-brand-600"
                      aria-label="复制"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ open: true, type: 'product', id: product.id, name: product.name })}
                      className="cursor-pointer rounded-lg bg-white/90 p-1.5 text-ink-900/60 backdrop-blur transition hover:text-red-500"
                      aria-label="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-[14px] font-medium text-ink-900">{product.name}</h4>
                    <span className="num shrink-0 text-[15px] font-semibold text-brand-600">
                      ¥{fen(product.price)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-900/40">
                    {product.description || '暂无描述'}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-900/35">
                    <span>月售 {product.monthlySales}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSoldOut(product)}
                        disabled={busy === product.id + 'soldout'}
                        className={cn(
                          'cursor-pointer rounded-md px-1.5 py-0.5 transition',
                          product.soldOut
                            ? 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                            : 'hover:bg-ink-900/5 hover:text-ink-900/70',
                        )}
                      >
                        {product.soldOut ? '恢复售卖' : '标记售罄'}
                      </button>
                      <span className="h-3 w-px bg-line" />
                      <button
                        type="button"
                        onClick={() => toggleStatus(product)}
                        disabled={busy === product.id + 'status'}
                        className="cursor-pointer rounded-md px-1.5 py-0.5 transition hover:bg-ink-900/5 hover:text-ink-900/70"
                      >
                        {product.status === 'ON' ? '下架' : '上架'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductFormDrawer
        open={drawerOpen}
        product={editing}
        categories={categories}
        defaultCategoryId={activeCategory === 'ALL' ? undefined : activeCategory}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => load().catch(console.error)}
      />

      <Modal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, name: '', icon: '', promoLabel: '', promoTitle: '' })}
        title={categoryModal.id ? '编辑分类' : '新增分类'}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModal({ open: false, name: '', icon: '', promoLabel: '', promoTitle: '' })}
            >
              取消
            </Button>
            <Button size="sm" onClick={saveCategory}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">分类名称</span>
            <Input
              value={categoryModal.name}
              onChange={(event) => setCategoryModal({ ...categoryModal, name: event.target.value })}
              placeholder="如 招牌必点"
              maxLength={20}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">分类图标</span>
            <Input
              value={categoryModal.icon}
              onChange={(event) => setCategoryModal({ ...categoryModal, icon: event.target.value })}
              placeholder="填一个 emoji，如 🔥 🍜 🧋"
              maxLength={8}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">左侧角标</span>
              <Input
                value={categoryModal.promoLabel}
                onChange={(event) => setCategoryModal({ ...categoryModal, promoLabel: event.target.value })}
                placeholder="如 99元起"
                maxLength={12}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">角标副标题</span>
              <Input
                value={categoryModal.promoTitle}
                onChange={(event) => setCategoryModal({ ...categoryModal, promoTitle: event.target.value })}
                placeholder="如 新人专区"
                maxLength={12}
              />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-900/40">
            图标展示在点单页顶部横向分类条；角标展示在左侧竖栏，留空则只显示分类名。
          </p>
        </div>
      </Modal>

      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        title={confirm.type === 'product' ? '删除菜品' : '删除分类'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirm({ ...confirm, open: false })}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={doDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-ink-900/70">
          确定要删除「<b className="text-ink-900">{confirm.name}</b>」吗？
          {confirm.type === 'product'
            ? '删除后历史订单不受影响，但顾客将无法再点这道菜。'
            : '分类下仍有菜品时无法删除，请先移动菜品。'}
        </p>
      </Modal>
    </div>
  );
}
