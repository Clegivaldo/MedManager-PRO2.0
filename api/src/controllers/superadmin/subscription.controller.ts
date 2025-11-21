import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';
import { addMonths, isAfter } from 'date-fns';

export class SuperadminSubscriptionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, planId } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (planId) where.planId = planId;

      const subscriptions = await prismaMaster.subscription.findMany({
        where,
        include: { plan: true, tenant: true },
        orderBy: { endDate: 'asc' }
      });

      res.json({ success: true, data: subscriptions });
    } catch (err) {
      next(err);
    }
  }

  static async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { months = 1 } = req.body;

      const subscription = await prismaMaster.subscription.findUnique({ where: { tenantId } });
      if (!subscription) throw new AppError('Assinatura não encontrada', 404);

      const baseDate = isAfter(new Date(), subscription.endDate) ? new Date() : subscription.endDate;
      const newEndDate = addMonths(baseDate, Number(months));

      const updated = await prismaMaster.subscription.update({
        where: { tenantId },
        data: { endDate: newEndDate, status: 'active' }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body;
      const subscription = await prismaMaster.subscription.findUnique({ where: { tenantId } });
      if (!subscription) throw new AppError('Assinatura não encontrada', 404);

      const updated = await prismaMaster.subscription.update({
        where: { tenantId },
        data: { status: 'suspended', cancelReason: reason || 'suspended_by_superadmin', cancelledAt: new Date() }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async changePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { newPlanId } = req.body;
      if (!newPlanId) throw new AppError('newPlanId é obrigatório', 400);

      const subscription = await prismaMaster.subscription.findUnique({ where: { tenantId } });
      if (!subscription) throw new AppError('Assinatura não encontrada', 404);

      const plan = await prismaMaster.plan.findUnique({ where: { id: newPlanId } });
      if (!plan) throw new AppError('Plano inválido', 400);

      const updated = await prismaMaster.subscription.update({
        where: { tenantId },
        data: { planId: newPlanId }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
