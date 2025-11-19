import { Router } from 'express';
import multer from 'multer';
import { prismaMaster } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { extractCertificateInfo, validateCertificate, encryptCertificate } from '../utils/certificate.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

const router: Router = Router();

// Configurar multer para upload de certificado
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pfx' || ext === '.p12') {
      cb(null, true);
    } else {
      cb(new AppError('Only .pfx or .p12 certificate files are allowed', 400) as any);
    }
  }
});

// Middleware para tratar erros do multer
import { Request, Response, NextFunction } from 'express';
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
  next();
};

const fiscalProfileSchema = z.object({
  companyName: z.string().min(1),
  tradingName: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$/),
  stateRegistration: z.string().optional(),
  municipalRegistration: z.string().optional(),
  taxRegime: z.enum(['simple_national', 'real_profit', 'presumed_profit']).default('simple_national'),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    district: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string()
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  cscId: z.string().optional(),
  cscToken: z.string().optional(),
  certificateType: z.enum(['A1', 'A3']).optional(),
  certificatePath: z.string().optional(),
  certificatePassword: z.string().optional(),
  certificateExpiresAt: z.string().datetime().optional(),
  sefazEnvironment: z.enum(['homologacao', 'producao']).default('homologacao')
});

const fiscalSeriesSchema = z.object({
  seriesNumber: z.number().int().positive(),
  invoiceType: z.enum(['ENTRY', 'EXIT', 'DEVOLUTION']),
  nextNumber: z.number().int().positive().default(1)
});

// Obter perfil fiscal do tenant
router.get('/', authenticateToken, requirePermissions([PERMISSIONS.SYSTEM_CONFIG]), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant not identified', 400);
    }

    const profile = await prismaMaster.tenantFiscalProfile.findUnique({
      where: { tenantId },
      include: { series: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Fiscal profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// Criar ou atualizar perfil fiscal
router.post('/', authenticateToken, requirePermissions([PERMISSIONS.SYSTEM_CONFIG]), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant not identified', 400);
    }

    const validatedData = fiscalProfileSchema.parse(req.body);

    const profile = await prismaMaster.tenantFiscalProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...validatedData,
        address: validatedData.address as any
      },
      update: {
        ...validatedData,
        address: validatedData.address as any
      },
      include: { series: true }
    });

    logger.info(`Fiscal profile upserted for tenant ${tenantId}`);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// Criar série fiscal
router.post('/series', authenticateToken, requirePermissions([PERMISSIONS.SYSTEM_CONFIG]), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant not identified', 400);
    }

    const profile = await prismaMaster.tenantFiscalProfile.findUnique({
      where: { tenantId }
    });

    if (!profile) {
      throw new AppError('Fiscal profile not found. Create profile first.', 404);
    }

    const validatedData = fiscalSeriesSchema.parse(req.body);

    const series = await prismaMaster.fiscalSeries.upsert({
      where: {
        fiscalProfileId_seriesNumber_invoiceType: {
          fiscalProfileId: profile.id,
          seriesNumber: validatedData.seriesNumber,
          invoiceType: validatedData.invoiceType
        }
      },
      create: {
        fiscalProfileId: profile.id,
        ...validatedData
      },
      update: {
        nextNumber: validatedData.nextNumber,
        isActive: true
      }
    });

    logger.info(`Fiscal series upserted for profile ${profile.id}`);
    res.status(201).json({ series });
  } catch (error) {
    next(error);
  }
});

// Atualizar série fiscal
router.put('/series/:id', authenticateToken, requirePermissions([PERMISSIONS.SYSTEM_CONFIG]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nextNumber, isActive } = req.body;

    const series = await prismaMaster.fiscalSeries.update({
      where: { id },
      data: {
        ...(nextNumber !== undefined && { nextNumber }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({ series });
  } catch (error) {
    next(error);
  }
});

// Upload de certificado digital A1
router.post(
  '/certificate',
  authenticateToken,
  requirePermissions([PERMISSIONS.SYSTEM_CONFIG]),
  upload.single('certificate'),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        throw new AppError('Tenant not identified', 400);
      }

      if (!req.file) {
        throw new AppError('Certificate file is required', 400);
      }

      const { password, certificateType } = req.body;

      if (!password) {
        throw new AppError('Certificate password is required', 400);
      }

      if (!certificateType || (certificateType !== 'A1' && certificateType !== 'A3')) {
        throw new AppError('Certificate type must be A1 or A3', 400);
      }

      // Extrair informações do certificado
      const certInfo = extractCertificateInfo(req.file.buffer, password);

      // Validar certificado
      validateCertificate(certInfo);

      // Criptografar certificado para armazenamento
        const encryptedCert = encryptCertificate(req.file.buffer);

      // Salvar em diretório seguro
      const certDir = path.join(process.cwd(), 'certificates', tenantId);
      await fs.mkdir(certDir, { recursive: true });
      
      const certFileName = `cert_${Date.now()}.pfx.enc`;
      const certPath = path.join(certDir, certFileName);
      await fs.writeFile(certPath, encryptedCert, 'utf-8');

      // Atualizar perfil fiscal com informações do certificado
      const profile = await prismaMaster.tenantFiscalProfile.findUnique({
        where: { tenantId }
      });

      if (!profile) {
        // Limpar arquivo se não houver perfil fiscal
        await fs.unlink(certPath);
        throw new AppError('Fiscal profile not found. Create fiscal profile first.', 404);
      }

      // Remover certificado antigo se existir
      if (profile.certificatePath) {
        try {
          await fs.unlink(profile.certificatePath);
        } catch (error) {
          logger.warn('Failed to delete old certificate', { path: profile.certificatePath });
        }
      }

      // Atualizar perfil fiscal
      const updatedProfile = await prismaMaster.tenantFiscalProfile.update({
        where: { tenantId },
        data: {
          certificateType,
          certificatePath: certPath,
          certificatePassword: password, // Em produção: armazenar em secret manager
          certificateExpiresAt: certInfo.notAfter
        }
      });

      logger.info('Certificate uploaded successfully', {
        tenantId,
        subject: certInfo.subject.CN,
        expiresAt: certInfo.notAfter,
        daysUntilExpiry: certInfo.daysUntilExpiry
      });

      res.json({
        success: true,
        message: 'Certificate uploaded successfully',
        certificate: {
          subject: certInfo.subject,
          issuer: certInfo.issuer,
          notBefore: certInfo.notBefore,
          notAfter: certInfo.notAfter,
          daysUntilExpiry: certInfo.daysUntilExpiry,
          serialNumber: certInfo.serialNumber
        }
      });

    } catch (error) {
      // Limpar arquivo em caso de erro
      if (req.file) {
        const certPath = path.join(process.cwd(), 'certificates', req.tenant?.id || '', `cert_${Date.now()}.pfx.enc`);
        try {
          await fs.unlink(certPath);
        } catch {}
      }
      next(error);
    }
  }
);

// Consultar status do certificado
router.get('/certificate', authenticateToken, requirePermissions([PERMISSIONS.SYSTEM_CONFIG]), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant not identified', 400);
    }

    const profile = await prismaMaster.tenantFiscalProfile.findUnique({
      where: { tenantId },
      select: {
        certificateType: true,
        certificatePath: true,
        certificateExpiresAt: true
      }
    });

    if (!profile || !profile.certificatePath) {
      return res.status(404).json({ error: 'No certificate found' });
    }

    const now = new Date();
    const expiresAt = profile.certificateExpiresAt;
    const daysUntilExpiry = expiresAt 
      ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const isExpired = expiresAt ? now > expiresAt : false;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 30;

    res.json({
      certificateType: profile.certificateType,
      expiresAt,
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      status: isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'valid'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
