export interface User {
  id: string;
  email: string;
  name: string;
  // Incluímos MASTER para refletir enum do backend e evitar falha de narrowing
  role: 'SUPERADMIN' | 'MASTER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  tenantId?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  isActive: boolean;
  modulesEnabled?: string[]; // ✅ NOVO
}

export interface LoginCredentials {
  email?: string;
  cnpj?: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tenant?: Tenant;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requestPasswordReset?: (email: string) => Promise<void>;
  resetPassword?: (token: string, password: string) => Promise<void>;
}
