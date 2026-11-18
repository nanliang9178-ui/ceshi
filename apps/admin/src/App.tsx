import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/app-shell';
import { useAuth } from './lib/auth';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import OrdersPage from './pages/orders';
import MenuPage from './pages/menu';
import TablesPage from './pages/tables';
import StatsPage from './pages/stats';
import BrandSettingsPage from './pages/settings/brand';
import StoreSettingsPage from './pages/settings/store';
import PaymentSettingsPage from './pages/settings/payment';
import MiniprogramSettingsPage from './pages/settings/miniprogram';
import StaffSettingsPage from './pages/settings/staff';
import PlatformOverviewPage from './pages/platform/overview';
import MerchantsPage from './pages/platform/merchants';
import BossPage from './pages/boss';

function Splash() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-cream">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white shadow-lift">
        枢
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-900/40">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/15 border-t-brand-500" />
        正在加载工作台…
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/boss"
        element={
          <RequireAuth>
            <BossPage />
          </RequireAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings/brand" element={<BrandSettingsPage />} />
        <Route path="/settings/store" element={<StoreSettingsPage />} />
        <Route path="/settings/miniprogram" element={<MiniprogramSettingsPage />} />
        <Route path="/settings/payment" element={<PaymentSettingsPage />} />
        <Route path="/settings/staff" element={<StaffSettingsPage />} />
        <Route path="/platform" element={<PlatformOverviewPage />} />
        <Route path="/platform/merchants" element={<MerchantsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
