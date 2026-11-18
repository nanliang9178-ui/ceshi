import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pencil, Plus, Printer, QrCode, Trash2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../lib/api';
import type { DiningTable } from '../lib/types';
import { useToast } from '../lib/toast';
import { Badge, Card, Empty, Spinner } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/field';
import { Modal } from '../components/ui/modal';
import { cn } from '../lib/utils';

const EMPTY_BATCH = { area: '大厅', prefix: 'A', start: 1, count: 4, seats: 4 };

export default function TablesPage() {
  const toast = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState('ALL');
  const [batchOpen, setBatchOpen] = useState(false);
  const [batch, setBatch] = useState(EMPTY_BATCH);
  const [editTarget, setEditTarget] = useState<DiningTable | null>(null);
  const [preview, setPreview] = useState<DiningTable | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DiningTable | null>(null);
  const [publicBase, setPublicBase] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await api.get<{
      list: DiningTable[];
      areas: string[];
      total: number;
      publicBaseUrl?: string;
    }>('/admin/tables');
    setTables(data.list);
    setAreas(Array.from(new Set(data.list.map((table) => table.area))));
    if (data.publicBaseUrl) setPublicBase(data.publicBaseUrl);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [load, toast]);

  const filtered = useMemo(
    () => (activeArea === 'ALL' ? tables : tables.filter((table) => table.area === activeArea)),
    [tables, activeArea],
  );

  const createBatch = async () => {
    setSaving(true);
    try {
      await api.post('/admin/tables/batch', batch);
      toast.success(`已创建 ${batch.count} 个桌位`);
      setBatchOpen(false);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveTable = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.put(`/admin/tables/${editTarget.id}`, {
        name: editTarget.name,
        area: editTarget.area,
        seats: editTarget.seats,
      });
      toast.success('桌位已更新');
      setEditTarget(null);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeTable = async () => {
    if (!deleting) return;
    try {
      await api.del(`/admin/tables/${deleting.id}`);
      toast.success('桌位已删除');
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const downloadQr = (table: DiningTable) => {
    if (table.qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `桌码-${table.name}.png`;
      link.href = table.qrCodeUrl;
      link.click();
      return;
    }
    const canvas = document.querySelector(`#qr-${table.id} canvas`) as HTMLCanvasElement | null;
    if (!canvas) {
      toast.error('桌码还未渲染完成，请稍后再试');
      return;
    }
    const link = document.createElement('a');
    link.download = `桌码-${table.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return <Spinner label="正在加载桌位…" />;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveArea('ALL')}
            className={cn(
              'shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
              activeArea === 'ALL' ? 'bg-ink-900 text-white' : 'text-ink-900/50 hover:bg-ink-900/5',
            )}
          >
            全部区域 <span className="num ml-1 text-[11px] opacity-60">{tables.length}</span>
          </button>
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              className={cn(
                'shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                activeArea === area ? 'bg-ink-900 text-white' : 'text-ink-900/50 hover:bg-ink-900/5',
              )}
            >
              {area}
              <span className="num ml-1 text-[11px] opacity-60">
                {tables.filter((table) => table.area === area).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setBatchOpen(true)}>
            批量建桌
          </Button>
        </div>
      </Card>

      {publicBase.includes('localhost') || publicBase.includes('127.0.0.1') ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">
          <b>当前桌码地址是 localhost，手机扫不开。</b>
          请在服务器 / 电脑的 <code className="rounded bg-white/70 px-1">apps/api/.env</code> 中把
          <code className="mx-1 rounded bg-white/70 px-1">PUBLIC_BASE_URL</code>
          改成手机能访问的地址（局域网用电脑 IP，线上用 https 域名），重启 API 后重新打印桌码。
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[12.5px] leading-relaxed text-emerald-800">
          顾客用微信扫码后，会直接在手机浏览器打开点单页并自动识别桌号：<br />
          <span className="num break-all font-medium">{publicBase}/t/{'{桌位scene}'}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <Empty
            title="还没有桌位"
            description="为门店批量创建桌号后，即可打印二维码贴到桌上"
            icon={<QrCode size={22} />}
            action={
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setBatchOpen(true)}>
                批量建桌
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((table) => (
            <div
              key={table.id}
              className="group relative overflow-hidden rounded-2xl border border-line/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="num text-[20px] font-bold leading-none text-ink-900">{table.name}</p>
                  <p className="mt-1 text-[11.5px] text-ink-900/40">
                    {table.area} · {table.seats} 人桌
                  </p>
                </div>
                <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">网页桌码</Badge>
              </div>

              <div
                id={`qr-${table.id}`}
                className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-cream/50 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                onClick={() => setPreview(table)}
              >
                {table.qrCodeUrl ? (
                  <img src={table.qrCodeUrl} alt={`${table.name} 桌码`} className="h-[116px] w-[116px]" />
                ) : (
                  <QRCodeCanvas
                    value={table.qrContent || `${publicBase}/t/${table.sceneCode}`}
                    size={116}
                    level="M"
                    fgColor="#17181C"
                    bgColor="#FFFFFF"
                  />
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="truncate text-[10.5px] text-ink-900/30">scene: {table.sceneCode}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => downloadQr(table)}
                    className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-brand-600"
                    aria-label="下载"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(table)}
                    className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-brand-600"
                    aria-label="打印"
                  >
                    <Printer size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTarget(table)}
                    className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-brand-600"
                    aria-label="编辑"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(table)}
                    className="cursor-pointer rounded-md p-1.5 text-ink-900/40 transition hover:bg-ink-900/5 hover:text-red-500"
                    aria-label="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title="批量创建桌位"
        description="按命名规则自动生成桌号与专属二维码"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setBatchOpen(false)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={createBatch}>
              创建桌位
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">区域名称</span>
            <Input value={batch.area} onChange={(event) => setBatch({ ...batch, area: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">桌号前缀</span>
            <Input
              value={batch.prefix}
              onChange={(event) => setBatch({ ...batch, prefix: event.target.value })}
              placeholder="如 A"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">起始序号</span>
            <Input
              type="number"
              min={1}
              value={batch.start}
              onChange={(event) => setBatch({ ...batch, start: Number(event.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">创建数量</span>
            <Input
              type="number"
              min={1}
              max={200}
              value={batch.count}
              onChange={(event) => setBatch({ ...batch, count: Number(event.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-800">每桌人数</span>
            <Select
              value={String(batch.seats)}
              onChange={(event) => setBatch({ ...batch, seats: Number(event.target.value) })}
            >
              {[2, 4, 6, 8, 10, 12].map((seat) => (
                <option key={seat} value={seat}>
                  {seat} 人桌
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <div className="w-full rounded-xl bg-cream px-3 py-2 text-[12px] text-ink-900/50">
              将生成：
              <b className="num ml-1 text-ink-900">
                {batch.prefix}
                {String(batch.start).padStart(2, '0')}
              </b>
              {batch.count > 1 && (
                <>
                  {' '}
                  ~{' '}
                  <b className="num text-ink-900">
                    {batch.prefix}
                    {String(batch.start + batch.count - 1).padStart(2, '0')}
                  </b>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="编辑桌位"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={saveTable}>
              保存
            </Button>
          </>
        }
      >
        {editTarget && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">桌号</span>
              <Input
                value={editTarget.name}
                onChange={(event) => setEditTarget({ ...editTarget, name: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">区域</span>
              <Input
                value={editTarget.area}
                onChange={(event) => setEditTarget({ ...editTarget, area: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">座位数</span>
              <Select
                value={String(editTarget.seats)}
                onChange={(event) => setEditTarget({ ...editTarget, seats: Number(event.target.value) })}
              >
                {[2, 4, 6, 8, 10, 12].map((seat) => (
                  <option key={seat} value={seat}>
                    {seat} 人桌
                  </option>
                ))}
              </Select>
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="桌码卡打印预览"
        description="建议打印为 10cm × 7cm 亚克力立牌"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
              关闭
            </Button>
            <Button size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
              打印
            </Button>
          </>
        }
      >
        {preview && (
          <div id="receipt-print" className="mx-auto w-[300px] rounded-xl border border-line bg-white p-6 text-center">
            <p className="text-[12px] tracking-[0.3em] text-ink-900/40">扫码点单</p>
            <p className="num mt-1 text-[46px] font-bold leading-none text-ink-900">{preview.name}</p>
            <div className="my-4 flex justify-center" ref={printRef}>
              {preview.qrCodeUrl ? (
                <img src={preview.qrCodeUrl} alt="桌码" className="h-40 w-40" />
              ) : (
                <div className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line text-center">
                  <QrCode size={26} className="text-ink-900/20" />
                  <p className="px-3 text-[11px] leading-relaxed text-ink-900/40">
                    尚未生成小程序码
                    <br />
                    请先完成小程序配置
                  </p>
                </div>
              )}
            </div>
            <p className="text-[12.5px] font-medium text-ink-900">微信扫码 · 立即点单</p>
            <p className="mt-1 text-[11px] text-ink-900/40">无需下载 App，点完直接支付</p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="删除桌位"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={removeTable}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-ink-900/70">
          确定删除桌位「<b className="text-ink-900">{deleting?.name}</b>」？已贴在桌上的二维码将失效。
        </p>
      </Modal>
    </div>
  );
}
