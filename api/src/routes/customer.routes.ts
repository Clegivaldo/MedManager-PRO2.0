import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/permissions.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = Router();

// Listar clientes
router.get('/', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_READ), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
          { companyName: { contains: String(search), mode: 'insensitive' } },
          { tradeName: { contains: String(search), mode: 'insensitive' } },
          { cnpjCpf: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.isActive = status === 'active';
    }

    const result = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take,
          orderBy: { companyName: 'asc' }
        }),
        prisma.customer.count({ where })
      ]);
      return { customers, total };
    });
    const { customers, total } = result;

    res.json({
      success: true,
      data: {
        customers,
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

// Criar cliente
router.post('/', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_CREATE), async (req, res, next) => {
  try {
    const {
        companyName,
        tradeName,
        cnpjCpf,
      email,
      phone,
      address,
      customerType = 'PF',
        creditLimit,
      isActive = true
    } = req.body;

      if (!companyName || !cnpjCpf) {
        throw new AppError('Company name and CNPJ/CPF are required', 400, 'MISSING_FIELDS');
    }

    // Verificar se já existe cliente com mesmo documento
    const { customer, isExisting } = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingCustomer = await prisma.customer.findFirst({
        where: { cnpjCpf }
      });

      if (existingCustomer) {
        return { customer: existingCustomer, isExisting: true };
      }

      const createdCustomer = await prisma.customer.create({
        data: {
          companyName,
          tradeName,
          cnpjCpf,
          email,
          phone,
          address,
          customerType,
          creditLimit,
          isActive
        }
      });

      return { customer: createdCustomer, isExisting: false };
    });

    logger.info(`Customer ${isExisting ? 'reused' : 'created'}: ${customer.companyName}`, {
      userId: req.user?.userId,
      customerId: customer.id,
      action: 'CUSTOMER_CREATE'
    });

    res.status(isExisting ? 200 : 201).json({
      success: true,
      data: customer,
      duplicate: isExisting
    });
  } catch (error) {
    next(error);
  }
});

// Obter cliente por ID
router.get('/:id', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_READ), async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await withTenantPrisma((req as any).tenant, async (prisma) => {
      return await prisma.customer.findUnique({
        where: { id }
      });
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

// Atualizar cliente
router.put('/:id', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_UPDATE), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!existingCustomer) {
        throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      return await prisma.customer.update({
        where: { id },
        data: updateData
      });
    });

      logger.info(`Customer updated: ${customer.companyName}`, {
      userId: req.user?.userId,
      customerId: customer.id,
      action: 'CUSTOMER_UPDATE'
    });

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

// Deletar cliente (soft delete)
router.delete('/:id', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_DELETE), async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await withTenantPrisma((req as any).tenant, async (prisma) => {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!existingCustomer) {
        throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      return await prisma.customer.update({
        where: { id },
        data: { isActive: false }
      });
    });

      logger.info(`Customer deleted: ${customer.companyName}`, {
      userId: req.user?.userId,
      customerId: customer.id,
      action: 'CUSTOMER_DELETE'
    });

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

export default router;