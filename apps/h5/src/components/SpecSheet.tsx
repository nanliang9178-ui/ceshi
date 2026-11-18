import { useMemo, useState } from 'react';
import { fen } from '../lib/format';
import type { Product } from '../lib/types';

export interface SpecPick {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  specOptionIds: string[];
  specText: string;
}

export function SpecSheet({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (pick: SpecPick) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    product.specGroups.forEach((group) => {
      const defaults = group.options.filter((option) => option.defaultSelected).map((option) => option.id);
      if (defaults.length) {
        init[group.id] = defaults;
      } else if (group.required && !group.multiple && group.options[0]) {
        init[group.id] = [group.options[0].id];
      } else {
        init[group.id] = [];
      }
    });
    return init;
  });
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const delta = useMemo(() => {
    let sum = 0;
    product.specGroups.forEach((group) => {
      const picked = selection[group.id] || [];
      group.options.forEach((option) => {
        if (picked.includes(option.id)) sum += option.priceDelta;
      });
    });
    return sum;
  }, [product, selection]);

  const total = (product.price + delta) * quantity;

  const toggle = (groupId: string, optionId: string) => {
    const group = product.specGroups.find((item) => item.id === groupId);
    if (!group) return;
    setError('');
    setSelection((prev) => {
      const current = prev[groupId] || [];
      if (group.multiple) {
        return {
          ...prev,
          [groupId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [groupId]: [optionId] };
    });
  };

  const confirm = () => {
    for (const group of product.specGroups) {
      if (group.required && !(selection[group.id] || []).length) {
        setError(`请选择${group.name}`);
        return;
      }
    }
    const ids: string[] = [];
    const parts: string[] = [];
    product.specGroups.forEach((group) => {
      const picked = (selection[group.id] || [])
        .map((id) => group.options.find((option) => option.id === id))
        .filter(Boolean) as Array<{ id: string; name: string }>;
      if (picked.length) {
        parts.push(`${group.name}:${picked.map((option) => option.name).join('+')}`);
        picked.forEach((option) => ids.push(option.id));
      }
    });

    onConfirm({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl || '',
      unitPrice: product.price + delta,
      quantity,
      specOptionIds: ids,
      specText: parts.join(' / '),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45" onClick={onClose}>
      <div
        className="w-full animate-sheet-up rounded-t-[26px] bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cream text-2xl">🍲</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{product.name}</p>
            {product.description && (
              <p className="mt-0.5 truncate text-[11.5px] text-ink-400">{product.description}</p>
            )}
            <p className="mt-1 text-brand">
              <span className="text-[11px]">¥</span>
              <span className="font-num text-[20px] font-bold">{fen(total)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/5 text-[13px] text-ink-400"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-4">
          {product.specGroups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-semibold">{group.name}</span>
                <span className="text-[10.5px] text-ink-400">
                  {group.required ? '必选' : '可选'}
                  {group.multiple ? ' · 可多选' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const active = (selection[group.id] || []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group.id, option.id)}
                      className={
                        active
                          ? 'cursor-pointer rounded-full border border-brand bg-brand-light px-3.5 py-1.5 text-[12.5px] font-medium text-brand'
                          : 'cursor-pointer rounded-full border border-transparent bg-cream px-3.5 py-1.5 text-[12.5px] text-ink-500'
                      }
                    >
                      {option.name}
                      {option.priceDelta > 0 && (
                        <span className="ml-1 text-[10.5px] opacity-70">+{fen(option.priceDelta)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {product.specGroups.length === 0 && (
            <p className="py-6 text-center text-[12px] text-ink-400">该菜品无需选择规格</p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="safe-bottom flex items-center gap-3 border-t border-line p-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="h-8 w-8 cursor-pointer rounded-full bg-cream text-[18px] text-ink-700 disabled:opacity-40"
              disabled={quantity <= 1}
            >
              −
            </button>
            <span className="w-9 text-center font-num text-[15px] font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              className="h-8 w-8 cursor-pointer rounded-full bg-cream text-[18px] text-ink-700"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={confirm}
            className="btn-brand h-11 flex-1 cursor-pointer rounded-full text-[14px] font-semibold"
          >
            加入购物车 · ¥{fen(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
