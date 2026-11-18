import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { SpecGroup } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/field';
import { cn } from '../lib/utils';

/**
 * 规格 / 加料编辑器
 * 例：份量（单选必选）、加料（多选非必选，带加价）
 */
export function SpecEditor({
  value,
  onChange,
}: {
  value: SpecGroup[];
  onChange: (groups: SpecGroup[]) => void;
}) {
  const update = (index: number, patch: Partial<SpecGroup>) => {
    const next = value.map((group, i) => (i === index ? { ...group, ...patch } : group));
    onChange(next);
  };

  const addGroup = () => {
    onChange([
      ...value,
      { name: '', required: true, multiple: false, options: [{ name: '', priceDelta: 0, defaultSelected: true }] },
    ]);
  };

  const removeGroup = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addOption = (groupIndex: number) => {
    const group = value[groupIndex];
    onChange(
      value.map((item, i) =>
        i === groupIndex
          ? { ...item, options: [...item.options, { name: '', priceDelta: 0, defaultSelected: false }] }
          : item,
      ),
    );
    void group;
  };

  const updateOption = (groupIndex: number, optionIndex: number, patch: Partial<SpecGroup['options'][0]>) => {
    onChange(
      value.map((group, i) => {
        if (i !== groupIndex) return group;
        const options = group.options.map((option, j) => (j === optionIndex ? { ...option, ...patch } : option));
        return { ...group, options };
      }),
    );
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    onChange(
      value.map((group, i) =>
        i === groupIndex ? { ...group, options: group.options.filter((_, j) => j !== optionIndex) } : group,
      ),
    );
  };

  const setDefault = (groupIndex: number, optionIndex: number) => {
    const group = value[groupIndex];
    onChange(
      value.map((item, i) => {
        if (i !== groupIndex) return item;
        const options = item.options.map((option, j) => ({
          ...option,
          defaultSelected: item.multiple ? (j === optionIndex ? !option.defaultSelected : option.defaultSelected) : j === optionIndex,
        }));
        return { ...item, options };
      }),
    );
    void group;
  };

  return (
    <div className="space-y-3">
      {value.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-xl border border-line bg-cream/40 p-3.5">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="shrink-0 text-ink-900/20" />
            <Input
              value={group.name}
              onChange={(event) => update(groupIndex, { name: event.target.value })}
              placeholder="规格名称，如 辣度 / 份量"
              className="h-8 flex-1 bg-white text-[13px]"
            />
            <button
              type="button"
              onClick={() => removeGroup(groupIndex)}
              className="cursor-pointer rounded-lg p-1.5 text-ink-900/30 transition hover:bg-red-50 hover:text-red-500"
              aria-label="删除规格组"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-3 pl-6">
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-900/60">
              <input
                type="checkbox"
                checked={group.required}
                onChange={(event) => update(groupIndex, { required: event.target.checked })}
                className="h-3.5 w-3.5 cursor-pointer accent-[#FF5A1F]"
              />
              必选
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-900/60">
              <input
                type="checkbox"
                checked={group.multiple}
                onChange={(event) => update(groupIndex, { multiple: event.target.checked })}
                className="h-3.5 w-3.5 cursor-pointer accent-[#FF5A1F]"
              />
              可多选（加料）
            </label>
          </div>

          <div className="mt-2.5 space-y-1.5 pl-6">
            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDefault(groupIndex, optionIndex)}
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 cursor-pointer rounded-full border transition',
                    option.defaultSelected
                      ? 'border-brand-500 bg-brand-500 ring-2 ring-brand-500/20'
                      : 'border-ink-900/25 bg-white',
                  )}
                  title="设为默认选中"
                  aria-label="设为默认"
                />
                <Input
                  value={option.name}
                  onChange={(event) => updateOption(groupIndex, optionIndex, { name: event.target.value })}
                  placeholder="选项名，如 微辣"
                  className="h-8 flex-1 bg-white text-[12.5px]"
                />
                <div className="relative w-[92px] shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-900/35">+¥</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={option.priceDelta ? option.priceDelta / 100 : ''}
                    onChange={(event) =>
                      updateOption(groupIndex, optionIndex, {
                        priceDelta: Math.round(Number(event.target.value || 0) * 100),
                      })
                    }
                    placeholder="0"
                    className="h-8 bg-white pl-7 text-[12.5px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(groupIndex, optionIndex)}
                  className="cursor-pointer rounded-md p-1 text-ink-900/25 transition hover:text-red-500"
                  aria-label="删除选项"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => addOption(groupIndex)} className="h-7">
              添加选项
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={addGroup} className="w-full border-dashed">
        添加规格组（如辣度、份量、加料）
      </Button>
    </div>
  );
}
