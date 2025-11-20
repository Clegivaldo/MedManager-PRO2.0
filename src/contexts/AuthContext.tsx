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
            setState({
              user,
              tenant,
              isAuthenticated: true,
              isLoading: false,
            });

            // Buscar dados atualizados do usuário
            try {
              const updatedUser = await authService.getCurrentUser();
              setState(prev => ({
                ...prev,
                user: updatedUser,
              }));
            } catch (error) {
              console.error('Erro ao buscar usuário atualizado:', error);
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
      const user = await authService.getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
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
