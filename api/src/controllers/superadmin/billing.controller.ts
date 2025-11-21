import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';

export class SuperadminBillingController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, from, to, tenantId } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (tenantId) where.tenantId = tenantId;
      if (from || to) {
        where.dueDate = {};
        if (from) where.dueDate.gte = new Date(String(from));
        if (to) where.dueDate.lte = new Date(String(to));
      }

      const billing = await prismaMaster.billingAccount.findMany({
        where,
        include: { tenant: true, payments: true },
        orderBy: { dueDate: 'asc' }
      });

      const totalAReceber = billing.filter(b => b.status === 'pending').reduce((acc, b) => acc + Number(b.amount), 0);
      const recebidoNoMes = billing.filter(b => b.status === 'paid').reduce((acc, b) => acc + Number(b.paidAmount || b.amount), 0);
      const inadimplencia = billing.filter(b => b.status === 'overdue').reduce((acc, b) => acc + Number(b.amount), 0);

      res.json({ success: true, data: { items: billing, kpis: { totalAReceber, recebidoNoMes, inadimplencia } } });
    } catch (err) {
      next(err);
    }
  }

  static async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const billing = await prismaMaster.billingAccount.findUnique({ where: { id } });
      if (!billing) throw new AppError('Billing não encontrado', 404);

      const updated = await prismaMaster.billingAccount.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date(), paidAmount: billing.amount }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async resendCharge(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, message: 'Reenvio de cobrança agendado (stub)' });
    } catch (err) {
      next(err);
    }
  }
}
