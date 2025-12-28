import { Toaster } from '@/components/ui/sonner';
import { Suspense, lazy, useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ColorThemeProvider } from './providers/ColorThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { UpgradeModal } from './components/modals/UpgradeModal';

// Layouts
import TenantLayout from './components/Layout/TenantLayout';
import SuperadminLayout from './components/Layout/SuperadminLayout';

// Pages
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Clients = lazy(() => import('./pages/Clients'));
const Usage = lazy(() => import('./pages/Usage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Quotes = lazy(() => import('./pages/tenant/Quotes'));
const NFe = lazy(() => import('./pages/tenant/NFe'));
const Financials = lazy(() => import('./pages/tenant/Financials'));
const RoutesPage = lazy(() => import('./pages/tenant/Routes'));
const UserManagement = lazy(() => import('./pages/tenant/UserManagement'));
const UserProfile = lazy(() => import('./pages/tenant/UserProfile'));
const Audit = lazy(() => import('./pages/tenant/Audit'));
const FiscalProfile = lazy(() => import('./pages/tenant/FiscalProfile'));
const LicenseExpired = lazy(() => import('./pages/tenant/LicenseExpired'));
const PaymentGatewayConfig = lazy(() => import('./pages/tenant/PaymentGatewayConfig'));
const MyInvoices = lazy(() => import('./pages/tenant/Financial/MyInvoices'));
const PDV = lazy(() => import('./pages/tenant/PDV'));

// Superadmin Pages
const TenantManagement = lazy(() => import('./pages/superadmin/TenantManagement'));
const SubscriptionsPage = lazy(() => import('./pages/superadmin/Subscriptions'));
const BillingPage = lazy(() => import('./pages/superadmin/Billing'));
const PlanManagement = lazy(() => import('./pages/superadmin/PlanManagement'));
const ModuleManagement = lazy(() => import('./pages/superadmin/ModuleManagement'));
const SystemHealth = lazy(() => import('./pages/superadmin/SystemHealth'));
const SystemSettings = lazy(() => import('./pages/superadmin/SystemSettings'));
const BackupManagement = lazy(() => import('./pages/superadmin/BackupManagement'));
const TenantDetails = lazy(() => import('./pages/superadmin/TenantDetails'));
const SuperadminPaymentProviders = lazy(() => import('./pages/superadmin/PaymentProviders'));
const ChargesManagement = lazy(() => import('./pages/superadmin/ChargesManagement'));
const BillingAccounts = lazy(() => import('./pages/superadmin/BillingAccounts'));
const SystemJobsStatus = lazy(() => import('./pages/admin/SystemJobsStatus'));

const queryClient = new QueryClient();

// ✅ NOVO: Componente interno para gerenciar modal de upgrade
function AppContent() {
  const [upgradeModalState, setUpgradeModalState] = useState({
    open: false,
    limitType: undefined as string | undefined,
    current: undefined as number | undefined,
    limit: undefined as number | undefined,
    message: undefined as string | undefined,
  });

  useEffect(() => {
    // ✅ Listener para erro 402 - Limite de plano atingido
    const handlePlanLimitReached = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { limitType, current, limit, message } = customEvent.detail;

      setUpgradeModalState({
        open: true,
        limitType,
        current,
        limit,
        message,
      });
    };

    // ✅ Listener para erro 403 - Módulo não habilitado
    const handleModuleNotEnabled = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;

      setUpgradeModalState({
        open: true,
        limitType: 'module',
        current: undefined,
        limit: undefined,
        message,
      });
    };

    window.addEventListener('plan-limit-reached', handlePlanLimitReached);
    window.addEventListener('module-not-enabled', handleModuleNotEnabled);

    return () => {
      window.removeEventListener('plan-limit-reached', handlePlanLimitReached);
      window.removeEventListener('module-not-enabled', handleModuleNotEnabled);
    };
  }, []);

  return (
    <>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/license-expired" element={<LicenseExpired />} />

              {/* Tenant Routes - Protected */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']} />}>
                <Route path="/" element={<TenantLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<ProtectedRoute requiredModule="DASHBOARD" />}>
                    <Route index element={<Dashboard />} />
                  </Route>
                  <Route path="products" element={<ProtectedRoute requiredModule="PRODUCTS" />}>
                    <Route index element={<Products />} />
                  </Route>
                  <Route path="inventory" element={<ProtectedRoute requiredModule="INVENTORY" />}>
                    <Route index element={<Inventory />} />
                  </Route>
                  <Route path="orders" element={<ProtectedRoute requiredModule="ORDERS" />}>
                    <Route index element={<Orders />} />
                  </Route>
                  <Route path="quotes" element={<ProtectedRoute requiredModule="QUOTES" />}>
                    <Route index element={<Quotes />} />
                  </Route>
                  <Route path="financials" element={<ProtectedRoute requiredModule="FINANCIAL" />}>
                    <Route index element={<Financials />} />
                  </Route>
                  <Route path="routes" element={<ProtectedRoute requiredModule="DELIVERY" />}>
                    <Route index element={<RoutesPage />} />
                  </Route>
                  <Route path="compliance" element={<ProtectedRoute requiredModule="COMPLIANCE" />}>
                    <Route index element={<Compliance />} />
                  </Route>
                  <Route path="nfe" element={<ProtectedRoute requiredModule="NFE" />}>
                    <Route index element={<NFe />} />
                  </Route>
                  <Route path="clients" element={<ProtectedRoute requiredModule="SALES" />}>
                    <Route index element={<Clients />} />
                  </Route>
                  <Route path="fiscal-profile" element={<ProtectedRoute requiredModule="NFE" />}>
                    <Route index element={<FiscalProfile />} />
                  </Route>
                  <Route path="audit" element={<ProtectedRoute requiredModule="AUDIT" />}>
                    <Route index element={<Audit />} />
                  </Route>
                  <Route path="pdv" element={<ProtectedRoute requiredModule="NFE" />}>
                    <Route index element={<PDV />} />
                  </Route>

                  <Route path="user-profile" element={<UserProfile />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="payment-gateway-config" element={<PaymentGatewayConfig />} />
                  <Route path="my-invoices" element={<MyInvoices />} />
                  <Route path="usage" element={<Usage />} />
                  {/* Admin util: status de jobs do sistema (apenas SUPERADMIN) */}
                  <Route path="system-jobs" element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}> 
                    <Route index element={<SystemJobsStatus />} />
                  </Route>
                </Route>
              </Route>

              {/* Superadmin Routes - Protected */}
              <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                <Route path="/superadmin" element={<SuperadminLayout />}>
                  <Route index element={<Navigate to="/superadmin/tenants" replace />} />
                  <Route path="tenants" element={<TenantManagement />} />
                  <Route path="subscriptions" element={<SubscriptionsPage />} />
                  <Route path="billing" element={<BillingPage />} /> {/* ✅ NOVO */}
                  <Route path="tenants/:tenantId" element={<TenantDetails />} />
                  <Route path="plans" element={<PlanManagement />} />
                  <Route path="modules" element={<ModuleManagement />} />
                  <Route path="payments" element={<SuperadminPaymentProviders />} />
                  <Route path="charges" element={<ChargesManagement />} />
                  <Route path="billing-accounts" element={<BillingAccounts />} />
                  <Route path="health" element={<SystemHealth />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="backups" element={<BackupManagement />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>

      {/* ✅ NOVO: Modal de Upgrade Global */}
      <UpgradeModal
        open={upgradeModalState.open}
        onOpenChange={(open) => setUpgradeModalState(prev => ({ ...prev, open }))}
        limitType={upgradeModalState.limitType}
        current={upgradeModalState.current}
        limit={upgradeModalState.limit}
        message={upgradeModalState.message}
      />
    </>
  );
}

const App = () => (
  <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
    <ColorThemeProvider defaultTheme="zinc" storageKey="medmanager-color-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ColorThemeProvider>
  </NextThemesProvider>
);

export default App;
