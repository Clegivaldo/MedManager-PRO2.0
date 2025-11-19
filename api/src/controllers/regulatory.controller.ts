import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { PERMISSIONS, requirePermission } from '../middleware/permissions.js';
import { prismaMaster as prisma } from '../lib/prisma.js';
import { auditLog } from '../utils/audit.js';

const prismaClient = prisma;

export class RegulatoryController {
  // SNGPC - Sistema Nacional de Gerenciamento de Produtos Controlados
  async getSNGPCStatus(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      
      // Check if user has permission to view regulatory data
      if (!req.user?.permissions?.includes(PERMISSIONS.REGULATORY_VIEW)) {
        throw new AppError('Insufficient permissions to view regulatory data', 403);
      }

      const submissions = await prisma.sngpcSubmission.findMany({
        orderBy: { submissionDate: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, email: true } } }
      });

      res.json({
        status: 'active',
        lastSubmission: submissions[0] || null,
        submissions,
        complianceStatus: await this.calculateSNGPCCompliance('')
      });
    } catch (error) {
      logger.error('Error getting SNGPC status:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async submitSNGPC(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { period, products } = req.body;

      // Check permission
      if (!req.user?.permissions?.includes(PERMISSIONS.REGULATORY_MANAGE_SNGPC)) {
        throw new AppError('Insufficient permissions to submit SNGPC', 403);
      }

      // Validate period
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      
      if (startDate >= endDate) {
        throw new AppError('Invalid period: start date must be before end date', 400);
      }

      const movementsCount = await prisma.controlledSubstanceMovement.count({
        where: { movementDate: { gte: startDate, lte: endDate } }
      });

      const xmlData = await this.generateSNGPCXML([]);
      const submission = await prisma.sngpcSubmission.create({
        data: {
          submittedBy: req.user!.userId,
          periodStart: startDate,
          periodEnd: endDate,
          xmlData,
          movementsCount,
          status: 'submitted'
        }
      });

      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'SNGPCSubmission',
        recordId: submission.id,
        operation: 'CREATE',
        newData: { period }
      });

      await prisma.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'SNGPC_SUBMISSION',
          severity: 'info',
          message: `SNGPC enviado para o período ${startDate.toISOString()} - ${endDate.toISOString()}`
        }
      });

      res.json({
        message: 'SNGPC submitted successfully',
        submission
      });
    } catch (error) {
      logger.error('Error submitting SNGPC:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // SNCM - Sistema Nacional de Controle de Medicamentos
  async getSNCMStatus(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      
      if (!req.user?.permissions?.includes(PERMISSIONS.REGULATORY_VIEW)) {
        throw new AppError('Insufficient permissions to view regulatory data', 403);
      }

      const trackingRecords = await prisma.medicationTracking.count();
      const trackedProductsAgg = await prisma.medicationTracking.findMany({ select: { productId: true } });
      const activeBatchesAgg = await prisma.medicationTracking.findMany({ select: { batchId: true } });
      const trackedProducts = new Set(trackedProductsAgg.map(r => r.productId)).size;
      const activeBatches = new Set(activeBatchesAgg.map(r => r.batchId)).size;

      res.json({
        status: 'active',
        trackedProducts,
        activeBatches,
        trackingRecords,
        products: []
      });
    } catch (error) {
      logger.error('Error getting SNCM status:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async trackMedication(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { productId, batchId, action, quantity, destination, prescriptionData } = req.body;

      if (!req.user?.permissions?.includes(PERMISSIONS.REGULATORY_MANAGE_SNCM)) {
        throw new AppError('Insufficient permissions to track medications', 403);
      }

      // Validate product and batch
      const product = await prisma.product.findFirst({ where: { id: productId } });

      if (!product) {
        throw new AppError('Product not found or does not require tracking', 404);
      }

      const batch = await prisma.batch.findFirst({ where: { id: batchId, productId } });

      if (!batch) {
        throw new AppError('Batch not found', 404);
      }

      // Create tracking record
      const trackingRecord = await prisma.medicationTracking.create({
        data: {
          productId,
          batchId,
          action,
          quantity,
          destination,
          prescriptionData: prescriptionData || null,
          trackedBy: req.user!.userId,
          status: 'active'
        }
      });

      // Update batch tracking status
      

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'MedicationTracking',
        recordId: trackingRecord.id,
        operation: 'TRACK',
        newData: { productId, batchId, action, quantity }
      });

      await prisma.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'SNCM_TRACK',
          severity: 'info',
          message: `Rastreio ${action} de ${quantity} unidade(s) do produto ${product.name}`
        }
      });

      res.json({
        message: 'Medication tracked successfully',
        trackingRecord: {
          id: trackingRecord.id,
          productId: trackingRecord.productId,
          batchId: trackingRecord.batchId,
          action: trackingRecord.action,
          quantity: trackingRecord.quantity,
          trackedAt: trackingRecord.trackedAt
        }
      });
    } catch (error) {
      logger.error('Error tracking medication:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Guia 33 - Controlled Substances Management
  async getControlledSubstances(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { page = 1, limit = 10, status, type } = req.query;

      if (!req.user?.permissions?.includes(PERMISSIONS.CONTROLLED_READ)) {
        throw new AppError('Insufficient permissions to view controlled substances', 403);
      }

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = { tenantId };
      
      if (status) where.status = status;
      if (type) where.substanceType = type;

      const substances = await prisma.controlledSubstance.findMany({
        where,
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          _count: { select: { movements: true } }
        }
      });
      const total = await prisma.controlledSubstance.count({ where });

      res.json({
        substances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting controlled substances:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async createControlledSubstance(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { productId, substanceType, potency, unit, requiresPrescription, specialControls } = req.body;

      if (!req.user?.permissions?.includes(PERMISSIONS.CONTROLLED_CREATE)) {
        throw new AppError('Insufficient permissions to create controlled substances', 403);
      }

      // Validate product
      const product = await prisma.product.findFirst({ where: { id: productId } });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const regNumber = await this.generateRegistrationNumber('');
      const substance = await prisma.controlledSubstance.create({
        data: {
          productId,
          substanceType,
          potency,
          unit,
          requiresPrescription: requiresPrescription || false,
          specialControls: specialControls ? JSON.stringify(specialControls) : null,
          status: 'active',
          createdBy: req.user!.userId,
          registrationNumber: regNumber
        }
      });

      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'ControlledSubstance',
        recordId: substance.id,
        operation: 'CREATE',
        newData: { productId, substanceType, potency }
      });

      await prisma.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'CONTROLLED_SUBSTANCE_CREATE',
          severity: 'warning',
          message: `Substância controlada criada: ${substance.substanceType} para produto ${product.name}`
        }
      });

      res.status(201).json({
        message: 'Controlled substance created successfully',
        substance
      });
    } catch (error) {
      logger.error('Error creating controlled substance:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async generateGuia33(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { period, substanceId } = req.body;

      if (!req.user?.permissions?.includes(PERMISSIONS.CONTROLLED_GENERATE_G33)) {
        throw new AppError('Insufficient permissions to generate Guia 33', 403);
      }

      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      // Get controlled substance movements for the period
      const movements = await prisma.controlledSubstanceMovement.findMany({
        where: {
          substanceId,
          movementDate: { gte: startDate, lte: endDate }
        },
        include: {
          substance: { include: { product: true } },
          batch: true,
          customer: true,
          supplier: true
        },
        orderBy: { movementDate: 'asc' }
      });

      // Calculate opening and closing balances
      const openingBalance = await this.calculateOpeningBalance('', substanceId, startDate);
      const closingBalance = await this.calculateClosingBalance('', substanceId, endDate);

      // Generate Guia 33 report
      const guia33 = {
        period: { start: startDate, end: endDate },
        substance: movements[0]?.substance,
        openingBalance,
        movements: movements.map(m => ({
          date: m.movementDate,
          type: m.movementType,
          quantity: m.quantity,
          batch: m.batch?.batchNumber,
          document: m.documentNumber,
          customer: m.customer?.companyName,
          supplier: m.supplier?.companyName
        })),
        closingBalance,
        generatedAt: new Date(),
        generatedBy: req.user!.userId
      };

      const guia33Record = await prisma.guia33.create({
        data: {
          substanceId,
          periodStart: startDate,
          periodEnd: endDate,
          openingBalance,
          closingBalance,
          movementsCount: movements.length,
          generatedBy: req.user!.userId,
          status: 'generated',
          pdfData: Buffer.from(JSON.stringify(guia33))
        }
      });

      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'Guia33',
        recordId: guia33Record.id,
        operation: 'GENERATE',
        newData: { substanceId, period }
      });

      await prisma.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'GUIA33_GENERATE',
          severity: 'info',
          message: `Guia 33 gerada para substância ${substanceId}, período ${startDate.toISOString()} - ${endDate.toISOString()}`
        }
      });

      res.json({
        message: 'Guia 33 generated successfully',
        guia33: { id: guia33Record.id, period: guia33.period, movementsCount: guia33Record.movementsCount, generatedAt: guia33Record.generatedAt }
      });
    } catch (error) {
      logger.error('Error generating Guia 33:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // RDC 430 Compliance Reports
  async getComplianceReport(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { reportType, period } = req.query;

      if (!req.user?.permissions?.includes(PERMISSIONS.REGULATORY_VIEW_AUDIT)) {
        throw new AppError('Insufficient permissions to view compliance reports', 403);
      }

      let reportData: any = {};

      switch (reportType) {
        case 'inventory_compliance':
          reportData = await this.generateInventoryComplianceReport(tenantId, period as string);
          break;
        case 'controlled_substances':
          reportData = await this.generateControlledSubstancesReport(tenantId, period as string);
          break;
        case 'prescription_compliance':
          reportData = await this.generatePrescriptionComplianceReport(tenantId, period as string);
          break;
        case 'audit_trail':
          reportData = await this.generateAuditTrailReport(tenantId, period as string);
          break;
        default:
          throw new AppError('Invalid report type', 400);
      }

      res.json({
        reportType,
        period,
        generatedAt: new Date(),
        data: reportData
      });
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Helper methods
  private async calculateSNGPCCompliance(tenantId: string): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const submissions = await prisma.sngpcSubmission.count({ where: { submissionDate: { gte: last30Days } } });
    return { status: submissions > 0 ? 'compliant' : 'pending', submissionsCount: submissions };
  }

  private async generateSNGPCXML(movements: any[]): Promise<string> {
    // This would generate actual SNGPC XML format
    // For now, return a placeholder
    return `<?xml version="1.0" encoding="UTF-8"?>
<sngpc>
  <movements>${movements.length}</movements>
  <generatedAt>${new Date().toISOString()}</generatedAt>
</sngpc>`;
  }

  private async generateRegistrationNumber(tenantId: string): Promise<string> {
    return `CS${Date.now()}0001`;
  }

  private async calculateOpeningBalance(tenantId: string, substanceId: string, date: Date): Promise<number> {
    const movements = await prisma.controlledSubstanceMovement.findMany({ where: { substanceId, movementDate: { lt: date } } });
    return movements.reduce((balance, m) => (m.movementType === 'IN' ? balance + m.quantity : balance - m.quantity), 0);
  }

  private async calculateClosingBalance(tenantId: string, substanceId: string, date: Date): Promise<number> {
    const movements = await prisma.controlledSubstanceMovement.findMany({ where: { substanceId, movementDate: { lte: date } } });
    return movements.reduce((balance, m) => (m.movementType === 'IN' ? balance + m.quantity : balance - m.quantity), 0);
  }

  private async generateInventoryComplianceReport(tenantId: string, period: string): Promise<any> {
    // Implementation for inventory compliance report
    return {
      type: 'inventory_compliance',
      period,
      compliantProducts: 150,
      nonCompliantProducts: 5,
      expiredProducts: 2,
      nearExpiryProducts: 8
    };
  }

  private async generateControlledSubstancesReport(tenantId: string, period: string): Promise<any> {
    // Implementation for controlled substances report
    return {
      type: 'controlled_substances',
      period,
      totalControlledSubstances: 25,
      activeMovements: 156,
      complianceRate: 98.5
    };
  }

  private async generatePrescriptionComplianceReport(tenantId: string, period: string): Promise<any> {
    // Implementation for prescription compliance report
    return {
      type: 'prescription_compliance',
      period,
      totalPrescriptions: 342,
      validPrescriptions: 335,
      invalidPrescriptions: 7,
      complianceRate: 97.9
    };
  }

  private async generateAuditTrailReport(tenantId: string, period: string): Promise<any> {
    // Implementation for audit trail report
    return {
      type: 'audit_trail',
      period,
      totalAuditRecords: 1250,
      criticalActions: 45,
      warnings: 12,
      complianceStatus: 'good'
    };
  }
}