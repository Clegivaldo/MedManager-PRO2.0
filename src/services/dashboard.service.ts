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

class DashboardService {
  async getMetrics() {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
    return response.data.data;
  }
}

export default new DashboardService();
