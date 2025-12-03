import api from './api';

export interface GlobalPaymentConfigMasked {
  activeGateway: 'asaas' | 'infinitypay';
  asaasEnvironment: 'sandbox' | 'production';
  asaasApiKeyMasked: string | null;
  asaasWebhookTokenMasked: string | null;
  infinityPayMerchantIdMasked: string | null;
  infinityPayApiKeyMasked: string | null;
  infinityPayPublicKeyMasked: string | null;
  infinityPayWebhookSecretMasked: string | null;
}

export interface UpdateGlobalPaymentConfigDTO {
  activeGateway?: 'asaas' | 'infinitypay';
  asaasEnvironment?: 'sandbox' | 'production';
  asaasApiKey?: string;
  asaasWebhookToken?: string;
  infinityPayMerchantId?: string;
  infinityPayApiKey?: string;
  infinityPayPublicKey?: string;
  infinityPayWebhookSecret?: string;
}

export interface Charge {
  id: string;
  chargeId: string;
  tenantId: string;
  tenantName?: string;
  amount: string;
  currency: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
  gateway: string;
  gatewayChargeId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  dueDate: string;
  paidAt?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCharges {
  charges: Charge[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ListChargesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
}

export async function getGlobalPaymentConfig(): Promise<GlobalPaymentConfigMasked> {
  const res = await api.get<{ success: boolean; data: GlobalPaymentConfigMasked }>(`/superadmin/payment-providers`);
  return res.data.data;
}

export async function updateGlobalPaymentConfig(payload: UpdateGlobalPaymentConfigDTO): Promise<GlobalPaymentConfigMasked> {
  const res = await api.put<{ success: boolean; data: GlobalPaymentConfigMasked }>(`/superadmin/payment-providers`, payload);
  return res.data.data;
}

export async function listCharges(params: ListChargesParams = {}): Promise<PaginatedCharges> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.method) query.append('method', params.method);

  const res = await api.get<PaginatedCharges>(`/superadmin/charges?${query.toString()}`);
  return res.data;
}

export async function syncChargeStatus(chargeId: string): Promise<{ success: boolean; message: string; data: any }> {
  const res = await api.post<{ success: boolean; message: string; data: any }>(`/superadmin/charges/${chargeId}/sync`);
  return res.data;
}

export async function importChargesFromAsaas(): Promise<{ success: boolean; message: string; data: { imported: number; skipped: number; errors: number; total: number } }> {
  const res = await api.post<{ success: boolean; message: string; data: { imported: number; skipped: number; errors: number; total: number } }>(`/superadmin/charges/import-from-asaas`);
  return res.data;
}

export async function syncAllCharges(): Promise<{ success: boolean; message: string; data: { synced: number; deleted: number; errors: number; total: number } }> {
  const res = await api.post<{ success: boolean; message: string; data: { synced: number; deleted: number; errors: number; total: number } }>(`/superadmin/charges/sync-all`);
  return res.data;
}

export async function cancelCharge(chargeId: string, reason?: string): Promise<{ success: boolean; message: string; data: any }> {
  const res = await api.post<{ success: boolean; message: string; data: any }>(`/superadmin/charges/${chargeId}/cancel`, { reason });
  return res.data;
}

