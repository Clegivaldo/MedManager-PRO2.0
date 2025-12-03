import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaymentService } from '../services/payment/payment.service.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();
const paymentService = new PaymentService(prisma);

export class PaymentController {
  static async createCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant não identificado', 400);

      const { amount, description, paymentMethod, billingCycle } = req.body;

      if (!amount || !paymentMethod) {
        throw new AppError('Campos obrigatórios: amount, paymentMethod', 400);
      }

      const { charge, payment } = await paymentService.createCharge({
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
          pixQrCode: charge.pixQrCode,
          pixQrCodeBase64: charge.pixQrCodeBase64,
          boletoUrl: charge.boletoUrl,
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

      const status = await paymentService.syncChargeStatus(chargeId);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}
