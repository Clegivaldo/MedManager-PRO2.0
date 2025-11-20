import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { PaymentGatewayCredentialsController } from '../controllers/paymentGatewayCredentials.controller.js';

const router: Router = Router();

router.get('/', authenticateToken, tenantMiddleware, PaymentGatewayCredentialsController.get);
router.put('/', authenticateToken, tenantMiddleware, PaymentGatewayCredentialsController.update);

export default router;
