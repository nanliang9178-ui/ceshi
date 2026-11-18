import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { clearCart, getLines, summary } from '../lib/cart';
import { fen, yuan } from '../lib/format';
import { useShop } from '../shop';
import type { Order } from '../lib/types';

const ADDRESS_KEY = 'ts_h5_address';

interface Address {
  name: string;
  phone: string;
  address: string;
}

export default function CheckoutPage() {
  const { boot, scene } = useShop();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const store = boot?.store;
  const lines = getLines();

  const [type, setType] = useState<'DINE_IN' | 'DELIVERY'>(
    search.get('type') === 'DELIVERY' || !boot?.table ? 'DELIVERY' : 'DINE_IN',
  );
  const [address, setAddress] = useState<Address>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(ADDRESS_KEY) || '{}');
      return { name: raw.name || '', phone: raw.phone || '', address: raw.address || '' };
    } catch {
      return { name: '', phone: '', address: '' };
    }
  });
  const [remark, setRemark] = useState('');
  const [people, setPeople] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { count, amount } = summary();

  const totals = useMemo(() => {
    const threshold = store?.fullReduceThreshold || 0;
    const reduce = store?.fullReduceAmount || 0;
    const discount = threshold > 0 && amount >= threshold ? reduce : 0;
    const delivery = type === 'DELIVERY' ? store?.deliveryFee || 0 : 0;
    return { discount, delivery, total: Math.max(0, amount - discount + delivery) };
  }, [store, amount, type]);

  const minAmount = type === 'DELIVERY' ? store?.deliveryMinAmount || 0 : 0;
  const belowMin = type === 'DELIVERY' && minAmount > 0 && amount < minAmount;

  const setField = (key: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const submit = async () => {
    if (submitting) return;
    if (!count) {
      setError('购物车为空，请先选择菜品');
      return;
    }
    if (store && !store.openStatus) {
      setError('门店休息中，暂不接单');
      return;
    }
    if (type === 'DELIVERY') {
      if (!address.name.trim()) return setError('请填写收货人');
      if (!/^1[3-9]\d{9}$/.test(address.phone.trim())) return setError('请填写正确的手机号');
      if (address.address.trim().length < 5) return setError('请填写详细地址（不少于 5 个字）');
      if (belowMin) return setError(`外卖满 ${yuan(minAmount)} 元起送`);
      localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
    }

    setSubmitting(true);
    setError('');
    try {
      const order = await api.post<Order>('/client/orders', {
        type,
        tableId: type === 'DINE_IN' && boot?.table ? boot.table.id : undefined,
        peopleCount: type === 'DINE_IN' ? people : undefined,
        remark: remark.trim() || undefined,
        receiverName: type === 'DELIVERY' ? address.name.trim() : undefined,
        receiverPhone: type === 'DELIVERY' ? address.phone.trim() : undefined,
        address: type === 'DELIVERY' ? address.address.trim() : undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          specOptionIds: line.specOptionIds,
        })),
        idempotencyKey: `h5-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      clearCart();

      const pay = await api.post<{ mock: boolean; order?: Order }>(`/client/orders/${order.id}/pay`, {});
      if (pay?.mock) {
        navigate(`/t/${scene}/result/${order.id}`, { replace: true });
        return;
      }
      navigate(`/t/${scene}/orders/${order.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!count && !submitting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream px-8 text-center">
        <p className="text-[13px] text-ink-500">购物车是空的</p>
        <button
          type="button"
          onClick={() => navigate(`/t/${scene}`, { replace: true })}
          className="btn-brand cursor-pointer rounded-full px-6 py-2 text-[13px] font-semibold"
        >
          去点单
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-[#FBF7F2]/95 px-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="cursor-pointer text-[15px] text-ink-500">
          ‹
        </button>
        <p className="text-[14px] font-semibold">确认订单</p>
      </header>

      <div className="space-y-2.5 p-3">
        <section className="rounded-2xl bg-white p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => boot?.table && setType('DINE_IN')}
              className={`flex-1 cursor-pointer rounded-xl border-2 py-2.5 text-center ${
                type === 'DINE_IN' ? 'border-brand bg-brand-light' : 'border-transparent bg-cream'
              } ${boot?.table ? '' : 'opacity-45'}`}
            >
              <p className={`text-[14px] font-semibold ${type === 'DINE_IN' ? 'text-brand' : 'text-ink-900'}`}>堂食</p>
              <p className="mt-0.5 text-[10.5px] text-ink-400">
                {boot?.table ? `${boot.table.area} ${boot.table.name}` : '请先扫码'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setType('DELIVERY')}
              className={`flex-1 cursor-pointer rounded-xl border-2 py-2.5 text-center ${
                type === 'DELIVERY' ? 'border-brand bg-brand-light' : 'border-transparent bg-cream'
              }`}
            >
              <p className={`text-[14px] font-semibold ${type === 'DELIVERY' ? 'text-brand' : 'text-ink-900'}`}>外卖</p>
              <p className="mt-0.5 text-[10.5px] text-ink-400">
                约 {store?.deliveryEta || 30} 分钟送达
              </p>
            </button>
          </div>
        </section>

        {type === 'DELIVERY' && (
          <section className="rounded-2xl bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold">配送信息</p>
              <p className="max-w-[60%] truncate text-[10.5px] text-ink-400">{store?.deliveryRange}</p>
            </div>
            <div className="divide-y divide-line/60">
              <label className="flex items-center py-2.5">
                <span className="w-16 shrink-0 text-[12px] text-ink-500">收货人</span>
                <input
                  value={address.name}
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="怎么称呼您"
                  maxLength={20}
                  className="h-7 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-ink-400/60"
                />
              </label>
              <label className="flex items-center py-2.5">
                <span className="w-16 shrink-0 text-[12px] text-ink-500">手机号</span>
                <input
                  value={address.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  placeholder="用于配送联系"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-7 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-ink-400/60"
                />
              </label>
              <label className="flex items-start py-2.5">
                <span className="w-16 shrink-0 pt-1 text-[12px] text-ink-500">地址</span>
                <textarea
                  value={address.address}
                  onChange={(event) => setField('address', event.target.value)}
                  placeholder="小区/写字楼 + 楼栋 + 门牌号"
                  maxLength={120}
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-ink-400/60"
                />
              </label>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-semibold">{store?.name}</p>
            <p className="text-[10.5px] text-ink-400">共 {count} 件</p>
          </div>
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-2.5 border-b border-line/60 py-2 last:border-0">
              {line.imageUrl ? (
                <img src={line.imageUrl} alt={line.name} className="h-11 w-11 rounded-lg object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream text-base">🍲</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{line.name}</p>
                {line.specText && <p className="truncate text-[10px] text-ink-400">{line.specText}</p>}
                <p className="font-num text-[12.5px] font-semibold">¥{fen(line.unitPrice * line.quantity)}</p>
              </div>
              <span className="text-[11px] text-ink-400">x{line.quantity}</span>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-3">
          {type === 'DINE_IN' && (
            <div className="flex items-center justify-between border-b border-line/60 py-2">
              <span className="text-[12.5px] text-ink-500">用餐人数</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeople((value) => Math.max(1, value - 1))}
                  className="h-6 w-6 cursor-pointer rounded-full bg-cream text-[14px] leading-none"
                >
                  −
                </button>
                <span className="w-5 text-center font-num text-[13px] font-semibold">{people}</span>
                <button
                  type="button"
                  onClick={() => setPeople((value) => Math.min(20, value + 1))}
                  className="h-6 w-6 cursor-pointer rounded-full bg-brand-light text-[14px] leading-none text-brand"
                >
                  +
                </button>
              </div>
            </div>
          )}
          <div className="pt-2">
            <p className="mb-1.5 text-[12.5px] text-ink-500">备注</p>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder={type === 'DELIVERY' ? '如：放门口、不要香菜、多给餐具' : '如：不要香菜、少辣'}
              maxLength={200}
              rows={2}
              className="w-full resize-none rounded-xl bg-[#F9F6F1] px-3 py-2 text-[12.5px] leading-relaxed outline-none placeholder:text-ink-400/60"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-3 text-[12.5px]">
          <div className="flex justify-between py-1 text-ink-500">
            <span>商品金额</span>
            <span className="font-num">¥{fen(amount)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between py-1 text-brand">
              <span>满减优惠</span>
              <span className="font-num">-¥{fen(totals.discount)}</span>
            </div>
          )}
          {totals.delivery > 0 && (
            <div className="flex justify-between py-1 text-ink-500">
              <span>配送费</span>
              <span className="font-num">¥{fen(totals.delivery)}</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-line/70 pt-2">
            <span className="text-[13px] font-semibold">合计</span>
            <span className="text-brand">
              <span className="text-[11px]">¥</span>
              <span className="font-num text-[20px] font-bold">{fen(totals.total)}</span>
            </span>
          </div>
        </section>

      </div>

      {error && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[78px] z-40 flex justify-center px-8">
          <p className="rounded-full bg-red-500/95 px-4 py-2 text-[12px] text-white shadow-lg">{error}</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-line bg-white px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="flex items-baseline gap-1 text-brand">
          <span className="text-[11px]">合计 ¥</span>
          <span className="font-num text-[20px] font-bold">{fen(totals.total)}</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-brand h-11 cursor-pointer rounded-full px-7 text-[14px] font-semibold disabled:opacity-60"
        >
          {submitting ? '提交中…' : type === 'DELIVERY' ? '提交外卖单' : '提交并支付'}
        </button>
      </div>
    </div>
  );
}
