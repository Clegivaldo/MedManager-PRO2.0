import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Rotas de estoque
router.get('/current', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (search) {
      where.product = {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { internalCode: { contains: String(search), mode: 'insensitive' } }
        ]
      };
    }

    const [stocks, total] = await Promise.all([
      prismaMaster.stock.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          product: { select: { id: true, name: true, internalCode: true, isControlled: true } },
          batch: { select: { id: true, batchNumber: true, expirationDate: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prismaMaster.stock.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        inventory: stocks,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/movements', authenticateToken, requirePermission('INVENTORY_MOVEMENT'), async (req, res, next) => {
  try {
    const { stockId, movementType, quantity, reason } = req.body;
    if (!stockId || !movementType || !quantity) {
      throw new AppError('stockId, movementType and quantity are required', 400);
    }

    const stock = await prismaMaster.stock.findUnique({ where: { id: stockId } });
    if (!stock) throw new AppError('Stock not found', 404);

    const previous = stock.availableQuantity;
    const delta = movementType === 'ENTRY' ? quantity : -quantity;
    const newBalance = previous + delta;
    if (newBalance < 0) throw new AppError('Resulting stock cannot be negative', 400);

    await prismaMaster.$transaction([
      prismaMaster.stock.update({
        where: { id: stockId },
        data: { availableQuantity: newBalance, lastMovement: new Date() }
      }),
      prismaMaster.stockMovement.create({
        data: {
          stockId,
          userId: req.user!.userId,
          movementType,
          quantity,
          previousBalance: previous,
          newBalance,
          reason,
          referenceDocument: undefined
        }
      })
    ]);

    logger.info('Stock movement registered', { stockId, movementType, quantity, userId: req.user!.userId });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/movements', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, stockId } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (stockId) where.stockId = stockId;

    const [movements, total] = await Promise.all([
      prismaMaster.stockMovement.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          stock: { include: { product: true, batch: true } },
          user: { select: { id: true, name: true, email: true } }
        }
      }),
      prismaMaster.stockMovement.count({ where })
    ]);

    res.json({ success: true, data: { movements, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req, res, next) => {
  try {
    const days = Number((req.query.days as any) ?? 30);
    const low = Number((req.query.low as any) ?? 5);
    const now = new Date();
    const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const [expiringSoon, expired, lowStock] = await Promise.all([
      prismaMaster.batch.findMany({
        where: { expirationDate: { gt: now, lte: soon } },
        include: { product: true }
      }),
      prismaMaster.batch.findMany({ where: { expirationDate: { lte: now } }, include: { product: true } }),
      prismaMaster.stock.findMany({ where: { availableQuantity: { lte: low } }, include: { product: true, batch: true } })
    ]);

    res.json({
      success: true,
      data: {
        expiringSoon,
        expired,
        lowStock
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/alerts/generate', authenticateToken, requirePermission('INVENTORY_ALERTS_GENERATE'), async (req, res, next) => {
  try {
    const days = Number((req.body?.days as any) ?? 30);
    const low = Number((req.body?.low as any) ?? 5);
    const now = new Date();
    const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const [expiringSoon, expired, lowStock] = await Promise.all([
      prismaMaster.batch.findMany({ where: { expirationDate: { gt: now, lte: soon } }, include: { product: true } }),
      prismaMaster.batch.findMany({ where: { expirationDate: { lte: now } }, include: { product: true } }),
      prismaMaster.stock.findMany({ where: { availableQuantity: { lte: low } }, include: { product: true, batch: true } })
    ]);

    for (const b of expiringSoon) {
      await prismaMaster.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'BATCH_EXPIRING_SOON',
          severity: 'warning',
          message: `Lote ${b.batchNumber} do produto ${b.product.name} vence em breve`
        }
      });
    }
    for (const b of expired) {
      await prismaMaster.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'BATCH_EXPIRED',
          severity: 'error',
          message: `Lote ${b.batchNumber} do produto ${b.product.name} está vencido`
        }
      });
    }
    for (const s of lowStock) {
      await prismaMaster.notification.create({
        data: {
          tenantId: (req as any).tenant?.id || undefined,
          userId: req.user!.userId,
          type: 'LOW_STOCK',
          severity: 'warning',
          message: `Estoque baixo do produto ${s.product.name} (lote ${s.batch.batchNumber})`
        }
      });
    }

    res.json({ success: true, data: { expiringSoon: expiringSoon.length, expired: expired.length, lowStock: lowStock.length } });
  } catch (error) {
    next(error);
  }
});

export default router;