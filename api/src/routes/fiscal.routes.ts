import { Router } from 'express';
import multer from 'multer';
import { prismaMaster } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { validatePlanLimit } from '../middleware/subscription.middleware.js'; // ✅ ADDED
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { extractCertificateInfo, validateCertificate, encryptCertificate } from '../utils/certificate.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { NFeService } from '../services/nfe.service.js';
import { danfeController } from '../controllers/danfe.controller.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router: Router = Router();
const nfeService = new NFeService();

// Configurar multer para upload de certificado
// Upload de certificado (memória)
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
  logoUrl: z.string().url().optional(),
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

// Configuração de upload de logo (disco)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as any).tenant?.id || 'unknown';
    const dest = path.join(process.cwd(), 'uploads', 'logos', tenantId);
    try {
      fsSync.mkdirSync(dest, { recursive: true });
    } catch { }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true); else cb(new AppError('Invalid image format (PNG/JPG/JPEG/SVG only)', 400) as any);
  }
});

// Upload de logo - COM ENFORCEMENT DE STORAGE
router.post('/logo',
  authenticateToken,
  requirePermissions([PERMISSIONS.SYSTEM_CONFIG]),
  validatePlanLimit('storage'), // ✅ ENFORCE: Verifica limite de storage
  logoUpload.single('logo'),
  async (req, res, next) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant not identified', 400);
      if (!req.file) throw new AppError('Logo file is required', 400);

      const profile = await prismaMaster.tenantFiscalProfile.findUnique({ where: { tenantId } });
      if (!profile) throw new AppError('Fiscal profile not found. Create profile first.', 404);

      // Remover logo anterior se existir
      if (profile.logoUrl) {
        const oldPath = path.join(process.cwd(), profile.logoUrl.replace('/static/', '')); // tentando mapear caso path antigo
        try { fsSync.unlinkSync(oldPath); } catch { }
      }

      const publicUrl = `/static/logos/${tenantId}/${req.file.filename}`;
      await prismaMaster.tenantFiscalProfile.update({
        where: { tenantId },
        data: { logoUrl: publicUrl }
      });

      logger.info('Logo uploaded successfully', { tenantId, file: req.file.filename });
      res.json({ success: true, logoUrl: publicUrl });
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

// Upload de certificado digital A1 - COM ENFORCEMENT DE STORAGE
router.post(
  '/certificate',
  authenticateToken,
  requirePermissions([PERMISSIONS.SYSTEM_CONFIG]),
  validatePlanLimit('storage'), // ✅ ENFORCE: Verifica limite de storage
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
        } catch { }
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

/**
 * NF-e Actions (Emit, Status, Cancel, CC-e)
 */
// Emitir NF-e a partir de uma `invoice` existente
router.post('/nfe/emit/:invoiceId', authenticateToken, requirePermissions([PERMISSIONS.NFE_ISSUE]), tenantMiddleware, async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.tenant?.id as string;
    if (!tenantId) throw new AppError('Tenant not identified', 400);
    // Buscar invoice completa para montar dados da NF-e
    const invoice = await withTenantPrisma({ id: tenantId } as any, async (prisma) => {
      return prisma.invoice.findFirst({
        where: { id: invoiceId },
        include: {
          customer: true,
          items: { include: { product: true, batch: true } }
        }
      });
    });
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (!invoice.items || invoice.items.length === 0) throw new AppError('Invoice has no items', 400);

    // Calcular totais básicos
    const subtotal = invoice.items.reduce((sum: number, it: any) => sum + Number(it.totalPrice || 0), 0);
    const discount = invoice.items.reduce((sum: number, it: any) => sum + Number(it.discount || 0), 0);
    const total = Number(invoice.totalValue || subtotal - discount);
    const tax = Number((total * 0.18).toFixed(2));

    const nfeData: any = {
      invoice: {
        id: invoice.id,
        invoiceNumber: String(invoice.number || invoice.id.substring(0, 8)),
        operationType: 'SAIDA',
        cfop: invoice.items[0]?.cfop || '5405',
        naturezaOperacao: 'VENDA DE MERCADORIA PARA TERCEIROS',
        paymentMethod: 'billet',
        installments: 1,
        observations: undefined,
        subtotal,
        discount,
        tax,
        total,
        createdAt: invoice.issueDate || new Date(),
      },
      issuer: {
        cnpj: req.tenant!.cnpj,
        name: req.tenant!.name,
        stateRegistration: '',
        municipalRegistration: undefined,
        address: '',
        phone: undefined,
        email: undefined,
      },
      customer: {
        id: invoice.customer?.id,
        name: invoice.customer?.companyName,
        cnpjCpf: invoice.customer?.cnpjCpf,
        email: invoice.customer?.email,
        phone: invoice.customer?.phone,
        address: invoice.customer?.address,
        stateRegistration: undefined,
        municipalRegistration: undefined,
        customerType: invoice.customer?.customerType,
      },
      items: invoice.items.map((item: any) => ({
        id: item.id,
        product: {
          id: item.productId,
          name: item.product?.name,
          ncm: item.ncm || '3003.90.00',
          unit: 'UN',
          cfop: item.cfop || '5405',
        },
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
        subtotal: Number(item.totalPrice),
        total: Number(item.totalPrice),
        icms: Number(item.totalPrice) * 0.18,
        batch: item.batch ? {
          id: item.batch.id,
          batchNumber: item.batch.batchNumber,
          expirationDate: item.batch.expirationDate,
          manufacturingDate: item.batch.manufactureDate || undefined,
        } : undefined,
      }))
    };

    const result = await nfeService.emitNFe(nfeData, tenantId);
    res.json({ success: result.success, data: result });
  } catch (error) {
    next(error);
  }
});

// Consultar status da NF-e pela chave de acesso
router.get('/nfe/status/:accessKey', authenticateToken, requirePermissions([PERMISSIONS.INVOICE_READ]), tenantMiddleware, async (req, res, next) => {
  try {
    const { accessKey } = req.params;
    const tenantId = req.tenant?.id as string;
    if (!tenantId) throw new AppError('Tenant not identified', 400);

    const result = await nfeService.consultarStatusNFe(accessKey, tenantId);
    res.json({ success: result.status === 'authorized', data: result });
  } catch (error) {
    next(error);
  }
});

// Download DANFE PDF
router.get('/nfe/:invoiceId/danfe', authenticateToken, requirePermissions([PERMISSIONS.INVOICE_READ]), tenantMiddleware, danfeController.generate.bind(danfeController));

// Cancelar NF-e autorizada
router.post('/nfe/cancel/:invoiceId', authenticateToken, requirePermissions([PERMISSIONS.NFE_CANCEL]), tenantMiddleware, async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { justification, protocolNumber } = req.body || {};
    const tenantId = req.tenant?.id as string;
    if (!tenantId) throw new AppError('Tenant not identified', 400);
    const invoice = await withTenantPrisma({ id: tenantId } as any, async (prisma) => {
      return prisma.invoice.findFirst({ where: { id: invoiceId } });
    });
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (!invoice.accessKey) throw new AppError('Invoice has no NF-e access key', 400);
    const result = await nfeService.cancelNFe({
      accessKey: invoice.accessKey,
      protocolNumber: protocolNumber || invoice.protocol || '',
      justification: justification || 'Cancelamento solicitado',
      cnpj: req.tenant!.cnpj,
    }, tenantId);
    res.json({ success: result.success, data: result });
  } catch (error) {
    next(error);
  }
});

// Carta de Correção Eletrônica (CC-e)
router.post('/nfe/cce/:invoiceId', authenticateToken, requirePermissions([PERMISSIONS.NFE_CORRECT]), tenantMiddleware, async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { correctionText } = req.body || {};
    const tenantId = req.tenant?.id as string;
    if (!tenantId) throw new AppError('Tenant not identified', 400);

    const result = await nfeService.enviarCCe(invoiceId, tenantId, correctionText);
    res.json({ success: result.success, data: result });
  } catch (error) {
    next(error);
  }
});
