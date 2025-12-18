import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function normalizeRole(role?: string) {
  return (role || '').toUpperCase();
}

interface ProtectedRouteProps {
  allowedRoles?: Array<'SUPERADMIN' | 'MASTER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'>;
  requiredModule?: string; // ✅ NOVO
  redirectTo?: string;
  treatMasterAsAdmin?: boolean;
}

export default function ProtectedRoute({
  allowedRoles,
  requiredModule,
  redirectTo = '/login',
  treatMasterAsAdmin = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, tenant } = useAuth();
  const userRole = normalizeRole(user?.role);
  const location = useLocation();
  const isSuperOrMaster = userRole === 'SUPERADMIN' || userRole === 'MASTER';

  if (location.pathname === '/license-expired') {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Verificação de Módulo
  if (requiredModule && !isSuperOrMaster) {
    const modules = tenant?.modulesEnabled || [];
    if (!modules.includes(requiredModule)) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-muted/30 p-4">
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Módulo Não Habilitado</h1>
            <p className="text-muted-foreground">
              O módulo <span className="font-semibold text-primary">"{requiredModule}"</span> não está incluído no seu plano atual.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('module-not-enabled', { detail: { message: `Acesso ao módulo ${requiredModule}` } }))}>
              Fazer Upgrade
            </Button>
          </div>
        </div>
      );
    }
  }

  if (allowedRoles && user) {
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    let effectiveRole = userRole;

    if (treatMasterAsAdmin && userRole === 'MASTER' && normalizedAllowed.includes('ADMIN') && !normalizedAllowed.includes('MASTER')) {
      effectiveRole = 'ADMIN';
    }

    const isAllowed = normalizedAllowed.includes(effectiveRole);

    if (userRole === 'SUPERADMIN' && !isAllowed) {
      return <Navigate to="/superadmin" replace />;
    }

    if (!isAllowed) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
            <p className="text-gray-600">
              Você não tem permissão para acessar esta página.
            </p>
            <button
              onClick={() => window.history.back()}
              className="text-blue-600 hover:underline"
            >
              Voltar
            </button>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}
