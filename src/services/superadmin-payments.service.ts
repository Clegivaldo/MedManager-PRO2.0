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

export async function getGlobalPaymentConfig(): Promise<GlobalPaymentConfigMasked> {
  const res = await api.get<{ success: boolean; data: GlobalPaymentConfigMasked }>(`/superadmin/payment-providers`);
  return res.data.data;
}

export async function updateGlobalPaymentConfig(payload: UpdateGlobalPaymentConfigDTO): Promise<GlobalPaymentConfigMasked> {
  const res = await api.put<{ success: boolean; data: GlobalPaymentConfigMasked }>(`/superadmin/payment-providers`, payload);
  return res.data.data;
}
