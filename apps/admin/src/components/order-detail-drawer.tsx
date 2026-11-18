import { useEffect, useState } from 'react';
import { CheckCircle2, ChefHat, Clock3, Printer, RefreshCw, Utensils, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { Order } from '../lib/types';
import { durationText, fen, formatTime } from '../lib/utils';
import { ORDER_STATUS_META, PAY_STATUS_META } from '../lib/format';
import { useToast } from '../lib/toast';
import { Badge } from './ui/card';
import { Button } from './ui/button';
import { Drawer, Modal } from './ui/modal';
import { Receipt } from './receipt';

export function OrderDetailDrawer({
  orderId,
  shopName,
  open,
  onClose,
  onChanged,
}: {
  orderId: string | null;
  shopName?: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    api
      .get<Order>(`/admin/orders/${orderId}`)
      .then(setOrder)
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [open, orderId, toast]);

  const act = async (action: string, label: string) => {
    if (!order) return;
    setActing(action);
    try {
      if (action === 'cancel') {
        await api.post(`/admin/orders/${order.id}/cancel`, { reason: reason || '商家取消' });
        setCancelOpen(false);
      } else {
        await api.post(`/admin/orders/${order.id}/${action}`);
      }
      toast.success(`${label}成功`);
      const fresh = await api.get<Order>(`/admin/orders/${order.id}`);
      setOrder(fresh);
      onChanged();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setActing('');
    }
  };

  const actions = order?.allowedActions || {};
  const statusMeta = order ? ORDER_STATUS_META[order.status] : null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width="max-w-lg"
        title={
          <span className="flex items-center gap-2">
            订单详情
            {statusMeta && <Badge tone={statusMeta.tone}>{statusMeta.text}</Badge>}
          </span>
        }
        subtitle={order ? `订单号 ${order.orderNo}` : '加载中…'}
        footer={
          order ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" icon={<Printer size={14} />} onClick={() => setShowReceipt(true)}>
                打印小票
              </Button>
              {actions.accept && (
                <Button size="sm" loading={acting === 'accept'} icon={<ChefHat size={14} />} onClick={() => act('accept', '接单')}>
                  接单
                </Button>
              )}
              {actions.ready && (
                <Button size="sm" loading={acting === 'ready'} icon={<Utensils size={14} />} onClick={() => act('ready', '出餐')}>
                  出餐完成
                </Button>
              )}
              {actions.complete && (
                <Button
                  size="sm"
                  loading={acting === 'complete'}
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => act('complete', '完成订单')}
                >
                  完成订单
                </Button>
              )}
              {(actions.reject || actions.refund) && (
                <Button variant="outline" size="sm" icon={<XCircle size={14} />} onClick={() => setCancelOpen(true)}>
                  {actions.refund ? '退款' : '取消'}
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {loading || !order ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-900/40">
            <RefreshCw size={15} className="animate-spin" />
            正在读取订单…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-white/40">
                    {order.type === 'DINE_IN' ? '堂食桌号' : order.type === 'DELIVERY' ? '外卖配送' : '自取订单'}
                  </p>
                  <p className="num mt-1 text-[30px] font-bold leading-none">
                    {order.type === 'DELIVERY' ? '外卖' : order.tableName || '自取'}
                  </p>
                </div>
                {order.pickupNo && (
                  <div className="text-right">
                    <p className="text-[11px] text-white/40">取餐号</p>
                    <p className="num mt-1 text-[30px] font-bold leading-none text-brand-300">
                      #{order.pickupNo}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/45">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} /> 下单 {formatTime(order.createdAt, true)}
                </span>
                <span>等待 {durationText(order.createdAt)}</span>
                {order.peopleCount ? <span>{order.peopleCount} 人用餐</span> : null}
                <span>{order.customerName || '顾客'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={PAY_STATUS_META[order.payStatus]?.tone}>
                {PAY_STATUS_META[order.payStatus]?.text || order.payStatus}
              </Badge>
              <Badge>{order.payChannel === 'MOCK' ? '演示支付' : order.payChannel === 'WECHAT' ? '微信支付' : '未支付'}</Badge>
              {order.cancelReason && <Badge tone="bg-red-50 text-red-600 ring-red-200">{order.cancelReason}</Badge>}
            </div>

            <div className="overflow-hidden rounded-xl border border-line/80">
              {order.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 ${index !== 0 ? 'border-t border-line/60' : ''}`}
                >
                  <span className="num mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-ink-900/[0.05] px-1.5 text-[11px] text-ink-900/60">
                    x{item.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink-900">{item.productName}</p>
                    {item.specText && <p className="mt-0.5 text-[11.5px] text-ink-900/45">{item.specText}</p>}
                    {item.remark && <p className="mt-0.5 text-[11.5px] text-brand-600">备注：{item.remark}</p>}
                  </div>
                  <span className="num text-[13px] text-ink-900/70">¥{fen(item.amount)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 rounded-xl bg-cream/70 px-4 py-3.5 text-[12.5px]">
              <div className="flex justify-between text-ink-900/55">
                <span>商品金额</span>
                <span className="num">¥{fen(order.itemAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-brand-600">
                  <span>满减优惠</span>
                  <span className="num">-¥{fen(order.discountAmount)}</span>
                </div>
              )}
              {order.packingFee > 0 && (
                <div className="flex justify-between text-ink-900/55">
                  <span>打包费</span>
                  <span className="num">¥{fen(order.packingFee)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-ink-900/55">
                  <span>配送费</span>
                  <span className="num">¥{fen(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="text-[13px] font-medium text-ink-900">实付金额</span>
                <span className="num text-[20px] font-bold text-brand-600">¥{fen(order.totalAmount)}</span>
              </div>
            </div>

            {order.type === 'DELIVERY' && order.address && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12.5px] leading-relaxed text-sky-900">
                <p className="font-medium">配送信息</p>
                <p className="mt-1">
                  {order.receiverName} · {order.receiverPhone}
                </p>
                <p className="mt-0.5">{order.address}</p>
              </div>
            )}

            {order.remark && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
                <span className="font-medium">顾客备注：</span>
                {order.remark}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="小票预览"
        description="连接蓝牙/云打印机后可直接出单，可先用浏览器打印"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowReceipt(false)}>
              关闭
            </Button>
            <Button size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
              打印
            </Button>
          </>
        }
      >
        <div id="receipt-print" className="rounded-xl border border-dashed border-line bg-white py-2">
          {order && <Receipt order={order} shopName={shopName} />}
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={actions.refund ? '退款并取消订单' : '取消订单'}
        description={actions.refund ? '退款将原路退回顾客微信账户，通常 1-3 个工作日到账' : '取消后不可恢复'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>
              再想想
            </Button>
            <Button variant="danger" size="sm" loading={acting === 'cancel'} onClick={() => act('cancel', '取消订单')}>
              确认{actions.refund ? '退款' : '取消'}
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-800">取消原因</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="如：菜品售罄、顾客要求取消"
            className="min-h-[84px] w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </label>
      </Modal>
    </>
  );
}
