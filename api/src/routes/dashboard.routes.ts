import { Router } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/dashboard/metrics
 * Retorna métricas agregadas para o dashboard principal
 */
router.get('/metrics', requirePermissions([PERMISSIONS.DASHBOARD_VIEW]), async (req, res, next) => {
  try {
    const tenant = (req as any).tenant;
    if (!tenant) {
      throw new AppError('Tenant context required', 400);
    }

    const prisma = getTenantPrisma(tenant);
    const tenantId = tenant.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Buscar vendas do mês
    const salesThisMonth = await prisma.invoice.aggregate({
      where: {
        invoiceType: 'EXIT',
        status: { in: ['AUTHORIZED', 'ISSUED'] },
        issueDate: { gte: startOfMonth }
      },
      _sum: { totalValue: true },
      _count: true
    });

    // Buscar vendas de hoje
    const salesToday = await prisma.invoice.aggregate({
      where: {
        invoiceType: 'EXIT',
        status: { in: ['AUTHORIZED', 'ISSUED'] },
        issueDate: { gte: startOfToday }
      },
      _sum: { totalValue: true },
      _count: true
    });

    // Buscar estoque crítico (produtos com quantidade baixa)
    const lowStockProducts = await prisma.stock.findMany({
      where: {
        availableQuantity: { lt: 10 }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            isControlled: true
          }
        }
      },
      orderBy: { availableQuantity: 'asc' },
      take: 10
    });

    // Buscar produtos com validade próxima (30 dias)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringBatches = await prisma.batch.findMany({
      where: {
        expirationDate: {
          gte: now,
          lte: thirtyDaysFromNow
        },
        quantityCurrent: { gt: 0 }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            internalCode: true
          }
        }
      },
      orderBy: { expirationDate: 'asc' },
      take: 10
    });

    // Buscar lotes expirados
    const expiredBatches = await prisma.batch.count({
      where: {
        expirationDate: { lt: now },
        quantityCurrent: { gt: 0 }
      }
    });

    // Buscar NF-es emitidas no mês
    const nfeIssuedThisMonth = await prisma.invoice.count({
      where: {
        status: { in: ['AUTHORIZED', 'ISSUED'] },
        issueDate: { gte: startOfMonth }
      }
    });

    // Buscar NF-es canceladas no mês
    const nfeCancelledThisMonth = await prisma.invoice.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: startOfMonth }
      }
    });

    // Buscar produtos controlados sem movimentação recente
    const controlledProductsNoMovement = await prisma.product.count({
      where: {
        isControlled: true,
        isActive: true,
        stock: {
          some: {
            lastMovement: {
              lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 dias
            }
          }
        }
      }
    });

    // Total de clientes ativos
    const activeCustomers = await prisma.customer.count({
      where: { isActive: true }
    });

    // Total de produtos ativos
    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    });

    // Produtos controlados
    const controlledProducts = await prisma.product.count({
      where: { isControlled: true, isActive: true }
    });

    // Compliance alerts
    const complianceAlerts = [];

    if (expiredBatches > 0) {
      complianceAlerts.push({
        type: 'EXPIRED_BATCHES',
        severity: 'high',
        message: `${expiredBatches} lote(s) vencido(s) em estoque`,
        count: expiredBatches
      });
    }

    if (expiringBatches.length > 0) {
      complianceAlerts.push({
        type: 'EXPIRING_SOON',
        severity: 'medium',
        message: `${expiringBatches.length} lote(s) vencendo em 30 dias`,
        count: expiringBatches.length
      });
    }

    if (lowStockProducts.length > 0) {
      complianceAlerts.push({
        type: 'LOW_STOCK',
        severity: 'medium',
        message: `${lowStockProducts.length} produto(s) com estoque crítico`,
        count: lowStockProducts.length
      });
    }

    if (controlledProductsNoMovement > 0) {
      complianceAlerts.push({
        type: 'CONTROLLED_NO_MOVEMENT',
        severity: 'low',
        message: `${controlledProductsNoMovement} produto(s) controlado(s) sem movimentação há 90+ dias`,
        count: controlledProductsNoMovement
      });
    }

    // Montar resposta
    const metrics = {
      sales: {
        today: {
          total: Number(salesToday._sum.totalValue || 0),
          count: salesToday._count
        },
        month: {
          total: Number(salesThisMonth._sum.totalValue || 0),
          count: salesThisMonth._count
        }
      },
      invoices: {
        issued: nfeIssuedThisMonth,
        cancelled: nfeCancelledThisMonth
      },
      inventory: {
        lowStock: lowStockProducts.map(stock => ({
          productId: stock.product.id,
          productName: stock.product.name,
          internalCode: stock.product.internalCode,
          availableQuantity: stock.availableQuantity,
          isControlled: stock.product.isControlled
        })),
        expiringBatches: expiringBatches.map(batch => ({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          productName: batch.product.name,
          expirationDate: batch.expirationDate,
          quantity: batch.quantityCurrent,
          daysUntilExpiry: Math.ceil((batch.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        })),
        expiredCount: expiredBatches
      },
      overview: {
        activeCustomers,
        activeProducts,
        controlledProducts
      },
      compliance: {
        alerts: complianceAlerts,
        score: calculateComplianceScore({
          expiredBatches,
          lowStockCount: lowStockProducts.length,
          controlledNoMovement: controlledProductsNoMovement
        })
      }
    };

    logger.info('Dashboard metrics retrieved', {
      tenantId,
      salesTotal: metrics.sales.month.total,
      alertsCount: complianceAlerts.length
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to retrieve dashboard metrics', { error: (error as Error).message });
    next(error);
  } finally {
    // Desconectar Prisma tenant-specific
    const tenant = (req as any).tenant;
    const prisma = getTenantPrisma(tenant);
    if (tenant) {
      await prisma.$disconnect();
    }
  }
});

/**
 * Calcula score de compliance (0-100)
 */
function calculateComplianceScore(params: {
  expiredBatches: number;
  lowStockCount: number;
  controlledNoMovement: number;
}): number {
  let score = 100;

  // Penalidades
  score -= params.expiredBatches * 10; // -10 por lote vencido
  score -= params.lowStockCount * 2; // -2 por produto em estoque baixo
  score -= params.controlledNoMovement * 5; // -5 por controlado sem movimento

  return Math.max(0, Math.min(100, score));
}

/**
 * GET /api/v1/dashboard/predictive
 * Retorna métricas preditivas (previsão de estoque e vendas)
 */
router.get('/predictive', requirePermissions([PERMISSIONS.DASHBOARD_VIEW]), async (req, res, next) => {
  try {
    const tenant = (req as any).tenant;
    if (!tenant) {
      throw new AppError('Tenant context required', 400);
    }

    const prisma = getTenantPrisma(tenant);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Previsão de Esgotamento de Estoque (Stock Depletion)
    // Buscar produtos com vendas nos últimos 30 dias
    const soldProducts = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: {
          issueDate: { gte: thirtyDaysAgo },
          status: { in: ['AUTHORIZED', 'ISSUED'] },
          invoiceType: 'EXIT'
        }
      },
      _sum: {
        quantity: true
      }
    });

    const stockPredictions = [];

    for (const item of soldProducts) {
      const productId = item.productId;
      const totalSold = item._sum.quantity || 0;
      const avgDailyConsumption = totalSold / 30;

      if (avgDailyConsumption > 0) {
        // Buscar estoque atual
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: {
            stock: true
          }
        });

        if (product) {
          const currentStock = product.stock.reduce((acc, s) => acc + s.availableQuantity, 0);
          const daysRemaining = currentStock / avgDailyConsumption;

          if (daysRemaining < 30) { // Apenas mostrar se for acabar em menos de 30 dias
            stockPredictions.push({
              productId: product.id,
              productName: product.name,
              currentStock,
              avgDailyConsumption,
              daysRemaining: Math.floor(daysRemaining),
              predictedRunoutDate: new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
            });
          }
        }
      }
    }

    // 2. Previsão de Vendas (Sales Forecast) - Simples média móvel
    // Buscar vendas dos últimos 3 meses agrupadas por mês
    const startOf3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const monthlySales = await prisma.invoice.groupBy({
      by: ['issueDate'], // Prisma não suporta group by month nativamente facilmente sem raw query, vamos simplificar
      where: {
        issueDate: { gte: startOf3MonthsAgo },
        status: { in: ['AUTHORIZED', 'ISSUED'] },
        invoiceType: 'EXIT'
      },
      _sum: {
        totalValue: true
      }
    });

    // Agrupar manualmente por mês (YYYY-MM)
    const salesByMonth: Record<string, number> = {};
    monthlySales.forEach(sale => {
      const monthKey = sale.issueDate.toISOString().substring(0, 7); // YYYY-MM
      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + (Number(sale._sum.totalValue) || 0);
    });

    const months = Object.keys(salesByMonth).sort();
    let totalSales = 0;
    months.forEach(m => totalSales += salesByMonth[m]);
    const avgMonthlySales = months.length > 0 ? totalSales / months.length : 0;

    // Previsão para o próximo mês (média simples + 5% de crescimento otimista)
    const nextMonthForecast = avgMonthlySales * 1.05;

    res.json({
      success: true,
      data: {
        stockDepletion: stockPredictions.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5),
        salesForecast: {
          nextMonth: nextMonthForecast,
          trend: nextMonthForecast > avgMonthlySales ? 'up' : 'down',
          percentage: months.length > 0 ? ((nextMonthForecast - avgMonthlySales) / avgMonthlySales) * 100 : 0
        }
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve predictive metrics', { error: (error as Error).message });
    next(error);
  } finally {
    const tenant = (req as any).tenant;
    const prisma = getTenantPrisma(tenant);
    if (tenant) {
      await prisma.$disconnect();
    }
  }
});

export default router;

