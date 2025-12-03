import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { TenantBillingController } from '../controllers/tenantBilling.controller.js';

const router: Router = Router();
const controller = new TenantBillingController();

// Listar faturas do tenant
router.get('/invoices', authenticateToken, tenantMiddleware, (req, res) => controller.listInvoices(req, res));

// Obter informações de pagamento (Pix/Boleto) para uma fatura
router.get('/invoices/:id/payment-info', authenticateToken, tenantMiddleware, (req, res) => controller.getPaymentInfo(req, res));

export default router;
