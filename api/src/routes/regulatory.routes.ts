import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { RegulatoryController } from '../controllers/regulatory.controller.js';

const router: Router = Router();
const controller = new RegulatoryController();

// Rotas regulatórias (RDC 430, Guia 33)
router.get('/sngpc/status/:tenantId', authenticateToken, requirePermission('REGULATORY_VIEW'), (req, res) => controller.getSNGPCStatus(req, res));
router.post('/sngpc/submit/:tenantId', authenticateToken, requirePermission('REGULATORY_SUBMIT'), (req, res) => controller.submitSNGPC(req, res));
router.get('/sncm/status/:tenantId', authenticateToken, requirePermission('REGULATORY_VIEW'), (req, res) => controller.getSNCMStatus(req, res));
router.post('/sncm/track/:tenantId', authenticateToken, requirePermission('REGULATORY_SUBMIT'), (req, res) => controller.trackMedication(req, res));
router.get('/controlled/:tenantId', authenticateToken, requirePermission('REGULATORY_VIEW'), (req, res) => controller.getControlledSubstances(req, res));
router.post('/controlled/create/:tenantId', authenticateToken, requirePermission('REGULATORY_SUBMIT'), (req, res) => controller.createControlledSubstance(req, res));
router.post('/guia33/:tenantId', authenticateToken, requirePermission('REGULATORY_SUBMIT'), (req, res) => controller.generateGuia33(req, res));

// Deprecated placeholders removed; endpoints above implement full flows

export default router;