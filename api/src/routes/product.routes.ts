import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = Router();

// Rotas de produtos
router.get('/', authenticateToken, requirePermission('PRODUCT_LIST'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category, status } = req.query;
    const tenantId = req.user?.tenantId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { internalCode: { contains: String(search), mode: 'insensitive' } },
        { gtin: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.isActive = status === 'active';
    }

    // Buscar produtos com RDC 430 compliance
    const result = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take,
          include: {
            batches: {
              where: { quantityCurrent: { gt: 0 } },
              take: 1,
              orderBy: { expirationDate: 'asc' }
            },
            stock: true
          },
          orderBy: { name: 'asc' }
        }),
        prisma.product.count({ where })
      ]);
      return { products, total };
    });

    const { products, total } = result;

    // Adicionar validações RDC 430
    const productsWithCompliance = products.map(product => ({
      ...product,
      compliance: {
        hasValidRegistration: !!product.anvisaCode,
        hasValidBatch: product.batches.length > 0 && product.batches[0].expirationDate > new Date(),
        hasStock: product.stock.length > 0 && product.stock[0].availableQuantity > 0,
        requiresControlledSubstanceLicense: product.isControlled,
        temperatureControlled: !!product.storage,
        rdc430Compliant: product.anvisaCode && 
                        product.batches.length > 0 && 
                        product.batches[0].expirationDate > new Date() &&
                        product.isActive
      }
    }));

    res.json({
      success: true,
      data: {
        products: productsWithCompliance,
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

router.post('/', authenticateToken, requirePermission('PRODUCT_CREATE'), async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    const {
      name,
      internalCode,
      gtin,
      anvisaCode,
      activeIngredient,
      laboratory,
      therapeuticClass,
      productType = 'COMMON',
      storage,
      isControlled = false,
      controlledSubstance,
      stripe = 'NONE',
      shelfLifeDays,
      isActive = true
    } = req.body;

    // Validações obrigatórias RDC 430
    if (!name || !internalCode) {
      throw new AppError('Name and internalCode are required', 400, 'MISSING_FIELDS');
    }

    // Verificar se já existe produto com mesmo código ou código de barras
    const product = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { internalCode },
            { gtin: gtin || undefined }
          ]
        }
      });

      if (existingProduct) {
        throw new AppError('Product with this code or barcode already exists', 400, 'DUPLICATE_PRODUCT');
      }

      // Validações específicas para substâncias controladas (Guia 33)
      if (isControlled && !anvisaCode) {
        throw new AppError('Controlled substances require ANVISA code', 400, 'MISSING_REGISTRATION');
      }

      // Validações de temperatura
      if (storage && !storage.includes('temperature')) {
        throw new AppError('Temperature controlled products require proper storage information', 400, 'MISSING_TEMPERATURE_RANGE');
      }

      // Criar produto
      if ((req as any).tenant) {
        const planLimits: Record<string, number> = { starter: 100, professional: 1000, enterprise: 10000 };
        const maxProducts = planLimits[(req as any).tenant.plan] ?? 100;
        const currentProducts = await prisma.product.count();
        if (currentProducts >= maxProducts) {
          throw new AppError('Plan product limit reached', 403, 'PLAN_LIMIT');
        }
      }

      const createdProduct = await prisma.product.create({
        data: {
          name,
          internalCode,
          gtin,
          anvisaCode,
          activeIngredient,
          laboratory,
          therapeuticClass,
          productType,
          storage,
          isControlled,
          controlledSubstance,
          stripe,
          shelfLifeDays,
          isActive
        }
      });

      if (isControlled) {
        await prisma.notification.create({
          data: {
            tenantId: (req as any).tenant?.id || undefined,
            userId: req.user!.userId,
            type: 'PRODUCT_CONTROLLED_CREATE',
            severity: 'warning',
            message: `Produto controlado criado: ${createdProduct.name}`
          }
        });
      }
      if (storage && storage.includes('temperature')) {
        await prisma.notification.create({
          data: {
            tenantId: (req as any).tenant?.id || undefined,
            userId: req.user!.userId,
            type: 'PRODUCT_TEMPERATURE_CONTROL',
            severity: 'info',
            message: `Produto com controle de temperatura: ${createdProduct.name}`
          }
        });
      }

      return createdProduct;
    });

    // Registrar log de auditoria
    logger.info(`Product created: ${product.name} (${product.internalCode})`, {
      userId: req.user?.userId,
      productId: product.id,
      action: 'PRODUCT_CREATE',
      metadata: {
        name: product.name,
        internalCode: product.internalCode,
        isControlled: product.isControlled,
        storage: product.storage
      }
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, requirePermission('PRODUCT_VIEW'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const product = await withTenantPrisma((req as any).tenant, async (prisma) => {
      return await prisma.product.findFirst({
        where: { id },
        include: {
          batches: {
            where: { quantityCurrent: { gt: 0 } },
            orderBy: { expirationDate: 'asc' }
          },
          stock: true
        }
      });
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Adicionar validações RDC 430
    const productWithCompliance = {
      ...product,
      compliance: {
        hasValidRegistration: !!product.anvisaCode,
        hasValidBatch: product.batches.length > 0 && product.batches[0].expirationDate > new Date(),
        hasStock: product.stock.length > 0 && product.stock[0].availableQuantity > 0,
        requiresControlledSubstanceLicense: product.isControlled,
        temperatureControlled: !!product.storage,
        rdc430Compliant: product.anvisaCode && 
                        product.batches.length > 0 && 
                        product.batches[0].expirationDate > new Date() &&
                        product.isActive
      }
    };

    res.json({
      success: true,
      data: productWithCompliance
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, requirePermission('PRODUCT_UPDATE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const updateData = req.body;

    // Verificar se o produto existe e atualizar
    const product = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingProduct = await prisma.product.findFirst({
        where: { id }
      });

      if (!existingProduct) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Validações específicas para substâncias controladas (Guia 33)
      if (updateData.isControlled && !updateData.anvisaCode && !existingProduct.anvisaCode) {
        throw new AppError('Controlled substances require ANVISA code', 400, 'MISSING_REGISTRATION');
      }

      // Validações de temperatura
      if (updateData.storage && !updateData.storage.includes('temperature') && !existingProduct.storage) {
        throw new AppError('Temperature controlled products require proper storage information', 400, 'MISSING_TEMPERATURE_RANGE');
      }

      // Atualizar produto
      return await prisma.product.update({
        where: { id },
        data: updateData
      });
    });

    // Registrar log de auditoria
    logger.info(`Product updated: ${product.name} (${product.internalCode})`, {
      userId: req.user?.userId,
      productId: product.id,
      action: 'PRODUCT_UPDATE',
      metadata: {
        name: product.name,
        internalCode: product.internalCode,
        isControlled: product.isControlled,
        storage: product.storage
      }
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/:id/batches - Lista lotes de um produto
router.get('/:id/batches', authenticateToken, requirePermission('BATCH_READ'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeExpired, includeEmpty } = req.query;

    const result = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, name: true, isControlled: true }
      });

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Filtros para lotes
      const where: any = { productId: id };
      
      // Por padrão, excluir lotes vencidos
      if (includeExpired !== 'true') {
        where.expirationDate = { gte: new Date() };
      }
      
      // Por padrão, excluir lotes sem estoque
      if (includeEmpty !== 'true') {
        where.quantityCurrent = { gt: 0 };
      }

      const batches = await prisma.batch.findMany({
        where,
        orderBy: [
          { expirationDate: 'asc' }, // FEFO - First Expired, First Out
          { batchNumber: 'asc' }
        ],
        select: {
          id: true,
          batchNumber: true,
          manufactureDate: true,
          expirationDate: true,
          quantityCurrent: true,
          productId: true
        }
      });

      return { product, batches };
    });

    const { product, batches } = result;

    logger.info(`Listed batches for product ${product.name}`, {
      userId: req.user?.userId,
      productId: id,
      batchCount: batches.length,
      isControlled: product.isControlled
    });

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          isControlled: product.isControlled
        },
        batches: batches.map(batch => ({
          ...batch,
          quantity: batch.quantityCurrent, // Alias para compatibilidade
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;