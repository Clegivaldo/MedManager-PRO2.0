import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AsaasService } from '../services/payment/asaas.service.js';
import { AppError } from '../utils/errors.js';
import { GlobalPaymentConfigService } from '../services/payment/globalPaymentConfig.service.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();
const asaasService = new AsaasService(prisma);
const globalPaymentConfig = new GlobalPaymentConfigService(prisma);

export class WebhookController {
  static async asaas(req: Request, res: Response, next: NextFunction) {
    console.log('[Webhook] ===== WEBHOOK ASAAS RECEIVED =====');
    console.log('[Webhook] Body:', JSON.stringify(req.body).substring(0, 200));
    console.log('[Webhook] Headers:', req.headers);
    
    try {
      const event = req.body?.event;
      const paymentId = req.body?.payment?.id;
      
      console.log(`[Webhook] Parsed event=${event}, paymentId=${paymentId}`);
      
      const tokenHeader = req.headers['x-webhook-token'];
      const cfg = await globalPaymentConfig.getAsaasConfig();
      const expectedToken = cfg.webhookToken;

      console.log(`[Webhook] Token check - Expected: '${expectedToken}', Received: '${tokenHeader}'`);

      if (!expectedToken) {
        console.log('[Webhook] No token configured, skipping validation');
      } else if (tokenHeader !== expectedToken) {
        console.log('[Webhook] Token mismatch!');
        throw new AppError('Token de webhook inválido', 401);
      }

      const result = await asaasService.processWebhook(req.body);
      
      console.log(`[Webhook] Webhook processed:`, result);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Webhook] Error caught:', error);
      next(error);
    }
  }
}

