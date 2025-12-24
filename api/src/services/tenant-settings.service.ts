import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/environment.js';

interface UpdateSettingsData {
    cnpj?: string;
    companyName?: string;
    tradingName?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    taxRegime?: 'SIMPLE_NATIONAL' | 'REAL_PROFIT' | 'PRESUMED_PROFIT' | 'MEI';
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    nfeEmail?: string;
    cscId?: string;
    cscToken?: string;
    sefazEnvironment?: 'HOMOLOGACAO' | 'PRODUCAO';
}

/**
 * Serviço de gerenciamento de configurações do tenant
 */
class TenantSettingsService {
    /**
     * Buscar configurações do tenant
     */
    async getSettings(tenantId: string) {
        const prisma: any = await getTenantPrisma(tenantId);

        let settings = await prisma.tenantSettings?.findFirst?.();

        // Se não existir, criar configurações padrão
        if (!settings) {
            settings = await prisma.tenantSettings.create({
                data: {
                    cnpj: '',
                    companyName: '',
                    zipCode: '',
                    street: '',
                    number: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                    phone: '',
                    email: '',
                },
            });
        }

        // Remover dados sensíveis da resposta
        const { certificatePassword, cscToken, ...safeSettings } = settings;

        return {
            ...safeSettings,
            hasCertificate: !!settings.certificatePath,
            hasCscToken: !!settings.cscToken,
        };
    }

    /**
     * Atualizar configurações do tenant
     */
    async updateSettings(tenantId: string, data: UpdateSettingsData) {
        const prisma: any = await getTenantPrisma(tenantId);

        // Buscar configurações existentes
        const existing = await prisma.tenantSettings?.findFirst?.();

        if (!existing) {
            throw new Error('Settings not found');
        }

        // Criptografar cscToken se fornecido
        const updateData: any = { ...data };
        if (data.cscToken) {
            updateData.cscToken = encrypt(data.cscToken);
        }

        // Atualizar
        const updated = await prisma.tenantSettings.update({
            where: { id: existing.id },
            data: updateData,
        });

        // Remover dados sensíveis da resposta
        const { certificatePassword, cscToken, ...safeSettings } = updated;

        return {
            ...safeSettings,
            hasCertificate: !!updated.certificatePath,
            hasCscToken: !!updated.cscToken,
        };
    }

    /**
     * Upload de logo
     */
    async uploadLogo(tenantId: string, file: Express.Multer.File) {
        const prisma: any = await getTenantPrisma(tenantId);

        // Criar diretório de uploads se não existir
        const uploadsDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
        await fs.mkdir(uploadsDir, { recursive: true });

        // Gerar nome único para o arquivo
        const ext = path.extname(file.originalname);
        const filename = `logo-${Date.now()}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Salvar arquivo
        await fs.writeFile(filepath, file.buffer);

        // URL relativa para o frontend
        const logoUrl = `/uploads/tenants/${tenantId}/${filename}`;

        // Atualizar configurações
        const existing = await prisma.tenantSettings?.findFirst?.();

        if (existing) {
            // Deletar logo antigo se existir
            if (existing.logoUrl) {
                const oldPath = path.join(process.cwd(), existing.logoUrl);
                try {
                    await fs.unlink(oldPath);
                } catch (error) {
                    logger.warn('Failed to delete old logo:', error);
                }
            }

            await prisma.tenantSettings.update({
                where: { id: existing.id },
                data: { logoUrl },
            });
        }

        return logoUrl;
    }

    /**
     * Upload de certificado digital
     */
    async uploadCertificate(
        tenantId: string,
        file: Express.Multer.File,
        password: string
    ) {
        const prisma: any = await getTenantPrisma(tenantId);

        // Validar certificado (verificar se é um arquivo .pfx/.p12 válido)
        // TODO: Adicionar validação real do certificado usando node-forge ou similar

        // Criar diretório de certificados se não existir
        const certsDir = path.join(process.cwd(), 'certificates', tenantId);
        await fs.mkdir(certsDir, { recursive: true });

        // Gerar nome único para o arquivo
        const ext = path.extname(file.originalname);
        const filename = `certificate-${Date.now()}${ext}`;
        const filepath = path.join(certsDir, filename);

        // Salvar arquivo
        await fs.writeFile(filepath, file.buffer);

        // Caminho relativo
        const certificatePath = `/certificates/${tenantId}/${filename}`;

        // Criptografar senha usando m\u00f3dulo centralizado
        const encryptedPassword = encrypt(password);

        // Atualizar configurações
        const existing = await prisma.tenantSettings?.findFirst?.();

        if (existing) {
            // Deletar certificado antigo se existir
            if (existing.certificatePath) {
                const oldPath = path.join(process.cwd(), existing.certificatePath);
                try {
                    await fs.unlink(oldPath);
                } catch (error) {
                    logger.warn('Failed to delete old certificate:', error);
                }
            }

            await prisma.tenantSettings.update({
                where: { id: existing.id },
                data: {
                    certificatePath,
                    certificatePassword: encryptedPassword,
                    // TODO: Extrair data de expiração do certificado
                    certificateExpiryDate: null,
                },
            });
        }
    }
}

export const tenantSettingsService = new TenantSettingsService();
