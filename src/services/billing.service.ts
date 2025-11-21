import api, { ApiResponse } from './api';

export interface BillingAccountRecord {
  id: string;
  tenantId: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string;
  paidAmount?: number;
  tenant?: { id: string; name: string; cnpj: string };
}

export interface BillingListResponse {
  items: BillingAccountRecord[];
  kpis: { totalAReceber: number; recebidoNoMes: number; inadimplencia: number };
}

class BillingService {
  async list(params: { status?: string; from?: string; to?: string; tenantId?: string } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.append(k, v); });
    const res = await api.get<ApiResponse<BillingListResponse>>(`/superadmin/billing?${query.toString()}`);
    return res.data.data;
  }

  async markPaid(id: string) {
    const res = await api.patch<ApiResponse<BillingAccountRecord>>(`/superadmin/billing/${id}/mark-paid`);
    return res.data.data;
  }

  async resendCharge(id: string) {
    const res = await api.post<ApiResponse<{ message: string }>>(`/superadmin/billing/${id}/resend-charge`);
    return res.data.data;
  }
}

export const billingService = new BillingService();
export default billingService;
