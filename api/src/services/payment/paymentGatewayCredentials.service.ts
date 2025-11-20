import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, maskSecret } from '../../utils/encryption.js';

interface UpdateCredentialsDTO {
  asaasApiKey?: string;
  infinityPayApiKey?: string;
  asaasWebhookSecret?: string;
  infinityPayWebhookSecret?: string;
}

export class PaymentGatewayCredentialsService {
  constructor(private prisma: PrismaClient) {}

  async getMasked(tenantId: string) {
    const creds = await this.prisma.paymentGatewayCredentials.findUnique({
      where: { tenantId },
    });
    if (!creds) {
      return {
        hasAsaas: false,
        hasInfinityPay: false,
        asaasApiKeyMasked: null,
        infinityPayApiKeyMasked: null,
        asaasWebhookSecretMasked: null,
        infinityPayWebhookSecretMasked: null,
      };
    }
    return {
      hasAsaas: !!creds.asaasApiKeyEnc,
      hasInfinityPay: !!creds.infinityPayApiKeyEnc,
      asaasApiKeyMasked: maskSecret(decrypt(creds.asaasApiKeyEnc) || ''),
      infinityPayApiKeyMasked: maskSecret(decrypt(creds.infinityPayApiKeyEnc) || ''),
      asaasWebhookSecretMasked: maskSecret(decrypt(creds.asaasWebhookSecretEnc) || ''),
      infinityPayWebhookSecretMasked: maskSecret(decrypt(creds.infinityPayWebhookSecretEnc) || ''),
    };
  }

  async update(tenantId: string, data: UpdateCredentialsDTO) {
    const existing = await this.prisma.paymentGatewayCredentials.findUnique({ where: { tenantId } });
    const updateData: any = {};

    if (data.asaasApiKey) updateData.asaasApiKeyEnc = encrypt(data.asaasApiKey);
    if (data.infinityPayApiKey) updateData.infinityPayApiKeyEnc = encrypt(data.infinityPayApiKey);
    if (data.asaasWebhookSecret) updateData.asaasWebhookSecretEnc = encrypt(data.asaasWebhookSecret);
    if (data.infinityPayWebhookSecret) updateData.infinityPayWebhookSecretEnc = encrypt(data.infinityPayWebhookSecret);

    const saved = existing
      ? await this.prisma.paymentGatewayCredentials.update({ where: { tenantId }, data: updateData })
      : await this.prisma.paymentGatewayCredentials.create({ data: { tenantId, ...updateData } });

    return this.getMasked(tenantId);
  }
}
