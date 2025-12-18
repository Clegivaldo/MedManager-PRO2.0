import api, { ApiResponse } from './api';

export interface BillingStats {
  totalToReceive: string;
  receivedThisMonth: string;
  churnRate: number;
  arr: string;
  mrr: string;
  monthlyRevenue: Array<{
    month: string;
    label: string;
    revenue: number;
  }>;
  activeSubscriptionsCount: number;
  totalSubscriptionsCount: number;
}

export interface BillingItem {
  id: string;
  tenantId: string;
  tenantName?: string;
  planName?: string;
  amount: number;
  dueDate: string;
  status: string;
  period: string;
}

class BillingService {
  async getStats(): Promise<BillingStats> {
    const res = await api.get<ApiResponse<BillingStats>>('/superadmin/billing/stats');
    return res.data.data;
  }

  async listBilling(params: { status?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await api.get<ApiResponse<{ items: BillingItem[]; pagination: any }>>(`/superadmin/billing/items?${query.toString()}`);
    return res.data.data;
  }
}

export const billingService = new BillingService();
export default billingService;
