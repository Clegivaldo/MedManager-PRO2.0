import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar logs
router.get('/logs', auditController.listLogs);

// Detalhes de um log
router.get('/logs/:id', auditController.getLog);

export default router;
