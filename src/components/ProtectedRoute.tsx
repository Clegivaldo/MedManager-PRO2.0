import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Garantir consistência caso backend retorne role em minúsculas ou mistas
function normalizeRole(role?: string) {
  return (role || '').toUpperCase();
}

interface ProtectedRouteProps {
  allowedRoles?: Array<'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'>;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  allowedRoles, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const userRole = normalizeRole(user?.role);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar permissões de role se especificado
  if (allowedRoles && user) {
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    const isAllowed = normalizedAllowed.includes(userRole);

    // Caso SUPERADMIN tente acessar rota que não inclui SUPERADMIN, redirecionar para painel superadmin
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

  // Renderizar rota protegida
  return <Outlet />;
}
