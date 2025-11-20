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
    const response = await api.get<ApiResponse<UsageMetrics>>('/dashboard/usage');
    return response.data.data;
  }
}

export default new DashboardService();
