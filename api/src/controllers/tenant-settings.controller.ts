import { Request, Response } from 'express';
import { tenantSettingsService } from '../services/tenant-settings.service.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

// Validation schema
const updateSettingsSchema = z.object({
    // Dados cadastrais
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).optional(),
    companyName: z.string().min(3).optional(),
    tradingName: z.string().optional(),
    stateRegistration: z.string().optional(),
    municipalRegistration: z.string().optional(),
    taxRegime: z.enum(['SIMPLE_NATIONAL', 'REAL_PROFIT', 'PRESUMED_PROFIT', 'MEI']).optional(),

    // Endereço
    zipCode: z.string().regex(/^\d{5}-\d{3}$/).optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2).optional(),

    // Contatos
    phone: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().email().optional(),
    nfeEmail: z.string().email().optional(),

    // SEFAZ
    cscId: z.string().optional(),
    cscToken: z.string().optional(),
    sefazEnvironment: z.enum(['HOMOLOGACAO', 'PRODUCAO']).optional(),
});

/**
 * Controller para gerenciamento de configurações do tenant
 */
class TenantSettingsController {
    /**
     * Buscar configurações do tenant
     */
    getSettings = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const settings = await tenantSettingsService.getSettings(tenantId);

            return res.json({
                success: true,
                data: settings,
            });
        } catch (error) {
            logger.error('Error fetching tenant settings:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar configurações',
            });
        }
    };

    /**
     * Atualizar configurações do tenant
     */
    updateSettings = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            // Validar dados
            const validationResult = updateSettingsSchema.safeParse(req.body);

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: validationResult.error.errors,
                });
            }

            const settings = await tenantSettingsService.updateSettings(
                tenantId,
                validationResult.data
            );

            logger.info(`Tenant settings updated for tenant ${tenantId}`);

            return res.json({
                success: true,
                data: settings,
                message: 'Configurações atualizadas com sucesso',
            });
        } catch (error) {
            logger.error('Error updating tenant settings:', error);

            if (error instanceof Error && error.message === 'Settings not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Configurações não encontradas',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar configurações',
            });
        }
    };

    /**
     * Upload de logo
     */
    uploadLogo = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo enviado',
                });
            }

            const logoUrl = await tenantSettingsService.uploadLogo(tenantId, req.file);

            logger.info(`Logo uploaded for tenant ${tenantId}`);

            return res.json({
                success: true,
                data: { logoUrl },
                message: 'Logo enviado com sucesso',
            });
        } catch (error) {
            logger.error('Error uploading logo:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao enviar logo',
            });
        }
    };

    /**
     * Upload de certificado digital
     */
    uploadCertificate = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;
            const { password } = req.body;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo enviado',
                });
            }

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha do certificado é obrigatória',
                });
            }

            await tenantSettingsService.uploadCertificate(
                tenantId,
                req.file,
                password
            );

            logger.info(`Certificate uploaded for tenant ${tenantId}`);

            return res.json({
                success: true,
                message: 'Certificado enviado com sucesso',
            });
        } catch (error) {
            logger.error('Error uploading certificate:', error);

            if (error instanceof Error && error.message.includes('Invalid certificate')) {
                return res.status(400).json({
                    success: false,
                    message: 'Certificado ou senha inválidos',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Erro ao enviar certificado',
            });
        }
    };
}

export const tenantSettingsController = new TenantSettingsController();
