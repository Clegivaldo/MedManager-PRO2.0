import { Router } from 'express';
import { SuperadminModuleController } from '../../controllers/superadmin/module.controller.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/:tenantId', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminModuleController.listModules(req, res, next));
router.patch('/:tenantId/toggle', requirePermission('SUPERADMIN_ACCESS'), (req, res, next) => SuperadminModuleController.toggleModule(req, res, next));

export default router;
