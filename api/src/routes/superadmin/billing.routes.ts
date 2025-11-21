import { Router } from 'express';
import { SuperadminBillingController } from '../../controllers/superadmin/billing.controller.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminBillingController.list(req, res, next));
router.patch('/:id/mark-paid', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminBillingController.markPaid(req, res, next));
router.post('/:id/resend-charge', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminBillingController.resendCharge(req, res, next));

export default router;
