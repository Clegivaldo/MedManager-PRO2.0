import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ColorThemeProvider } from './providers/ColorThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import TenantLayout from './components/Layout/TenantLayout';
import SuperadminLayout from './components/Layout/SuperadminLayout';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Compliance from './pages/Compliance';
import Clients from './pages/Clients';
import NotFound from './pages/NotFound';

import Quotes from './pages/tenant/Quotes';
import Sales from './pages/tenant/Sales';
import NFe from './pages/tenant/NFe';
import Financials from './pages/tenant/Financials';
import RoutesPage from './pages/tenant/Routes';
import UserManagement from './pages/tenant/UserManagement';
import UserProfile from './pages/tenant/UserProfile';
import Audit from './pages/tenant/Audit';
import FiscalProfile from './pages/tenant/FiscalProfile';

// Superadmin Pages
import TenantManagement from './pages/superadmin/TenantManagement';
import PlanManagement from './pages/superadmin/PlanManagement';
import ModuleManagement from './pages/superadmin/ModuleManagement';
import SystemHealth from './pages/superadmin/SystemHealth';
import SystemSettings from './pages/superadmin/SystemSettings';
import BackupManagement from './pages/superadmin/BackupManagement';
import TenantDetails from './pages/superadmin/TenantDetails';

const queryClient = new QueryClient();

const App = () => (
  <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
    <ColorThemeProvider defaultTheme="zinc" storageKey="medmanager-color-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Tenant Routes - Protected */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']} />}>
                  <Route path="/" element={<TenantLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="quotes" element={<Quotes />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="financials" element={<Financials />} />
                    <Route path="routes" element={<RoutesPage />} />
                    <Route path="compliance" element={<Compliance />} />
                    <Route path="nfe" element={<NFe />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="fiscal-profile" element={<FiscalProfile />} />
                    <Route path="user-profile" element={<UserProfile />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="audit" element={<Audit />} />
                  </Route>
                </Route>

                {/* Superadmin Routes - Protected */}
                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                  <Route path="/superadmin" element={<SuperadminLayout />}>
                    <Route index element={<Navigate to="/superadmin/tenants" replace />} />
                    <Route path="tenants" element={<TenantManagement />} />
                    <Route path="tenants/:tenantId" element={<TenantDetails />} />
                    <Route path="plans" element={<PlanManagement />} />
                    <Route path="modules" element={<ModuleManagement />} />
                    <Route path="health" element={<SystemHealth />} />
                    <Route path="settings" element={<SystemSettings />} />
                    <Route path="backups" element={<BackupManagement />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ColorThemeProvider>
  </NextThemesProvider>
);

export default App;
