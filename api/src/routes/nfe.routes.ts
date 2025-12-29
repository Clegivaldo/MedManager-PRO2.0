/**
 * FASE 6: Rotas de Geração e Gerenciamento de NF-e
 * 
 * Endpoints:
 * - POST /api/v1/nfe/generate - Gera NF-e a partir de pedido
 * - GET /api/v1/nfe/status/:accessKey - Consulta status de NF-e
 * - POST /api/v1/nfe/cancel - Cancela NF-e autorizada
 * - GET /api/v1/nfe/:accessKey/xml - Download XML da NF-e
 * - GET /api/v1/nfe/:accessKey/pdf - Download PDF (DANFE) da NF-e
 * - GET /api/v1/nfe/orders/:orderId - Lista NF-e de um pedido
 */

import { Router, Request, Response } from 'express';
import { NFeGenerationService, NFeData, NfeCancelRequest } from '../services/nfe-generation.service.js';
import { TenantRequest } from '../middleware/tenantMiddleware.js';
import { getTenantPrismaLegacy } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const router = Router();

/**
 * POST /api/v1/nfe/generate
 * Gera NF-e a partir de um pedido
 */
router.post('/generate', async (req: TenantRequest, res: Response) => {
  try {
    const { orderId, products, notes } = req.body;

    if (!orderId || !products || !Array.isArray(products) || products.length === 0) {
      throw new AppError('orderId e products são obrigatórios', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    // Buscar pedido
    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const order = await tenantPrisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Verificar se já tem NF-e emitida
    if (order.nfeStatus === 'issued') {
      throw new AppError('Pedido já possui NF-e emitida', 400);
    }

    // Calcular totais
    const totalValue = products.reduce((sum: number, p: any) => sum + (p.quantity * p.unitValue), 0);
    const icmsTotal = products.reduce((sum: number, p: any) => sum + (p.icms?.value || 0), 0);
    const pisTotal = products.reduce((sum: number, p: any) => sum + (p.pis?.value || 0), 0);
    const cofinsTotal = products.reduce((sum: number, p: any) => sum + (p.cofins?.value || 0), 0);

    const nfeData: NFeData = {
      orderId,
      customerId: order.customerId,
      issueDate: new Date(),
      products,
      totalValue,
      icmsTotal,
      pisTotal,
      cofinsTotal,
      notes
    };

    // Gerar NF-e
    const nfeService = new NFeGenerationService(tenantPrisma, req.tenant.id);
    const result = await nfeService.generateFromOrder(nfeData);

    logger.info('✅ NF-e gerada via API', {
      tenantId: req.tenant.id,
      userId: req.user?.userId,
      accessKey: result.accessKey,
      orderId
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'NF-e gerada com sucesso'
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar NF-e via API', {
      error: error.message,
      stack: error.stack
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao gerar NF-e'
    });
  }
});

/**
 * GET /api/v1/nfe/status/:accessKey
 * Consulta status de uma NF-e na SEFAZ
 */
router.get('/status/:accessKey', async (req: TenantRequest, res: Response) => {
  try {
    const { accessKey } = req.params;

    if (!accessKey || accessKey.length !== 44) {
      throw new AppError('Chave de acesso inválida (deve ter 44 dígitos)', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const nfeService = new NFeGenerationService(tenantPrisma, req.tenant.id);
    
    const status = await nfeService.getStatus(accessKey);

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    logger.error('❌ Erro ao consultar status NF-e', {
      error: error.message,
      accessKey: req.params.accessKey
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao consultar status'
    });
  }
});

/**
 * POST /api/v1/nfe/cancel
 * Cancela uma NF-e autorizada
 */
router.post('/cancel', async (req: TenantRequest, res: Response) => {
  try {
    const { accessKey, reason, protocol } = req.body;

    if (!accessKey || !reason || !protocol) {
      throw new AppError('accessKey, reason e protocol são obrigatórios', 400);
    }

    if (reason.length < 15) {
      throw new AppError('Justificativa deve ter no mínimo 15 caracteres', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const cancelRequest: NfeCancelRequest = {
      accessKey,
      reason,
      protocol
    };

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const nfeService = new NFeGenerationService(tenantPrisma, req.tenant.id);
    
    await nfeService.cancel(cancelRequest);

    logger.info('✅ NF-e cancelada via API', {
      tenantId: req.tenant.id,
      userId: req.user?.userId,
      accessKey,
      reason
    });

    res.json({
      success: true,
      message: 'NF-e cancelada com sucesso'
    });
  } catch (error: any) {
    logger.error('❌ Erro ao cancelar NF-e', {
      error: error.message,
      accessKey: req.body.accessKey
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao cancelar NF-e'
    });
  }
});

/**
 * GET /api/v1/nfe/:accessKey/xml
 * Download do XML da NF-e
 */
router.get('/:accessKey/xml', async (req: TenantRequest, res: Response) => {
  try {
    const { accessKey } = req.params;

    if (!accessKey || accessKey.length !== 44) {
      throw new AppError('Chave de acesso inválida', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const invoice = await tenantPrisma.invoice.findUnique({
      where: { accessKey }
    });

    if (!invoice) {
      throw new AppError('NF-e não encontrada', 404);
    }

    if (!invoice.xmlContent) {
      throw new AppError('XML não disponível', 404);
    }

    // Definir headers para download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="NFe${accessKey}.xml"`);
    
    res.send(invoice.xmlContent);
  } catch (error: any) {
    logger.error('❌ Erro ao fazer download do XML', {
      error: error.message,
      accessKey: req.params.accessKey
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao fazer download'
    });
  }
});

/**
 * GET /api/v1/nfe/:accessKey/pdf
 * Download do PDF (DANFE) da NF-e
 */
router.get('/:accessKey/pdf', async (req: TenantRequest, res: Response) => {
  try {
    const { accessKey } = req.params;

    if (!accessKey || accessKey.length !== 44) {
      throw new AppError('Chave de acesso inválida', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const invoice = await tenantPrisma.invoice.findUnique({
      where: { accessKey },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!invoice) {
      throw new AppError('NF-e não encontrada', 404);
    }

    // TODO: Gerar PDF DANFE a partir do XML
    // Usar biblioteca como danfe-pdf ou pdfkit
    
    res.status(501).json({
      success: false,
      error: 'Geração de PDF em desenvolvimento. Use o XML temporariamente.'
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar PDF', {
      error: error.message,
      accessKey: req.params.accessKey
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao gerar PDF'
    });
  }
});

/**
 * GET /api/v1/nfe/orders/:orderId
 * Lista todas as NF-e de um pedido
 */
router.get('/orders/:orderId', async (req: TenantRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    
    // Buscar pedido
    const order = await tenantPrisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Buscar NF-e do cliente desse pedido no período
    const invoices = await tenantPrisma.invoice.findMany({
      where: {
        customerId: order.customerId,
        createdAt: {
          gte: order.createdAt
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        orderId,
        orderStatus: order.status,
        nfeStatus: order.nfeStatus,
        invoices: invoices.map(inv => ({
          id: inv.id,
          accessKey: inv.accessKey,
          number: inv.number,
          series: inv.series,
          status: inv.status,
          totalValue: inv.totalValue,
          issueDate: inv.issueDate,
          authorizationDate: inv.authorizationDate,
          protocol: inv.protocol
        }))
      }
    });
  } catch (error: any) {
    logger.error('❌ Erro ao listar NF-e do pedido', {
      error: error.message,
      orderId: req.params.orderId
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno ao listar NF-e'
    });
  }
});

export default router;
