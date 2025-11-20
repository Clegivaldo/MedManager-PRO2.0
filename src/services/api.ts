import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Criar instância do Axios
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Request - Adicionar token JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Adicionar tenant ID se disponível
    const tenantId = localStorage.getItem('tenant_id');
    if (tenantId && config.headers) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de Response - Tratamento de erros e refresh token
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Se erro 401 e não é uma tentativa de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // Sem refresh token, redirecionar para login
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Tentar renovar o token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Salvar novos tokens
        localStorage.setItem('access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Atualizar header da requisição original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Retentar requisição original
        return api(originalRequest);
      } catch (refreshError) {
        // Falha no refresh, limpar tudo e redirecionar
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Tratamento de erros específicos
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const message = data?.message || error.message;
      const code = data?.code;

      // Verificar se é erro de licença vencida
      if (status === 403 && (code === 'LICENSE_EXPIRED' || code === 'LICENSE_SUSPENDED' || code === 'LICENSE_CANCELLED')) {
        // Redirecionar para página de licença vencida
        window.location.href = '/license-expired';
        return Promise.reject(error);
      }

      // Verificar se é erro de módulo não habilitado
      if (status === 403 && code === 'MODULE_NOT_ENABLED') {
        console.error('Módulo não habilitado:', message);
        // Poderia mostrar modal de upgrade aqui
      }

      // Verificar se é erro de limite de plano
      if (status === 402 && code === 'PLAN_LIMIT_REACHED') {
        console.error('Limite do plano atingido:', message);
        // Poderia mostrar modal de upgrade aqui
      }

      switch (status) {
        case 400:
          console.error('Requisição inválida:', message);
          break;
        case 403:
          console.error('Acesso negado:', message);
          break;
        case 404:
          console.error('Recurso não encontrado:', message);
          break;
        case 500:
          console.error('Erro no servidor:', message);
          break;
        default:
          console.error('Erro na requisição:', message);
      }
    } else if (error.request) {
      console.error('Sem resposta do servidor:', error.request);
    } else {
      console.error('Erro ao configurar requisição:', error.message);
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;

// Helper types para respostas padronizadas
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

// Payment Gateway Credentials Types
export interface PaymentGatewayMasked {
  hasAsaas: boolean;
  hasInfinityPay: boolean;
  asaasApiKeyMasked: string | null;
  infinityPayApiKeyMasked: string | null;
  asaasWebhookSecretMasked: string | null;
  infinityPayWebhookSecretMasked: string | null;
}

export interface UpdatePaymentGatewayDTO {
  asaasApiKey?: string;
  infinityPayApiKey?: string;
  asaasWebhookSecret?: string;
  infinityPayWebhookSecret?: string;
}

export async function getPaymentGatewayCredentials(): Promise<PaymentGatewayMasked> {
  const res = await api.get<ApiResponse<PaymentGatewayMasked>>('/payment-gateways');
  return res.data.data;
}

export async function updatePaymentGatewayCredentials(payload: UpdatePaymentGatewayDTO): Promise<PaymentGatewayMasked> {
  const res = await api.put<ApiResponse<PaymentGatewayMasked>>('/payment-gateways', payload);
  return res.data.data;
}

// Helper para extrair mensagem de erro
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || apiError?.error || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro desconhecido';
};
