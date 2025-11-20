import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router: Router = Router();

// Webhook público do Asaas (não requer autenticação JWT, valida por token custom header)
router.post('/asaas', WebhookController.asaas);

export default router;
