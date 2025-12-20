import { Router, type Router as RouterType } from 'express';
import { NFCeController } from '../controllers/nfce.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { validateSubscription, validateModule } from '../middleware/subscription.middleware.js';

const router: RouterType = Router();

router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(validateSubscription);

// Protect NFC-e routes with Module "NFE" (or maybe a specific "POS" module later)
router.use(validateModule('NFE'));

router.post('/emit',
    requirePermissions([PERMISSIONS.NFE_ISSUE]),
    NFCeController.emit
);

export default router;
