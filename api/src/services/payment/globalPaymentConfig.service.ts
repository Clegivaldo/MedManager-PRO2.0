import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt, maskSecret } from '../../utils/encryption.js';

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

export class GlobalPaymentConfigService {
  constructor(private prisma: PrismaClient) {}

  private async ensureSingleton(): Promise<any> {
    // Usamos any aqui para evitar erros de tipagem antes do prisma generate
    const prismaAny = this.prisma as any;
    let cfg = await prismaAny.globalPaymentConfig.findUnique({ where: { id: 'global' } });
    if (!cfg) {
      cfg = await prismaAny.globalPaymentConfig.create({ data: { id: 'global' } });
    }
    return cfg;
  }

  async getMasked(): Promise<GlobalPaymentConfigMasked> {
    const cfg = await this.ensureSingleton();
    return {
      activeGateway: (cfg.activeGateway as any) || 'asaas',
      asaasEnvironment: (cfg.asaasEnvironment as any) || 'sandbox',
      asaasApiKeyMasked: maskSecret(decrypt(cfg.asaasApiKeyEnc) || ''),
      asaasWebhookTokenMasked: maskSecret(decrypt(cfg.asaasWebhookTokenEnc) || ''),
      infinityPayMerchantIdMasked: maskSecret(decrypt(cfg.infinityPayMerchantIdEnc) || ''),
      infinityPayApiKeyMasked: maskSecret(decrypt(cfg.infinityPayApiKeyEnc) || ''),
      infinityPayPublicKeyMasked: maskSecret(decrypt(cfg.infinityPayPublicKeyEnc) || ''),
      infinityPayWebhookSecretMasked: maskSecret(decrypt(cfg.infinityPayWebhookSecretEnc) || ''),
    };
  }

  async update(data: UpdateGlobalPaymentConfigDTO): Promise<GlobalPaymentConfigMasked> {
    await this.ensureSingleton();
    const updateData: any = {};

    if (data.activeGateway) updateData.activeGateway = data.activeGateway;
    if (data.asaasEnvironment) updateData.asaasEnvironment = data.asaasEnvironment;

    if (data.asaasApiKey) updateData.asaasApiKeyEnc = encrypt(data.asaasApiKey);
    if (data.asaasWebhookToken) updateData.asaasWebhookTokenEnc = encrypt(data.asaasWebhookToken);

    if (data.infinityPayMerchantId) updateData.infinityPayMerchantIdEnc = encrypt(data.infinityPayMerchantId);
    if (data.infinityPayApiKey) updateData.infinityPayApiKeyEnc = encrypt(data.infinityPayApiKey);
    if (data.infinityPayPublicKey) updateData.infinityPayPublicKeyEnc = encrypt(data.infinityPayPublicKey);
    if (data.infinityPayWebhookSecret) updateData.infinityPayWebhookSecretEnc = encrypt(data.infinityPayWebhookSecret);

    const prismaAny = this.prisma as any;
    await prismaAny.globalPaymentConfig.update({ where: { id: 'global' }, data: updateData });
    return this.getMasked();
  }

  // Helpers para outras services
  async getAsaasConfig() {
    const cfg = await this.ensureSingleton();
    return {
      apiKey: decrypt(cfg.asaasApiKeyEnc) || process.env.ASAAS_API_KEY || '',
      environment: (cfg.asaasEnvironment as any) || (process.env.ASAAS_ENVIRONMENT as any) || 'sandbox',
      webhookToken: decrypt(cfg.asaasWebhookTokenEnc) || process.env.ASAAS_WEBHOOK_TOKEN || '',
    };
  }
}
