import api, { ApiResponse } from './api';

export interface SubscriptionRecord {
  tenantId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  billingCycle: string;
  autoRenew: boolean;
  tenant?: { id: string; name: string; cnpj: string };
  plan?: { id: string; name: string; displayName?: string };
}

class SubscriptionsService {
  async list(params: { status?: string; planId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.planId) query.append('planId', params.planId);
    const res = await api.get<ApiResponse<SubscriptionRecord[]>>(`/superadmin/subscriptions?${query.toString()}`);
    return res.data.data;
  }

  async renew(tenantId: string, months = 1) {
    const res = await api.patch<ApiResponse<SubscriptionRecord>>(`/superadmin/subscriptions/${tenantId}/renew`, { months });
    return res.data.data;
  }

  async suspend(tenantId: string, reason?: string) {
    const res = await api.patch<ApiResponse<SubscriptionRecord>>(`/superadmin/subscriptions/${tenantId}/suspend`, { reason });
    return res.data.data;
  }

  async changePlan(tenantId: string, newPlanId: string) {
    const res = await api.patch<ApiResponse<SubscriptionRecord>>(`/superadmin/subscriptions/${tenantId}/change-plan`, { newPlanId });
    return res.data.data;
  }

  // ✅ NOVO: Buscar estatísticas
  async getStats() {
    const res = await api.get<ApiResponse<{
      total: number;
      active: number;
      expired: number;
      suspended: number;
      trial: number;
      mrr: string;
      byPlan: Record<string, number>;
    }>>('/superadmin/subscriptions/stats');
    return res.data.data;
  }
}

export const subscriptionsService = new SubscriptionsService();
export default subscriptionsService;
