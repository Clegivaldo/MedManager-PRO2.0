import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AsaasService } from '../services/payment/asaas.service.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();
const asaasService = new AsaasService(prisma);

export class WebhookController {
  static async asaas(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenHeader = req.headers['x-webhook-token'];
      const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

      if (!expectedToken) {
        console.warn('[Webhook] ASAAS_WEBHOOK_TOKEN não configurado. Pulando validação.');
      } else if (tokenHeader !== expectedToken) {
        throw new AppError('Token de webhook inválido', 401);
      }

      const result = await asaasService.processWebhook(req.body);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
