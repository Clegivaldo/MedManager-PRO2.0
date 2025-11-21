import api, { ApiResponse } from './api';

export interface SuperadminTenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  status: string;
  createdAt?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  subscriptionStatus?: string;
  userCount?: number;
  daysRemaining?: number | null;
  metadata?: any;
}

export interface PaginatedTenants {
  tenants: SuperadminTenant[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CreateTenantDTO {
  name: string;
  cnpj: string;
  plan: string;
  email?: string;
  phone?: string;
  address?: any;
}

export interface UpdateTenantDTO {
  name?: string;
  cnpj?: string;
  plan?: string;
  status?: string;
  metadata?: any;
}

class SuperadminService {
  async listTenants(params: { page?: number; limit?: number; status?: string; plan?: string } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));
    if (params.status) q.append('status', params.status);
    if (params.plan) q.append('plan', params.plan);
    const res = await api.get<PaginatedTenants>(`/superadmin/tenants?${q.toString()}`);
    return res.data;
  }

  async getTenant(id: string) {
    const res = await api.get<{ tenant: SuperadminTenant }>(`/superadmin/tenants/${id}`);
    return res.data.tenant;
  }

  async createTenant(payload: CreateTenantDTO) {
    const res = await api.post<{ message: string; tenant: SuperadminTenant }>(`/superadmin/tenants`, payload);
    return res.data.tenant;
  }

  async updateTenant(id: string, payload: UpdateTenantDTO) {
    const res = await api.put<{ message: string; tenant: SuperadminTenant }>(`/superadmin/tenants/${id}`, payload);
    return res.data.tenant;
  }

  async extendSubscription(tenantId: string, months: number) {
    const res = await api.post<{ message: string; subscription: any }>(`/superadmin/tenants/${tenantId}/extend-subscription`, { months });
    return res.data;
  }

  async updateTenantStatus(id: string, status: string, reason?: string) {
    const res = await api.put<{ message: string; tenant: SuperadminTenant }>(`/superadmin/tenants/${id}/status`, { status, reason });
    return res.data.tenant;
  }

  async updateTenantPlan(id: string, plan: string, effectiveDate?: string) {
    const res = await api.put<{ message: string; tenant: SuperadminTenant }>(`/superadmin/tenants/${id}/plan`, { plan, effectiveDate });
    return res.data.tenant;
  }

  async getAuditLogs(params: { tenantId?: string; page?: number; limit?: number; userId?: string; action?: string; startDate?: string; endDate?: string }) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, String(v)); });
    const res = await api.get<{ logs: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/superadmin/analytics?${q.toString()}`);
    return res.data;
  }

  async getSystemOverview() {
    const res = await api.get<{ overview: { totalTenants: number; activeTenants: number; recentTenants: SuperadminTenant[] } }>(`/superadmin/dashboard`);
    return res.data.overview;
  }

  async getSystemMetrics() {
    const res = await api.get<{ metrics: any }>(`/superadmin/dashboard/metrics`);
    return res.data.metrics;
  }
}

export const superadminService = new SuperadminService();
export default superadminService;
