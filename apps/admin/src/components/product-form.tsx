import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Product, SpecGroup } from '../lib/types';
import { toFen } from '../lib/utils';
import { useToast } from '../lib/toast';
import { Button } from './ui/button';
import { Field, Input, Select, Switch, Textarea } from './ui/field';
import { Drawer } from './ui/modal';
import { SpecEditor } from './spec-editor';

interface FormState {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  originalPrice: string;
  unit: string;
  tags: string[];
  stockEnabled: boolean;
  stock: string;
  soldOut: boolean;
  status: string;
  specGroups: SpecGroup[];
}

const TAG_PRESETS = ['招牌', '新品', '热销', '推荐'];

const EMPTY: FormState = {
  categoryId: '',
  name: '',
  description: '',
  imageUrl: '',
  price: '',
  originalPrice: '',
  unit: '份',
  tags: [],
  stockEnabled: false,
  stock: '0',
  soldOut: false,
  status: 'ON',
  specGroups: [],
};

export function ProductFormDrawer({
  open,
  product,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (product) {
      setForm({
        categoryId: product.categoryId,
        name: product.name,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        price: (product.price / 100).toFixed(2).replace(/\.00$/, ''),
        originalPrice: product.originalPrice ? (product.originalPrice / 100).toFixed(2) : '',
        unit: product.unit,
        tags: (product.tags || '').split(',').filter(Boolean),
        stockEnabled: product.stockEnabled,
        stock: String(product.stock),
        soldOut: product.soldOut,
        status: product.status,
        specGroups: (product.specGroups || []).map((group) => ({
          name: group.name,
          required: group.required,
          multiple: group.multiple,
          options: group.options.map((option) => ({
            name: option.name,
            priceDelta: option.priceDelta,
            defaultSelected: option.defaultSelected,
          })),
        })),
      });
    } else {
      setForm({ ...EMPTY, categoryId: defaultCategoryId || categories[0]?.id || '' });
    }
  }, [open, product, defaultCategoryId, categories]);

  const patch = (value: Partial<FormState>) => setForm((prev) => ({ ...prev, ...value }));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.upload(file, 'image');
      patch({ imageUrl: result.url });
      toast.success('图片上传成功');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const priceFen = useMemo(() => toFen(form.price || 0), [form.price]);

  const save = async () => {
    if (!form.categoryId) {
      setError('请选择菜品分类');
      return;
    }
    if (!form.name.trim()) {
      setError('请输入菜品名称');
      return;
    }
    if (priceFen <= 0) {
      setError('请填写正确的售价');
      return;
    }
    if (form.originalPrice && toFen(form.originalPrice) <= priceFen) {
      setError('划线价需高于售价');
      return;
    }
    for (const group of form.specGroups) {
      if (!group.name.trim()) {
        setError('规格名称不能为空');
        return;
      }
      if (group.options.some((option) => !option.name.trim())) {
        setError(`「${group.name}」存在未命名的选项`);
        return;
      }
    }

    setSaving(true);
    setError('');
    const payload = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      price: priceFen,
      originalPrice: form.originalPrice ? toFen(form.originalPrice) : undefined,
      unit: form.unit || '份',
      tags: form.tags,
      stockEnabled: form.stockEnabled,
      stock: Number(form.stock) || 0,
      soldOut: form.soldOut,
      status: form.status,
      specGroups: form.specGroups.map((group) => ({
        name: group.name.trim(),
        required: group.required,
        multiple: group.multiple,
        options: group.options.map((option) => ({
          name: option.name.trim(),
          priceDelta: option.priceDelta,
          defaultSelected: option.defaultSelected,
        })),
      })),
    };

    try {
      if (product) {
        await api.put(`/admin/menu/products/${product.id}`, payload);
        toast.success('菜品已更新');
      } else {
        await api.post('/admin/menu/products', payload);
        toast.success('菜品已创建');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={product ? '编辑菜品' : '新增菜品'}
      subtitle="规格与加料会实时同步到小程序点单页"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" loading={saving} onClick={save}>
            {product ? '保存修改' : '创建菜品'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-dashed border-line bg-cream">
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} alt="菜品图" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => patch({ imageUrl: '' })}
                  className="absolute right-1 top-1 cursor-pointer rounded-md bg-ink-900/60 p-1 text-white backdrop-blur transition hover:bg-red-500"
                  aria-label="删除图片"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-ink-900/35 transition hover:bg-brand-50/60 hover:text-brand-500">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={20} />}
                <span className="text-[11px]">{uploading ? '上传中' : '上传图片'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <Field label="菜品名称" required>
              <Input
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="如 巷子口酸菜鱼"
                maxLength={40}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="所属分类" required>
                <Select value={form.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
                  <option value="">请选择分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="单位">
                <Input value={form.unit} onChange={(event) => patch({ unit: event.target.value })} placeholder="份 / 例 / 杯" />
              </Field>
            </div>
          </div>
        </div>

        <Field label="菜品描述" hint="一句话讲清楚卖点，会显示在点单页">
          <Textarea
            value={form.description}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="现杀黑鱼片，酸爽开胃，2-3 人份"
            maxLength={200}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="售价（元）" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(event) => patch({ price: event.target.value })}
              placeholder="68.00"
            />
          </Field>
          <Field label="划线价（元）" hint="选填，仅展示">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.originalPrice}
              onChange={(event) => patch({ originalPrice: event.target.value })}
              placeholder="78.00"
            />
          </Field>
          <Field label="库存数量">
            <Input
              type="number"
              min="0"
              disabled={!form.stockEnabled}
              value={form.stock}
              onChange={(event) => patch({ stock: event.target.value })}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink-800">菜品标签</p>
            <span className="text-[11px] text-ink-900/35">显示在点单页卡片左上角</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_PRESETS.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    patch({
                      tags: active ? form.tags.filter((item) => item !== tag) : [...form.tags, tag],
                    })
                  }
                  className={
                    active
                      ? 'cursor-pointer rounded-full bg-brand-500 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_6px_14px_-8px_rgba(255,90,31,0.9)]'
                      : 'cursor-pointer rounded-full bg-cream px-3.5 py-1.5 text-[12.5px] text-ink-900/50 ring-1 ring-inset ring-black/[0.06] transition hover:text-ink-900'
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 rounded-xl bg-cream/60 px-4 py-3">
          <Switch checked={form.status === 'ON'} onChange={(value) => patch({ status: value ? 'ON' : 'OFF' })} label="上架售卖" />
          <Switch checked={form.soldOut} onChange={(value) => patch({ soldOut: value })} label="今日售罄" />
          <Switch checked={form.stockEnabled} onChange={(value) => patch({ stockEnabled: value })} label="启用库存" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink-800">规格与加料</p>
            <span className="text-[11px] text-ink-900/35">不设置则默认无规格，可直接下单</span>
          </div>
          <SpecEditor value={form.specGroups} onChange={(groups) => patch({ specGroups: groups })} />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600 ring-1 ring-inset ring-red-100">
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}
