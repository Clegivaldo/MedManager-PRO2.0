import { Router } from 'express';
import { SuperadminSubscriptionController } from '../../controllers/superadmin/subscription.controller.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminSubscriptionController.list(req, res, next));
router.get('/stats', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminSubscriptionController.getStats(req, res, next)); // ✅ NOVO
router.patch('/:tenantId/renew', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminSubscriptionController.renew(req, res, next));
router.patch('/:tenantId/suspend', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminSubscriptionController.suspend(req, res, next));
router.patch('/:tenantId/change-plan', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminSubscriptionController.changePlan(req, res, next));

export default router;
