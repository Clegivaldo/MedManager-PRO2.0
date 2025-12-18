import { Request, Response, NextFunction } from 'express';
import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { PaymentGatewayCredentialsService } from '../services/payment/paymentGatewayCredentials.service.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClientRuntime();
const service = new PaymentGatewayCredentialsService(prisma);

function ensureAdminRole(req: Request) {
  const role = (req as any).user?.role;
  if (role !== 'SUPERADMIN' && role !== 'MASTER') {
    throw new AppError('Acesso restrito', 403, 'FORBIDDEN');
  }
}

export class PaymentGatewayCredentialsController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      ensureAdminRole(req);
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant não identificado', 400);
      const data = await service.getMasked(tenantId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      ensureAdminRole(req);
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant não identificado', 400);
      const data = await service.update(tenantId, req.body || {});
      res.json({ success: true, message: 'Credenciais atualizadas', data });
    } catch (err) {
      next(err);
    }
  }
}
