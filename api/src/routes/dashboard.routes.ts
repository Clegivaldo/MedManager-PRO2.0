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

export default router;
