import api, { ApiResponse } from './api';
import { LoginCredentials, LoginResponse, User } from '@/types/auth.types';

class AuthService {
  // Login com email ou CNPJ
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Se vier CNPJ e Email, usar endpoint de login por tenant
    const endpoint = credentials.cnpj && credentials.email ? '/auth/login-tenant' : '/auth/login';
    const response = await api.post<ApiResponse<LoginResponse>>(endpoint, credentials);

    const { user, tenant, tokens } = response.data.data;

    // Salvar tokens e dados do usuário
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    this.setUser(user);
    if (tenant) {
      this.setTenant(tenant);
    }

    return response.data.data;
  }

  // Solicitar reset de senha (endpoint futuro)
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await api.post<ApiResponse<any>>('/auth/forgot-password', { email });
    } catch (error) {
      // Se endpoint não existir ainda, apenas lançar erro controlado
      throw new Error('Funcionalidade de reset de senha indisponível no momento.');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post<ApiResponse<any>>('/auth/reset-password', { token, password });
  }

  // Logout
  logout(): void {
    this.clearStorage();
    window.location.href = '/login';
  }

  // Refresh token
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    this.setTokens(accessToken, newRefreshToken);

    return response.data.data;
  }

  // Obter usuário e tenant atuais
  async getCurrentUser(): Promise<{ user: User; tenant: any }> {
    const response = await api.get<ApiResponse<{ user: User; tenant: any }>>('/auth/me');
    const { user, tenant } = response.data.data;

    this.setUser(user);
    if (tenant) {
      this.setTenant(tenant);
    }

    return { user, tenant };
  }

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Storage helpers
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    if (user.tenantId) {
      localStorage.setItem('tenant_id', user.tenantId);
    }
  }

  private setTenant(tenant: any): void {
    localStorage.setItem('tenant', JSON.stringify(tenant));
    localStorage.setItem('tenant_id', tenant.id);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getTenant(): any | null {
    const tenantStr = localStorage.getItem('tenant');
    return tenantStr ? JSON.parse(tenantStr) : null;
  }

  clearStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('tenant_id');
  }
}

export default new AuthService();
