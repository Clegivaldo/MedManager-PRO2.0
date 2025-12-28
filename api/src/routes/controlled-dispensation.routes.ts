import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { validateControlledSubstance } from '../middleware/controlled-substance.middleware.js';
import { productGuia33Integration } from '../services/product-guia33-integration.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /dispense - Dispensar produto (com validação automática de substâncias controladas)
 */
router.post(
  '/dispense',
  authenticateToken,
  requirePermissions([PERMISSIONS.INVOICE_CREATE]),
  async (req, res, next) => {
    try {
      const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
      const userId = (req as any).user?.userId;
      const {
        productId,
        customerId,
        quantity,
        prescription, // { id, date, validityDays }
        batchId,
        saleId
      } = req.body;

      if (!tenantId) throw new AppError('Tenant ID not found', 400);
      if (!productId || !customerId || !quantity) {
        throw new AppError('productId, customerId, and quantity are required', 400);
      }

      // Validar e registrar dispensação
      const result = await productGuia33Integration.validateAndRecordDispensation(
        tenantId,
        productId,
        customerId,
        quantity,
        prescription
          ? {
              id: prescription.id,
              date: new Date(prescription.date),
              validityDays: prescription.validityDays || 30
            }
          : undefined,
        userId
      );

      res.json({
        success: true,
        dispensation: {
          productId,
          productName: result.product.name,
          customerId,
          customerName: result.customer?.name,
          quantity,
          isControlled: result.requiresValidation,
          compliance: result.compliance,
          movementId: result.movement?.id,
          prescriptionValid: result.prescriptionValidation?.valid,
          quotaStatus: result.quotaValidation
            ? {
                valid: result.quotaValidation.valid,
                quotaUsed: result.quotaValidation.quotaUsed,
                quotaLimit: result.quotaValidation.quotaLimit,
                quotaRemaining: result.quotaValidation.quotaRemaining
              }
            : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /receive - Registrar recebimento de produto (entrada de estoque)
 */
router.post(
  '/receive',
  authenticateToken,
  requirePermissions([PERMISSIONS.INVENTORY_ADJUST]),
  async (req, res, next) => {
    try {
      const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
      const userId = (req as any).user?.userId;
      const { productId, quantity, supplierId, invoiceNumber } = req.body;

      if (!tenantId) throw new AppError('Tenant ID not found', 400);
      if (!productId || !quantity) {
        throw new AppError('productId and quantity are required', 400);
      }

      const result = await productGuia33Integration.recordReceival(
        tenantId,
        productId,
        quantity,
        supplierId,
        invoiceNumber,
        userId
      );

      res.json({
        success: true,
        receival: {
          productId,
          productName: result.product?.name,
          quantity,
          invoiceNumber,
          isControlled: result.requiresValidation,
          movementId: result.movement?.id,
          compliance: result.compliance
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /return - Registrar devolução de produto
 */
router.post(
  '/return',
  authenticateToken,
  requirePermissions([PERMISSIONS.INVOICE_CREATE]),
  async (req, res, next) => {
    try {
      const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
      const userId = (req as any).user?.userId;
      const { productId, customerId, quantity, reason } = req.body;

      if (!tenantId) throw new AppError('Tenant ID not found', 400);
      if (!productId || !customerId || !quantity || !reason) {
        throw new AppError('productId, customerId, quantity, and reason are required', 400);
      }

      const result = await productGuia33Integration.recordReturn(
        tenantId,
        productId,
        customerId,
        quantity,
        reason,
        userId
      );

      res.json({
        success: true,
        return: {
          productId,
          productName: result.product?.name,
          customerId,
          quantity,
          reason,
          isControlled: result.requiresValidation,
          movementId: result.movement?.id,
          compliance: result.compliance
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /loss-waste - Registrar perda ou descarte
 */
router.post(
  '/loss-waste',
  authenticateToken,
  requirePermissions([PERMISSIONS.INVENTORY_ADJUST]),
  async (req, res, next) => {
    try {
      const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
      const userId = (req as any).user?.userId;
      const { productId, quantity, type, reason } = req.body;

      if (!tenantId) throw new AppError('Tenant ID not found', 400);
      if (!productId || !quantity || !type || !reason) {
        throw new AppError('productId, quantity, type (LOSS/WASTE), and reason are required', 400);
      }

      if (!['LOSS', 'WASTE'].includes(type)) {
        throw new AppError('type must be either LOSS or WASTE', 400);
      }

      const result = await productGuia33Integration.recordLossOrWaste(
        tenantId,
        productId,
        quantity,
        type,
        reason,
        userId
      );

      res.json({
        success: true,
        record: {
          productId,
          productName: result.product?.name,
          quantity,
          type,
          reason,
          isControlled: result.requiresValidation,
          movementId: result.movement?.id,
          compliance: result.compliance
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /compliance/:productId - Verificar status de compliance de um produto
 */
router.get(
  '/compliance/:productId',
  authenticateToken,
  requirePermissions([PERMISSIONS.REGULATORY_VIEW]),
  async (req, res, next) => {
    try {
      const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
      const { productId } = req.params;

      if (!tenantId) throw new AppError('Tenant ID not found', 400);

      const complianceStatus = await productGuia33Integration.checkComplianceStatus(
        tenantId,
        productId
      );

      res.json({
        success: true,
        compliance: complianceStatus
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
