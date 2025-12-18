import { Router } from 'express';
import { SuperadminBillingController } from '../../controllers/superadmin/billing.controller.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/stats', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminBillingController.getStats(req, res, next));
router.get('/items', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminBillingController.listBilling(req, res, next));

export default router;
