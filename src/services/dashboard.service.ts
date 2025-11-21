import api, { ApiResponse } from './api';

export interface DashboardMetrics {
  sales: {
    today: {
      total: number;
      count: number;
    };
    month: {
      total: number;
      count: number;
    };
  };
  invoices: {
    issued: number;
    cancelled: number;
  };
  inventory: {
    lowStock: Array<{
      productId: string;
      productName: string;
      internalCode: string;
      availableQuantity: number;
      isControlled: boolean;
    }>;
    expiringBatches: Array<{
      batchId: string;
      batchNumber: string;
      productName: string;
      expirationDate: string;
      quantity: number;
      daysUntilExpiry: number;
    }>;
    expiredCount: number;
  };
  overview: {
    activeCustomers: number;
    activeProducts: number;
    controlledProducts: number;
  };
  compliance: {
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      count: number;
    }>;
    score: number;
  };
}

export interface UsageMetrics {
  planName: string;
  users: { current: number; limit: number | null; percentage: number; allowed: boolean };
  products: { current: number; limit: number | null; percentage: number; allowed: boolean };
  transactions: { current: number; limit: number | null; percentage: number; allowed: boolean; period: string };
  storage: { current: number; limit: number | null; percentage: number; allowed: boolean; unit: string };
  subscription: { status: string; endDate: string; daysRemaining: number };
}

class DashboardService {
  async getMetrics() {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
    return response.data.data;
  }

  async getUsage() {
    // Novo endpoint consolidado de uso
    const response = await api.get<ApiResponse<any>>('/usage/current');
    const data = response.data.data;
    // Adaptar estrutura recebida do backend para a interface UsageMetrics existente
    const metricsMap = {
      'Usuários': 'users',
      'Produtos': 'products',
      'Transações Mensais': 'transactions',
      'Armazenamento': 'storage'
    } as Record<string, string>;

    const usage: UsageMetrics = {
      planName: data.limits ? 'Plano Atual' : 'Plano',
      users: { current: 0, limit: null, percentage: 0, allowed: true },
      products: { current: 0, limit: null, percentage: 0, allowed: true },
      transactions: { current: 0, limit: null, percentage: 0, allowed: true, period: new Date().toISOString().substring(0,10) },
      storage: { current: 0, limit: null, percentage: 0, allowed: true, unit: 'GB' },
      subscription: { status: 'active', endDate: '', daysRemaining: 0 }
    };

    if (Array.isArray(data.metrics)) {
      for (const m of data.metrics) {
        const key = metricsMap[m.name];
        if (!key) continue;
        if (key === 'storage') {
          usage.storage = {
            current: m.current,
            limit: typeof m.limit === 'number' ? m.limit : null,
            percentage: m.percentage,
            allowed: m.status !== 'critical',
            unit: 'GB'
          };
        } else if (key === 'transactions') {
          usage.transactions = {
            current: m.current,
            limit: typeof m.limit === 'number' ? m.limit : null,
            percentage: m.percentage,
            allowed: m.status !== 'critical',
            period: new Date().toISOString().substring(0,10)
          };
        } else {
          (usage as any)[key] = {
            current: m.current,
            limit: typeof m.limit === 'number' ? m.limit : null,
            percentage: m.percentage,
            allowed: m.status !== 'critical'
          };
        }
      }
    }

    return usage;
  }
}

export default new DashboardService();
