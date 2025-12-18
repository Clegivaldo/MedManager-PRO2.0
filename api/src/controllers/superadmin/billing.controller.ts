import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../../lib/prisma.js';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export class SuperadminBillingController {
  // ✅ Estatísticas financeiras baseadas em Subscriptions
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);

      // Buscar todas as assinaturas
      const allSubscriptions = await prismaMaster.subscription.findMany({
        include: {
          plan: true,
          tenant: { select: { name: true } }
        }
      });

      // Assinaturas ativas
      const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');

      // MRR (Monthly Recurring Revenue)
      const mrr = activeSubscriptions.reduce((sum, sub) => {
        const price = Number(sub.plan?.priceMonthly || 0);
        return sum + price;
      }, 0);

      // ARR (Annual Recurring Revenue)
      const arr = mrr * 12;

      // Total a receber (assinaturas ativas do mês)
      const totalToReceive = activeSubscriptions
        .filter(s => new Date(s.endDate) >= monthStart)
        .reduce((sum, sub) => sum + Number(sub.plan?.priceMonthly || 0), 0);

      // Receita mensal dos últimos 12 meses (estimada)
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const targetMonth = subMonths(now, i);
        const start = startOfMonth(targetMonth);
        const end = endOfMonth(targetMonth);

        // Contar assinaturas ativas naquele mês
        const activeInMonth = allSubscriptions.filter(s => {
          const subStart = new Date(s.startDate);
          const subEnd = new Date(s.endDate);
          return subStart <= end && subEnd >= start && s.status === 'active';
        });

        const revenue = activeInMonth.reduce((sum, sub) => {
          return sum + Number(sub.plan?.priceMonthly || 0);
        }, 0);

        monthlyRevenue.push({
          month: format(targetMonth, 'yyyy-MM'),
          label: format(targetMonth, 'MMM/yy'),
          revenue: revenue
        });
      }

      // Taxa de churn (assinaturas canceladas/expiradas)
      const expiredCount = allSubscriptions.filter(s => s.status === 'expired' || s.status === 'cancelled').length;
      const totalCount = allSubscriptions.length || 1;
      const churnRate = ((expiredCount / totalCount) * 100).toFixed(1);

      res.json({
        success: true,
        data: {
          totalToReceive: totalToReceive.toFixed(2),
          receivedThisMonth: mrr.toFixed(2), // Estimativa
          churnRate: parseFloat(churnRate),
          arr: arr.toFixed(2),
          mrr: mrr.toFixed(2),
          monthlyRevenue,
          activeSubscriptionsCount: activeSubscriptions.length,
          totalSubscriptionsCount: allSubscriptions.length
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ Listar assinaturas para tabela de "cobranças"
  static async listBilling(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = '1', limit = '20' } = req.query;

      const where: any = {};
      if (status && status !== 'all') {
        where.status = status;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const [subscriptions, total] = await Promise.all([
        prismaMaster.subscription.findMany({
          where,
          include: {
            tenant: { select: { id: true, name: true, cnpj: true } },
            plan: true
          },
          orderBy: { endDate: 'desc' },
          skip,
          take
        }),
        prismaMaster.subscription.count({ where })
      ]);

      // Transformar em formato de "billing"
      const billingItems = subscriptions.map(sub => ({
        id: sub.id,
        tenantId: sub.tenantId,
        tenantName: sub.tenant?.name,
        planName: sub.plan?.name,
        amount: Number(sub.plan?.priceMonthly || 0),
        dueDate: sub.endDate,
        status: sub.status,
        period: `${format(new Date(sub.startDate), 'dd/MM/yyyy')} - ${format(new Date(sub.endDate), 'dd/MM/yyyy')}`
      }));

      res.json({
        success: true,
        data: {
          items: billingItems,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / take)
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
