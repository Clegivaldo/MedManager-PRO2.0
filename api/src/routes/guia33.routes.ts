import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { guia33Service } from '../services/guia33.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validate prescription date
router.post('/validate-prescription', authenticateToken, requirePermissions([PERMISSIONS.REGULATORY_VIEW]), async (req, res, next) => {
  try {
    const { prescriptionDate, validityDays } = req.body;
    
    if (!prescriptionDate) {
      throw new AppError('prescriptionDate is required', 400);
    }

    const result = await guia33Service.validatePrescriptionDate(
      new Date(prescriptionDate),
      validityDays || 30
    );

    res.json({ success: true, validation: result });
  } catch (error) {
    next(error);
  }
});

// Validate substance quota
router.post('/validate-quota', authenticateToken, requirePermissions([PERMISSIONS.REGULATORY_VIEW]), async (req, res, next) => {
  try {
    const { substanceId, patientId, quantity, period } = req.body;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;

    if (!tenantId) throw new AppError('Tenant ID not found', 400);
    if (!substanceId || !patientId || !quantity || !period) {
      throw new AppError('substanceId, patientId, quantity, and period are required', 400);
    }

    const result = await guia33Service.validateSubstanceQuota(
      tenantId,
      substanceId,
      patientId,
      quantity,
      period
    );

    res.json({ success: true, validation: result });
  } catch (error) {
    next(error);
  }
});

// Record substance movement
router.post('/record-movement', authenticateToken, requirePermissions([PERMISSIONS.CONTROLLED_CREATE]), async (req, res, next) => {
  try {
    const { substanceId, patientId, patientName, quantity, prescriptionId, prescriptionDate, operationType, notes } = req.body;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId) throw new AppError('Tenant ID not found', 400);
    if (!substanceId || !patientId || !quantity || !operationType) {
      throw new AppError('substanceId, patientId, quantity, and operationType are required', 400);
    }

    const movement = await guia33Service.recordSubstanceMovement(tenantId, {
      substanceId,
      patientId,
      patientName: patientName || 'Unknown',
      quantity: Number(quantity),
      prescriptionId,
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : undefined,
      operationType,
      registeredBy: userId,
      notes
    });

    res.json({ success: true, movement });
  } catch (error) {
    next(error);
  }
});

// Get movements for a substance
router.get('/movements/:substanceId', authenticateToken, requirePermissions([PERMISSIONS.CONTROLLED_VIEW_MOVEMENTS]), async (req, res, next) => {
  try {
    const { substanceId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const limit = Number(req.query.limit) || 100;

    if (!tenantId) throw new AppError('Tenant ID not found', 400);

    const movements = await guia33Service.getSubstanceMovements(tenantId, substanceId, limit);

    res.json({ success: true, movements });
  } catch (error) {
    next(error);
  }
});

// Generate Guia 33 report
router.post('/generate-report', authenticateToken, requirePermissions([PERMISSIONS.CONTROLLED_GENERATE_G33]), async (req, res, next) => {
  try {
    const { substanceId, startDate, endDate } = req.body;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;

    if (!tenantId) throw new AppError('Tenant ID not found', 400);
    if (!substanceId || !startDate || !endDate) {
      throw new AppError('substanceId, startDate, and endDate are required', 400);
    }

    const report = await guia33Service.generateGuia33Report(
      tenantId,
      substanceId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

// Get substance stats
router.get('/stats/:substanceId', authenticateToken, requirePermissions([PERMISSIONS.CONTROLLED_VIEW_MOVEMENTS]), async (req, res, next) => {
  try {
    const { substanceId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;

    if (!tenantId) throw new AppError('Tenant ID not found', 400);

    const stats = await guia33Service.getSubstanceStats(tenantId, substanceId);

    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

export default router;
