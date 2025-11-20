import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { validateSubscription } from '../middleware/subscription.middleware.js';
import { PaymentController } from '../controllers/payment.controller.js';

const router: Router = Router();

// Criar cobrança para renovação de assinatura
router.post('/create-charge', authenticateToken, tenantMiddleware, PaymentController.createCharge);

// Status da cobrança
router.get('/status/:chargeId', authenticateToken, tenantMiddleware, PaymentController.getChargeStatus);

export default router;
