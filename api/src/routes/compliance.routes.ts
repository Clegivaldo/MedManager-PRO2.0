/**
 * FASE 7: Rotas de Conformidade e Relatórios ANVISA
 * 
 * Endpoints:
 * - GET /api/v1/compliance/report - Gera relatório de conformidade
 * - POST /api/v1/compliance/export - Exporta relatório em formato específico
 * - GET /api/v1/compliance/guia33 - Relatório Guia 33
 * - GET /api/v1/compliance/sngpc - Relatório SNGPC
 * - GET /api/v1/compliance/sncm - Relatório SNCM
 * - GET /api/v1/compliance/validate - Valida integridade de dados
 */

import { Router, Response } from 'express';
import { AnvisaReportsService, AnvisaReportFilter } from '../services/anvisa-reports.service.js';
import { TenantRequest } from '../middleware/tenantMiddleware.js';
import { getTenantPrismaLegacy } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/v1/compliance/report
 * Gera relatório de conformidade ANVISA
 */
router.get('/report', async (req: TenantRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      reportType = 'FULL_COMPLIANCE',
      includeArchived = false
    } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('startDate e endDate são obrigatórios', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const filter: AnvisaReportFilter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      reportType: reportType as any,
      includeArchived: includeArchived === 'true'
    };

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const anvisaService = new AnvisaReportsService(tenantPrisma, req.tenant.id);

    const report = await anvisaService.generateComplianceReport(filter);

    logger.info('✅ Relatório ANVISA gerado via API', {
      tenantId: req.tenant.id,
      userId: req.user?.userId,
      reportType: filter.reportType,
      reportId: report.id
    });

    res.json({
      success: true,
      data: report,
      message: 'Relatório gerado com sucesso'
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar relatório ANVISA', {
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
      error: 'Erro interno ao gerar relatório'
    });
  }
});

/**
 * POST /api/v1/compliance/export
 * Exporta relatório em formato específico (CSV, PDF, XML)
 */
router.post('/export', async (req: TenantRequest, res: Response) => {
  try {
    const { reportId, format = 'json' } = req.body;

    if (!reportId) {
      throw new AppError('reportId é obrigatório', 400);
    }

    const validFormats = ['json', 'csv', 'pdf', 'xml'];
    if (!validFormats.includes(format)) {
      throw new AppError(`Formato inválido. Opções: ${validFormats.join(', ')}`, 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const anvisaService = new AnvisaReportsService(tenantPrisma, req.tenant.id);

    const exportData = await anvisaService.exportReport(reportId, format as any);

    // Definir Content-Type apropriado
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf',
      xml: 'application/xml'
    };

    const fileExtensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      pdf: 'pdf',
      xml: 'xml'
    };

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anvisa_report_${reportId}.${fileExtensions[format]}"`
    );

    logger.info('✅ Relatório ANVISA exportado', {
      tenantId: req.tenant.id,
      userId: req.user?.userId,
      reportId,
      format
    });

    res.send(exportData);
  } catch (error: any) {
    logger.error('❌ Erro ao exportar relatório', {
      error: error.message
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
      error: 'Erro interno ao exportar relatório'
    });
  }
});

/**
 * GET /api/v1/compliance/guia33
 * Gera relatório específico de Guia 33
 */
router.get('/guia33', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('startDate e endDate são obrigatórios', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const filter: AnvisaReportFilter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      reportType: 'GUIA33'
    };

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const anvisaService = new AnvisaReportsService(tenantPrisma, req.tenant.id);

    const report = await anvisaService.generateComplianceReport(filter);

    res.json({
      success: true,
      data: report.data,
      checksum: report.checksum,
      generatedAt: report.generatedAt
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar relatório Guia 33', {
      error: error.message
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
      error: 'Erro interno ao gerar relatório'
    });
  }
});

/**
 * GET /api/v1/compliance/sngpc
 * Gera relatório específico de SNGPC
 */
router.get('/sngpc', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('startDate e endDate são obrigatórios', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const filter: AnvisaReportFilter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      reportType: 'SNGPC'
    };

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const anvisaService = new AnvisaReportsService(tenantPrisma, req.tenant.id);

    const report = await anvisaService.generateComplianceReport(filter);

    res.json({
      success: true,
      data: report.data,
      checksum: report.checksum,
      generatedAt: report.generatedAt
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar relatório SNGPC', {
      error: error.message
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
      error: 'Erro interno ao gerar relatório'
    });
  }
});

/**
 * GET /api/v1/compliance/sncm
 * Gera relatório específico de SNCM
 */
router.get('/sncm', async (req: TenantRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('startDate e endDate são obrigatórios', 400);
    }

    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const filter: AnvisaReportFilter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      reportType: 'SNCM'
    };

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);
    const anvisaService = new AnvisaReportsService(tenantPrisma, req.tenant.id);

    const report = await anvisaService.generateComplianceReport(filter);

    res.json({
      success: true,
      data: report.data,
      checksum: report.checksum,
      generatedAt: report.generatedAt
    });
  } catch (error: any) {
    logger.error('❌ Erro ao gerar relatório SNCM', {
      error: error.message
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
      error: 'Erro interno ao gerar relatório'
    });
  }
});

/**
 * GET /api/v1/compliance/validate
 * Valida integridade de dados e conformidade
 */
router.get('/validate', async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant não identificado', 400);
    }

    const tenantPrisma = getTenantPrismaLegacy(req.tenant);

    // Validações básicas
    const validations = {
      controlledSubstances: await tenantPrisma.controlledSubstance.count({
        where: { status: 'active' }
      }),
      pendingSngpcSubmissions: await tenantPrisma.sngpcSubmission.count({
        where: { status: 'pending' }
      }),
      failedSngpcSubmissions: await tenantPrisma.sngpcSubmission.count({
        where: { status: 'failed' }
      }),
      medicationTrackings: await tenantPrisma.medicationTracking.count(),
      prescriptionsNotUsed: await tenantPrisma.controlledPrescription.count({
        where: { isUsed: false }
      })
    };

    const issues = [];

    if (validations.failedSngpcSubmissions > 0) {
      issues.push({
        type: 'FAILED_SUBMISSIONS',
        count: validations.failedSngpcSubmissions,
        severity: 'HIGH',
        message: 'Existem submissões SNGPC falhadas que precisam ser reenviadas'
      });
    }

    if (validations.pendingSngpcSubmissions > 10) {
      issues.push({
        type: 'PENDING_BACKLOG',
        count: validations.pendingSngpcSubmissions,
        severity: 'MEDIUM',
        message: 'Acúmulo de submissões pendentes'
      });
    }

    const isCompliant = issues.filter(i => i.severity === 'HIGH').length === 0;

    res.json({
      success: true,
      data: {
        isCompliant,
        validations,
        issues,
        validatedAt: new Date()
      }
    });
  } catch (error: any) {
    logger.error('❌ Erro ao validar conformidade', {
      error: error.message
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
      error: 'Erro interno ao validar conformidade'
    });
  }
});

export default router;
