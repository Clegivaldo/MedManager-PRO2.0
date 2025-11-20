import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = Router();

// Criar lote
router.post('/', authenticateToken, requirePermission('BATCH_CREATE'), async (req, res, next) => {
  try {
    const {
      productId,
      batchNumber,
      quantityEntry,
      quantityCurrent,
      expirationDate,
      manufactureDate
    } = req.body;

    if (!productId || !batchNumber || !quantityEntry || !expirationDate) {
      throw new AppError('Missing required fields', 400, 'MISSING_FIELDS');
    }

    const batch = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      const existingBatch = await prisma.batch.findFirst({
        where: { productId, batchNumber }
      });

      if (existingBatch) {
        throw new AppError('Batch with this number already exists for this product', 400, 'DUPLICATE_BATCH');
      }

      return await prisma.batch.create({
        data: {
          productId,
          batchNumber,
          quantityEntry: Number(quantityEntry),
          quantityCurrent: Number(quantityCurrent || quantityEntry),
          expirationDate: new Date(expirationDate),
          manufactureDate: manufactureDate ? new Date(manufactureDate) : null
        }
      });
    });

    logger.info(`Batch created: ${batchNumber}`, {
      userId: req.user?.userId,
      batchId: batch.id,
      productId,
      action: 'BATCH_CREATE'
    });

    res.status(201).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
});

// Listar todos os lotes
router.get('/', authenticateToken, requirePermission('BATCH_READ'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, productId, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (productId) {
      where.productId = String(productId);
    }

    if (status === 'available') {
      where.quantityCurrent = { gt: 0 };
      where.expirationDate = { gt: new Date() };
    } else if (status === 'expired') {
      where.expirationDate = { lte: new Date() };
    } else if (status === 'depleted') {
      where.quantityCurrent = 0;
    }

    const result = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const [batches, total] = await Promise.all([
        prisma.batch.findMany({
          where,
          skip,
          take,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                internalCode: true
              }
            }
          },
          orderBy: { expirationDate: 'asc' }
        }),
        prisma.batch.count({ where })
      ]);
      return { batches, total };
    });

    const { batches, total } = result;

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Obter lote por ID
router.get('/:id', authenticateToken, requirePermission('BATCH_READ'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await withTenantPrisma((req as any).tenant, async (prisma) => {
      return await prisma.batch.findUnique({
        where: { id },
        include: {
          product: true
        }
      });
    });

    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
});

// Atualizar lote
router.put('/:id', authenticateToken, requirePermission('BATCH_UPDATE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const batch = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingBatch = await prisma.batch.findUnique({
        where: { id }
      });

      if (!existingBatch) {
        throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
      }

      return await prisma.batch.update({
        where: { id },
        data: {
          ...updateData,
          expirationDate: updateData.expirationDate ? new Date(updateData.expirationDate) : undefined,
          manufactureDate: updateData.manufactureDate ? new Date(updateData.manufactureDate) : undefined
        }
      });
    });

    logger.info(`Batch updated: ${batch.batchNumber}`, {
      userId: req.user?.userId,
      batchId: batch.id,
      action: 'BATCH_UPDATE'
    });

    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
});

// Deletar lote
router.delete('/:id', authenticateToken, requirePermission('BATCH_DELETE'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingBatch = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const batch = await prisma.batch.findUnique({
        where: { id }
      });

      if (!batch) {
        throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
      }

      // Soft delete ao invés de hard delete para manter integridade
      await prisma.batch.update({
        where: { id },
        data: { quantityCurrent: 0 } // Marca como esgotado
      });

      return batch;
    });

    logger.info(`Batch deleted: ${existingBatch.batchNumber}`, {
      userId: req.user?.userId,
      batchId: id,
      action: 'BATCH_DELETE'
    });

    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
