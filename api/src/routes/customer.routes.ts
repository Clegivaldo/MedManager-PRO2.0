import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/permissions.js';
import { prismaMaster } from '../lib/prisma.js';
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

    const [customers, total] = await Promise.all([
      prismaMaster.customer.findMany({
        where,
        skip,
        take,
          orderBy: { companyName: 'asc' }
      }),
      prismaMaster.customer.count({ where })
    ]);

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
    const existingCustomer = await prismaMaster.customer.findFirst({
        where: { cnpjCpf }
    });

    if (existingCustomer) {
      throw new AppError('Customer with this document already exists', 400, 'DUPLICATE_CUSTOMER');
    }

    const customer = await prismaMaster.customer.create({
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

      logger.info(`Customer created: ${customer.companyName}`, {
      userId: req.user?.userId,
      customerId: customer.id,
      action: 'CUSTOMER_CREATE'
    });

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

// Obter cliente por ID
router.get('/:id', authenticateToken, requirePermission(PERMISSIONS.CUSTOMER_READ), async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prismaMaster.customer.findUnique({
      where: { id }
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

    const existingCustomer = await prismaMaster.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const customer = await prismaMaster.customer.update({
      where: { id },
      data: updateData
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

    const existingCustomer = await prismaMaster.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const customer = await prismaMaster.customer.update({
      where: { id },
      data: { isActive: false }
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