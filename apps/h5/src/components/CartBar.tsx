import { useSyncExternalStore, useState } from 'react';
import { changeQuantity, clearCart, getLines, summary, subscribe } from '../lib/cart';
import { fen } from '../lib/format';

export function CartBar({
  onCheckout,
  hint,
}: {
  onCheckout: () => void;
  hint?: string;
}) {
  const lines = useSyncExternalStore(subscribe, getLines, getLines);
  const [open, setOpen] = useState(false);
  const { count, amount } = summary();

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <div className="flex h-[54px] items-center justify-between rounded-full bg-ink-900 pl-3 pr-1.5 shadow-bar">
          <button
            type="button"
            onClick={() => count > 0 && setOpen(true)}
            className="flex min-w-0 flex-1 cursor-pointer items-center"
          >
            <span
              className={
                count > 0
                  ? 'btn-brand relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px]'
                  : 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[16px] text-white/70'
              }
            >
              🛒
              {count > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-white px-1 text-center font-num text-[10px] font-bold text-brand">
                  {count}
                </span>
              )}
            </span>
            <span className="ml-2 flex min-w-0 items-baseline gap-1 text-white">
              {count > 0 ? (
                <>
                  <span className="text-[11px]">¥</span>
                  <span className="font-num text-[19px] font-bold">{fen(amount)}</span>
                </>
              ) : (
                <span className="truncate text-[12px] text-white/45">{hint || '未选购菜品'}</span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={count === 0}
            className={
              count > 0
                ? 'btn-brand h-10 shrink-0 cursor-pointer rounded-full px-5 text-[13.5px] font-semibold'
                : 'h-10 shrink-0 rounded-full bg-white/15 px-5 text-[13.5px] font-semibold text-white/40'
            }
          >
            去结算
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45" onClick={() => setOpen(false)}>
          <div
            className="w-full animate-sheet-up rounded-t-[26px] bg-white pb-[calc(env(safe-area-inset-bottom)+86px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <span className="text-[14px] font-semibold">已选菜品</span>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setOpen(false);
                }}
                className="cursor-pointer text-[12px] text-ink-400"
              >
                清空
              </button>
            </div>
            <div className="max-h-[46vh] overflow-y-auto px-4">
              {lines.map((line) => (
                <div key={line.key} className="flex items-center gap-3 border-b border-line/70 py-2.5 last:border-0">
                  {line.imageUrl ? (
                    <img src={line.imageUrl} alt={line.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream text-lg">🍲</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{line.name}</p>
                    {line.specText && <p className="truncate text-[10.5px] text-ink-400">{line.specText}</p>}
                    <p className="font-num text-[13px] font-semibold text-brand">¥{fen(line.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.key, -1)}
                      className="h-7 w-7 cursor-pointer rounded-full bg-cream text-[15px] leading-none"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-num text-[13px] font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.key, 1)}
                      className="h-7 w-7 cursor-pointer rounded-full bg-brand-light text-[15px] leading-none text-brand"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
