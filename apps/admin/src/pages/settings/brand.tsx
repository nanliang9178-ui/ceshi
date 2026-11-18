import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, Save, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/button';
import { Card, CardTitle } from '../../components/ui/card';
import { Field, Input, Textarea } from '../../components/ui/field';
import { cn } from '../../lib/utils';

const PRESETS = ['#FF5A1F', '#E8451A', '#F2B544', '#12B76A', '#2E90FA', '#8B5CF6', '#17181C', '#C2410C'];

interface BrandForm {
  logoUrl: string;
  coverUrl: string;
  primaryColor: string;
  accentColor: string;
  slogan: string;
  announcement: string;
  servicePhone: string;
  copyright: string;
  banners: Array<{ url: string; link?: string }>;
}

export default function BrandSettingsPage() {
  const { me, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<BrandForm>({
    logoUrl: '',
    coverUrl: '',
    primaryColor: '#FF5A1F',
    accentColor: '#F2B544',
    slogan: '',
    announcement: '',
    servicePhone: '',
    copyright: '',
    banners: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    api
      .get<{ brand: BrandForm }>('/admin/store')
      .then((data) => {
        setForm({
          logoUrl: data.brand.logoUrl || '',
          coverUrl: data.brand.coverUrl || '',
          primaryColor: data.brand.primaryColor || '#FF5A1F',
          accentColor: data.brand.accentColor || '#F2B544',
          slogan: data.brand.slogan || '',
          announcement: data.brand.announcement || '',
          servicePhone: data.brand.servicePhone || '',
          copyright: data.brand.copyright || '',
          banners: data.brand.banners || [],
        });
      })
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [toast]);

  const patch = (value: Partial<BrandForm>) => setForm((prev) => ({ ...prev, ...value }));

  const upload = async (file: File, key: string) => {
    setUploading(key);
    try {
      const result = await api.upload(file, 'brand');
      if (key === 'logoUrl' || key === 'coverUrl') {
        patch({ [key]: result.url } as Partial<BrandForm>);
      }
      if (key.startsWith('banner-')) {
        const index = Number(key.split('-')[1]);
        const banners = [...form.banners];
        banners[index] = { ...banners[index], url: result.url };
        patch({ banners });
      }
      toast.success('图片已上传');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading('');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/store/brand', form);
      await refresh();
      toast.success('品牌配置已保存，小程序下次启动即生效');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const storeName = me?.store?.name || '你的小店';
  const previewStyle = useMemo(() => ({ background: form.primaryColor }), [form.primaryColor]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-sm text-ink-900/40">正在加载品牌配置…</div>;
  }

  return (
    <div className="grid gap-4 pb-24 xl:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <Card>
          <CardTitle title="品牌形象" subtitle="logo 与门店头图会展示在小程序首页顶部" />
          <div className="flex flex-wrap gap-5">
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-900/60">品牌 Logo</p>
              <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-cream transition hover:border-brand-300">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-ink-900/30">
                    {uploading === 'logoUrl' ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                    <span className="text-[10.5px]">上传 Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file, 'logoUrl');
                  }}
                />
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      patch({ logoUrl: '' });
                    }}
                    className="absolute right-1 top-1 cursor-pointer rounded-md bg-ink-900/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </label>
              <p className="mt-1.5 text-[10.5px] text-ink-900/35">建议 1:1，≤200KB</p>
            </div>

            <div className="flex-1">
              <p className="mb-2 text-[12px] font-medium text-ink-900/60">门店头图</p>
              <label className="group relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-cream transition hover:border-brand-300">
                {form.coverUrl ? (
                  <img src={form.coverUrl} alt="cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-ink-900/30">
                    {uploading === 'coverUrl' ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                    <span className="text-[10.5px]">上传门头/菜品氛围图</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file, 'coverUrl');
                  }}
                />
              </label>
              <p className="mt-1.5 text-[10.5px] text-ink-900/35">建议 16:9，展示在首页顶部</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title="主题色" subtitle="换一个主色，小程序整体视觉立即焕新" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-900/60">品牌主色</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => patch({ primaryColor: color })}
                    className={cn(
                      'h-8 w-8 cursor-pointer rounded-lg ring-offset-2 transition hover:scale-110',
                      form.primaryColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-ink-900',
                    )}
                    style={{ background: color }}
                    aria-label={color}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(event) => patch({ primaryColor: event.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(event) => patch({ primaryColor: event.target.value })}
                  className="h-9 w-28 font-mono text-[12px] uppercase"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-900/60">辅助色（角标 / 优惠）</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => patch({ accentColor: color })}
                    className={cn(
                      'h-8 w-8 cursor-pointer rounded-lg ring-offset-2 transition hover:scale-110',
                      form.accentColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-ink-900',
                    )}
                    style={{ background: color }}
                    aria-label={color}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(event) => patch({ accentColor: event.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
                />
                <Input
                  value={form.accentColor}
                  onChange={(event) => patch({ accentColor: event.target.value })}
                  className="h-9 w-28 font-mono text-[12px] uppercase"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title="品牌文案" subtitle="出现在小程序首页与页脚" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="品牌标语">
              <Input value={form.slogan} onChange={(event) => patch({ slogan: event.target.value })} placeholder="一勺红油，半城烟火" maxLength={60} />
            </Field>
            <Field label="客服电话">
              <Input
                value={form.servicePhone}
                onChange={(event) => patch({ servicePhone: event.target.value })}
                placeholder="13800138000"
                maxLength={30}
              />
            </Field>
            <Field label="首页公告" className="sm:col-span-2" hint="显示在首页顶部横滑条，可写当日推荐或活动">
              <Textarea
                value={form.announcement}
                onChange={(event) => patch({ announcement: event.target.value })}
                placeholder="本店所有菜品现点现做，出餐约 15 分钟，感谢等待～"
                maxLength={200}
              />
            </Field>
            <Field label="版权文案" className="sm:col-span-2">
              <Input
                value={form.copyright}
                onChange={(event) => patch({ copyright: event.target.value })}
                placeholder="© 2026 椒香里餐饮"
                maxLength={80}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="首页轮播图"
            subtitle="最多 3 张，展示招牌菜或活动海报"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => patch({ banners: [...form.banners, { url: '', link: '' }].slice(0, 3) })}
              >
                添加图片
              </Button>
            }
          />
          <div className="space-y-2.5">
            {form.banners.length === 0 && (
              <p className="rounded-xl bg-cream/70 px-4 py-5 text-center text-[12px] text-ink-900/35">
                暂未配置轮播图，小程序首页将只展示门店头图
              </p>
            )}
            {form.banners.map((banner, index) => (
              <div key={index} className="flex items-center gap-2.5 rounded-xl border border-line/80 p-2.5">
                <label className="relative flex h-14 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-cream">
                  {banner.url ? (
                    <img src={banner.url} alt="banner" className="h-full w-full object-cover" />
                  ) : uploading === `banner-${index}` ? (
                    <Loader2 size={16} className="animate-spin text-ink-900/30" />
                  ) : (
                    <ImagePlus size={16} className="text-ink-900/25" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload(file, `banner-${index}` as `banner-${number}`);
                    }}
                  />
                </label>
                <Input
                  value={banner.url}
                  onChange={(event) => {
                    const banners = [...form.banners];
                    banners[index] = { ...banners[index], url: event.target.value };
                    patch({ banners });
                  }}
                  placeholder="图片地址，或点击左侧上传"
                  className="h-9 flex-1 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => patch({ banners: form.banners.filter((_, i) => i !== index) })}
                  className="cursor-pointer rounded-lg p-2 text-ink-900/30 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="删除轮播图"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-glass backdrop-blur">
          <p className="text-[12px] text-ink-900/45">
            <Sparkles size={12} className="mr-1 inline text-brand-500" />
            保存后小程序重启即拉取新品牌，无需重新提交审核
          </p>
          <Button loading={saving} icon={<Save size={15} />} onClick={save}>
            保存并同步
          </Button>
        </div>
      </div>

      {/* 手机预览 */}
      <div className="hidden xl:block">
        <div className="sticky top-[84px]">
          <div className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-900/40">
            <Smartphone size={13} /> 小程序实时预览
          </div>
          <div className="mx-auto w-[352px] rounded-[42px] border-[10px] border-ink-900 bg-ink-900 p-0 shadow-[0_40px_80px_-40px_rgba(23,24,28,0.6)]">
            <div className="relative h-[640px] overflow-hidden rounded-[32px] bg-[#FBF7F2]">
              {/* 顶部头图 */}
              <div className="relative h-40 overflow-hidden">
                {form.coverUrl ? (
                  <img src={form.coverUrl} alt="cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-ink-900 to-ink-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[10px] text-white backdrop-blur">
                  ● {storeName.slice(0, 8)}
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2.5">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-white/80 bg-white">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[15px] font-bold" style={{ color: form.primaryColor }}>
                        枢
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">{storeName}</p>
                    <p className="truncate text-[10.5px] text-white/70">{form.slogan || '一句话介绍你的店'}</p>
                  </div>
                </div>
              </div>

              {/* 公告 */}
              <div className="mx-3 -mt-2 flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 shadow-sm">
                <span className="shrink-0 rounded px-1 py-0.5 text-[9px] text-white" style={previewStyle}>
                  公告
                </span>
                <p className="truncate text-[10.5px] text-ink-900/60">{form.announcement || '填写一条吸引顾客的公告'}</p>
              </div>

              {/* 轮播 */}
              <div className="mt-2.5 flex gap-2 overflow-hidden px-3">
                {(form.banners.length ? form.banners : [{ url: '' }]).slice(0, 2).map((banner, index) => (
                  <div
                    key={index}
                    className="h-[76px] flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-amber-50"
                  >
                    {banner.url && <img src={banner.url} alt="banner" className="h-full w-full object-cover" />}
                  </div>
                ))}
              </div>

              {/* 商品卡片 */}
              <div className="mt-3 px-3">
                <p className="mb-2 text-[11.5px] font-semibold text-ink-900">招牌推荐</p>
                <div className="space-y-2">
                  {[
                    { name: '巷子口酸菜鱼', price: '¥68', sales: '月售 326' },
                    { name: '干锅牛蛙', price: '¥88', sales: '月售 218' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
                      <div className="h-12 w-12 rounded-lg bg-cream" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-ink-900">{item.name}</p>
                        <p className="text-[9.5px] text-ink-900/40">{item.sales}</p>
                        <p className="num text-[12px] font-semibold" style={{ color: form.primaryColor }}>
                          {item.price}
                        </p>
                      </div>
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[14px] leading-none text-white"
                        style={previewStyle}
                      >
                        +
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.3)]">
                  <div className="flex-1">
                    <p className="text-[9.5px] text-ink-900/40">合计</p>
                    <p className="num text-[15px] font-bold" style={{ color: form.primaryColor }}>
                      ¥156.00
                    </p>
                  </div>
                  <div
                    className="rounded-full px-6 py-2 text-[12px] font-semibold text-white"
                    style={previewStyle}
                  >
                    开始点单
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10.5px] text-ink-900/30">预览效果仅供参考，实际以小程序渲染为准</p>
        </div>
      </div>
    </div>
  );
}
