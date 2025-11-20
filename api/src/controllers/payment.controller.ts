import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AsaasService } from '../services/payment/asaas.service.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();
const asaasService = new AsaasService(prisma);

export class PaymentController {
  static async createCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant não identificado', 400);

      const { amount, description, paymentMethod, billingCycle } = req.body;

      if (!amount || !paymentMethod) {
        throw new AppError('Campos obrigatórios: amount, paymentMethod', 400);
      }

      const { charge, payment } = await asaasService.createCharge({
        tenantId,
        amount,
        description: description || 'Assinatura MedManager',
        paymentMethod,
        billingCycle: billingCycle || 'monthly',
      });

      res.json({
        success: true,
        message: 'Cobrança criada com sucesso',
        data: {
          chargeId: charge.id,
          status: payment.status,
          dueDate: charge.dueDate,
          pixQrCode: charge.pixQrCode?.payload,
          pixQrCodeBase64: charge.pixQrCode?.encodedImage,
          boletoUrl: charge.bankSlipUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getChargeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { chargeId } = req.params;
      if (!chargeId) throw new AppError('chargeId é obrigatório', 400);

      const status = await asaasService.getChargeStatus(chargeId);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}
