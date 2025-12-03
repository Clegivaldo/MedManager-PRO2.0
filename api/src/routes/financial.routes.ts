import { Router } from 'express';
import { financialController } from '../controllers/financial.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Resumo financeiro
router.get('/summary', financialController.getSummary);

// Transações
router.get('/transactions', financialController.listTransactions);
router.post('/transactions', financialController.createTransaction);
router.put('/transactions/:id', financialController.updateTransaction);
router.put('/transactions/:id/pay', financialController.markAsPaid);
router.delete('/transactions/:id', financialController.cancelTransaction);

// Fluxo de caixa
router.get('/cashflow', financialController.getCashFlow);

export default router;
