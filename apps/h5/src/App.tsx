import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import CheckoutPage from './pages/CheckoutPage';
import MenuPage from './pages/MenuPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import ResultPage from './pages/ResultPage';
import { ShopProvider, useShop } from './shop';

function Splash() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-cream">
      <div className="h-11 w-11 animate-pulse rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]" />
      <p className="text-[12px] text-ink-400">正在进入门店…</p>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { boot, loading, error, reload } = useShop();
  if (loading) return <Splash />;
  if (error || !boot) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-cream px-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">🥲</div>
        <p className="text-[13.5px] text-ink-700">{error || '桌码无效'}</p>
        <p className="max-w-[260px] text-[12px] leading-relaxed text-ink-400">
          请重新扫描桌面上的点单二维码；若仍打不开，请联系店员重新生成桌码。
        </p>
        <button
          type="button"
          onClick={reload}
          className="btn-brand mt-1 cursor-pointer rounded-full px-5 py-2 text-[13px] font-semibold"
        >
          重新加载
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function WithShop({ children }: { children: ReactNode }) {
  return (
    <ShopProvider>
      <Gate>{children}</Gate>
    </ShopProvider>
  );
}

/** 客户端入口只允许扫码进入：没有桌码时只做扫码引导，不提供任何旁路入口 */
function ScanOnly() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-card">
        <span className="text-3xl">📷</span>
      </div>
      <p className="text-[16px] font-semibold">请扫描桌面上的点单二维码</p>
      <p className="max-w-[260px] text-[12.5px] leading-relaxed text-ink-400">
        每个桌位都有专属二维码，扫码后会直接进入点单页并自动识别桌号。如需点单，请让店员协助。
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/t/:scene" element={<WithShop><MenuPage /></WithShop>} />
      <Route path="/t/:scene/checkout" element={<WithShop><CheckoutPage /></WithShop>} />
      <Route path="/t/:scene/result/:orderId" element={<WithShop><ResultPage /></WithShop>} />
      <Route path="/t/:scene/orders" element={<WithShop><OrdersPage /></WithShop>} />
      <Route path="/t/:scene/orders/:orderId" element={<WithShop><OrderDetailPage /></WithShop>} />
      <Route path="*" element={<ScanOnly />} />
    </Routes>
  );
}
