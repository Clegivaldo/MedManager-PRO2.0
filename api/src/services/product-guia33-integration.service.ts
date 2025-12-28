import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { guia33Service } from './guia33.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Integração entre módulo de produtos e Guia 33
 * Garante compliance automático na dispensação de substâncias controladas
 */
export class ProductGuia33IntegrationService {
  /**
   * Valida e registra dispensação de produto controlado
   * @throws AppError se prescrição inválida ou quota excedida
   */
  async validateAndRecordDispensation(
    tenantId: string,
    productId: string,
    customerId: string,
    quantity: number,
    prescriptionData?: {
      id: string;
      date: Date;
      validityDays?: number;
    },
    userId?: string
  ) {
    const prisma = getTenantPrisma(tenantId);

    // 1. Verificar se produto é controlado
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        isControlled: true,
        controlledSubstance: true
      }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Se não for controlado, não precisa validação
    if (!product.isControlled) {
      return { requiresValidation: false, product };
    }

    // 2. Produtos controlados EXIGEM prescrição
    if (!prescriptionData) {
      throw new AppError(
        `Product "${product.name}" is a controlled substance and requires a valid prescription`,
        400,
        'PRESCRIPTION_REQUIRED'
      );
    }

    // 3. Validar prescrição
    const prescriptionValidation = await guia33Service.validatePrescriptionDate(
      prescriptionData.date,
      prescriptionData.validityDays || 30
    );

    if (!prescriptionValidation.valid) {
      throw new AppError(
        `Prescription invalid: ${prescriptionValidation.message}`,
        400,
        'INVALID_PRESCRIPTION'
      );
    }

    // 4. Obter dados do cliente
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        cpf: true
      }
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // 5. Validar quota do paciente (diária, mensal, anual)
    const quotaValidation = await guia33Service.validateSubstanceQuota(
      tenantId,
      productId,
      customerId,
      quantity,
      'monthly' // Quota mensal por padrão
    );

    if (!quotaValidation.valid) {
      throw new AppError(
        `Patient quota exceeded: ${quotaValidation.quotaUsed}/${quotaValidation.quotaLimit} (trying to add ${quantity})`,
        400,
        'QUOTA_EXCEEDED'
      );
    }

    // 6. Registrar movimentação no Guia 33
    const movement = await guia33Service.recordSubstanceMovement(tenantId, {
      substanceId: productId,
      patientId: customerId,
      patientName: customer.name,
      quantity,
      prescriptionId: prescriptionData.id,
      prescriptionDate: prescriptionData.date,
      operationType: 'ISSUE',
      registeredBy: userId || 'system',
      notes: `Dispensação automática - Prescrição ${prescriptionData.id}`
    });

    logger.info('[Guia33Integration] Controlled substance dispensed', {
      tenantId,
      productId,
      productName: product.name,
      customerId,
      customerName: customer.name,
      quantity,
      prescriptionId: prescriptionData.id,
      movementId: movement.id
    });

    return {
      requiresValidation: true,
      product,
      customer,
      prescriptionValidation,
      quotaValidation,
      movement,
      compliance: {
        guia33Registered: true,
        prescriptionValid: true,
        quotaOk: true
      }
    };
  }

  /**
   * Registra recebimento de substância controlada (entrada de estoque)
   */
  async recordReceival(
    tenantId: string,
    productId: string,
    quantity: number,
    supplierId?: string,
    invoiceNumber?: string,
    userId?: string
  ) {
    const prisma = getTenantPrisma(tenantId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, isControlled: true }
    });

    if (!product || !product.isControlled) {
      return { requiresValidation: false };
    }

    const movement = await guia33Service.recordSubstanceMovement(tenantId, {
      substanceId: productId,
      patientId: supplierId || 'SUPPLIER',
      patientName: 'Supplier',
      quantity,
      operationType: 'RECEIVE',
      registeredBy: userId || 'system',
      notes: invoiceNumber ? `Entrada NF: ${invoiceNumber}` : 'Entrada de estoque'
    });

    logger.info('[Guia33Integration] Controlled substance received', {
      tenantId,
      productId,
      productName: product.name,
      quantity,
      invoiceNumber,
      movementId: movement.id
    });

    return {
      requiresValidation: true,
      product,
      movement,
      compliance: { guia33Registered: true }
    };
  }

  /**
   * Registra devolução de substância controlada
   */
  async recordReturn(
    tenantId: string,
    productId: string,
    customerId: string,
    quantity: number,
    reason: string,
    userId?: string
  ) {
    const prisma = getTenantPrisma(tenantId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, isControlled: true }
    });

    if (!product || !product.isControlled) {
      return { requiresValidation: false };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true }
    });

    const movement = await guia33Service.recordSubstanceMovement(tenantId, {
      substanceId: productId,
      patientId: customerId,
      patientName: customer?.name || 'Unknown',
      quantity,
      operationType: 'RETURN',
      registeredBy: userId || 'system',
      notes: `Devolução: ${reason}`
    });

    logger.info('[Guia33Integration] Controlled substance returned', {
      tenantId,
      productId,
      productName: product.name,
      customerId,
      quantity,
      reason,
      movementId: movement.id
    });

    return {
      requiresValidation: true,
      product,
      movement,
      compliance: { guia33Registered: true }
    };
  }

  /**
   * Registra perda/descarte de substância controlada
   */
  async recordLossOrWaste(
    tenantId: string,
    productId: string,
    quantity: number,
    type: 'LOSS' | 'WASTE',
    reason: string,
    userId?: string
  ) {
    const prisma = getTenantPrisma(tenantId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, isControlled: true }
    });

    if (!product || !product.isControlled) {
      return { requiresValidation: false };
    }

    const movement = await guia33Service.recordSubstanceMovement(tenantId, {
      substanceId: productId,
      patientId: 'INTERNAL',
      patientName: type === 'LOSS' ? 'Perda' : 'Descarte',
      quantity,
      operationType: type,
      registeredBy: userId || 'system',
      notes: reason
    });

    logger.info('[Guia33Integration] Controlled substance loss/waste', {
      tenantId,
      productId,
      productName: product.name,
      quantity,
      type,
      reason,
      movementId: movement.id
    });

    return {
      requiresValidation: true,
      product,
      movement,
      compliance: { guia33Registered: true }
    };
  }

  /**
   * Verifica compliance antes de permitir operação
   */
  async checkComplianceStatus(tenantId: string, productId: string) {
    const prisma = getTenantPrisma(tenantId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        isControlled: true,
        controlledSubstance: true
      }
    });

    if (!product || !product.isControlled) {
      return {
        isControlled: false,
        requiresPrescription: false,
        requiresQuotaCheck: false
      };
    }

    // Obter estatísticas recentes
    const stats = await guia33Service.getSubstanceStats(tenantId, productId);

    return {
      isControlled: true,
      requiresPrescription: true,
      requiresQuotaCheck: true,
      product,
      stats
    };
  }
}

export const productGuia33Integration = new ProductGuia33IntegrationService();
