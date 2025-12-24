import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '@/services/auth.service';
import { AuthContextType, AuthState, LoginCredentials, User, Tenant, LoginResponse } from '@/types/auth.types';
import { getErrorMessage } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Verificar autenticação ao carregar
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = authService.getUser();
          const tenant = authService.getTenant();

          if (user) {
            // ✅ CORREÇÃO: Liberar loading IMEDIATAMENTE com dados do cache
            setState({
              user,
              tenant,
              isAuthenticated: true,
              isLoading: false,
            });

            // ✅ DEPOIS tentar atualizar dados em background (não bloqueia a UI)
            try {
              const { user: updatedUser, tenant: updatedTenant } = await authService.getCurrentUser();
              setState({
                user: updatedUser,
                tenant: updatedTenant || tenant,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch (error) {
              console.error('Erro ao buscar perfil atualizado na inicialização:', error);
              // Em caso de erro, mantemos os dados do cache que já foram setados
            }
          } else {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        setState({
          user: null,
          tenant: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await authService.login(credentials);

      setState({
        user: response.user,
        tenant: response.tenant || null,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(getErrorMessage(error));
    }
  };

  const logout = (): void => {
    setState({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
    });
    authService.logout();
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const { user, tenant } = await authService.getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
        tenant: tenant || prev.tenant,
      }));
    } catch (error) {
      console.error('Erro ao atualizar dados de autenticação:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await authService.requestPasswordReset(email);
    } catch (err) {
      throw err;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    await authService.resetPassword(token, password);
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
    requestPasswordReset,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
