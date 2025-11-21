import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { GlobalPaymentConfigService } from '../services/payment/globalPaymentConfig.service.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();
const service = new GlobalPaymentConfigService(prisma);

function ensureSuperadmin(req: Request) {
  const role = (req as any).user?.role;
  if (role !== 'SUPERADMIN') {
    throw new AppError('Acesso restrito ao Superadmin', 403, 'FORBIDDEN');
  }
}

export class GlobalPaymentConfigController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      ensureSuperadmin(req);
      const data = await service.getMasked();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      ensureSuperadmin(req);
      const data = await service.update(req.body || {});
      res.json({ success: true, message: 'Configuração atualizada', data });
    } catch (err) {
      next(err);
    }
  }
}
