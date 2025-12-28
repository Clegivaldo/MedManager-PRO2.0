import { prismaMaster } from '../lib/prisma.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

interface SubstanceMovementDTO {
  substanceId: string;
  patientId: string;
  patientName: string;
  quantity: number;
  prescriptionId?: string;
  prescriptionDate?: Date;
  operationType: 'ISSUE' | 'RECEIVE' | 'RETURN' | 'LOSS' | 'WASTE';
  registeredBy: string;
  notes?: string;
}

interface Guia33Report {
  substance: any;
  period: { start: Date; end: Date };
  movements: any[];
  totalIssued: number;
  totalReceived: number;
  totalReturned: number;
  totalLoss: number;
  balance: number;
}

export class Guia33Service {
  /**
   * Validar data de prescrição (máximo 30 dias após emissão)
   */
  async validatePrescriptionDate(prescriptionDate: Date, validityDays: number = 30): Promise<{
    valid: boolean;
    daysRemaining: number;
    daysElapsed: number;
    message: string;
  }> {
    const now = new Date();
    const issued = new Date(prescriptionDate);
    const diffMs = now.getTime() - issued.getTime();
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysRemaining = validityDays - daysElapsed;

    if (daysElapsed > validityDays) {
      return {
        valid: false,
        daysRemaining: 0,
        daysElapsed,
        message: `Prescription expired ${daysElapsed - validityDays} days ago`
      };
    }

    return {
      valid: true,
      daysRemaining,
      daysElapsed,
      message: `Prescription valid for ${daysRemaining} more days`
    };
  }

  /**
   * Validar quota de substância controlada por paciente
   */
  async validateSubstanceQuota(
    tenantId: string,
    substanceId: string,
    patientId: string,
    requestedQuantity: number,
    period: 'daily' | 'monthly' | 'yearly'
  ): Promise<{
    valid: boolean;
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
    message: string;
  }> {
    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const prisma = getTenantPrisma(tenant);

    // Get substance restrictions
    const substance = await (prisma as any).controlledSubstance.findUnique({
      where: { id: substanceId }
    });

    if (!substance) {
      throw new AppError('Controlled substance not found', 404);
    }

    const restrictions = substance.restrictions as any || {};
    const quotaLimit = restrictions[period] || 0;

    if (quotaLimit === 0) {
      return {
        valid: true,
        quotaLimit: 0,
        quotaUsed: 0,
        quotaRemaining: 0,
        message: 'No quota restrictions for this period'
      };
    }

    // Calculate period dates
    const now = new Date();
    let startDate: Date;
    
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }

    // Get movements in period
    const movements = await (prisma as any).controlledSubstanceMovement.findMany({
      where: {
        substanceId,
        patientId,
        operationType: 'ISSUE',
        registeredAt: {
          gte: startDate
        }
      }
    });

    const quotaUsed = movements.reduce((sum: number, m: any) => sum + m.quantity, 0);
    const quotaRemaining = quotaLimit - quotaUsed;

    const valid = (quotaUsed + requestedQuantity) <= quotaLimit;

    return {
      valid,
      quotaLimit,
      quotaUsed,
      quotaRemaining,
      message: valid
        ? `Quota OK. ${quotaRemaining - requestedQuantity} will remain after this operation`
        : `Quota exceeded. Limit: ${quotaLimit}, Used: ${quotaUsed}, Requested: ${requestedQuantity}`
    };
  }

  /**
   * Registrar movimento de substância controlada
   */
  async recordSubstanceMovement(
    tenantId: string,
    data: SubstanceMovementDTO
  ): Promise<any> {
    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const prisma = getTenantPrisma(tenant);

    // Validate prescription if provided
    if (data.prescriptionDate) {
      const validation = await this.validatePrescriptionDate(data.prescriptionDate);
      if (!validation.valid) {
        throw new AppError(validation.message, 400);
      }
    }

    // Create movement record
    const movement = await (prisma as any).controlledSubstanceMovement.create({
      data: {
        substanceId: data.substanceId,
        patientId: data.patientId,
        patientName: data.patientName,
        quantity: data.quantity,
        prescriptionId: data.prescriptionId,
        operationType: data.operationType,
        registeredBy: data.registeredBy,
        notes: data.notes,
        registeredAt: new Date()
      },
      include: {
        substance: true
      }
    });

    logger.info('Guia 33 movement recorded', {
      tenantId,
      movementId: movement.id,
      substanceId: data.substanceId,
      operationType: data.operationType,
      quantity: data.quantity
    });

    return movement;
  }

  /**
   * Gerar relatório Guia 33 para uma substância
   */
  async generateGuia33Report(
    tenantId: string,
    substanceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Guia33Report> {
    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const prisma = getTenantPrisma(tenant);

    const substance = await (prisma as any).controlledSubstance.findUnique({
      where: { id: substanceId }
    });

    if (!substance) {
      throw new AppError('Controlled substance not found', 404);
    }

    const movements = await (prisma as any).controlledSubstanceMovement.findMany({
      where: {
        substanceId,
        registeredAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        registeredAt: 'asc'
      }
    });

    const totalIssued = movements
      .filter((m: any) => m.operationType === 'ISSUE')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const totalReceived = movements
      .filter((m: any) => m.operationType === 'RECEIVE')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const totalReturned = movements
      .filter((m: any) => m.operationType === 'RETURN')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const totalLoss = movements
      .filter((m: any) => ['LOSS', 'WASTE'].includes(m.operationType))
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const balance = totalReceived - totalIssued - totalReturned - totalLoss;

    return {
      substance,
      period: { start: startDate, end: endDate },
      movements,
      totalIssued,
      totalReceived,
      totalReturned,
      totalLoss,
      balance
    };
  }

  /**
   * Listar movimentos de uma substância
   */
  async getSubstanceMovements(
    tenantId: string,
    substanceId: string,
    limit: number = 100
  ): Promise<any[]> {
    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const prisma = getTenantPrisma(tenant);

    return await (prisma as any).controlledSubstanceMovement.findMany({
      where: { substanceId },
      orderBy: { registeredAt: 'desc' },
      take: limit,
      include: {
        substance: true
      }
    });
  }

  /**
   * Obter estatísticas de uma substância
   */
  async getSubstanceStats(
    tenantId: string,
    substanceId: string
  ): Promise<any> {
    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const prisma = getTenantPrisma(tenant);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const movements = await (prisma as any).controlledSubstanceMovement.findMany({
      where: {
        substanceId,
        registeredAt: { gte: monthStart }
      }
    });

    const issued = movements.filter((m: any) => m.operationType === 'ISSUE')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const received = movements.filter((m: any) => m.operationType === 'RECEIVE')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    return {
      substanceId,
      period: 'current_month',
      totalMovements: movements.length,
      totalIssued: issued,
      totalReceived: received,
      balance: received - issued
    };
  }
}

export const guia33Service = new Guia33Service();
