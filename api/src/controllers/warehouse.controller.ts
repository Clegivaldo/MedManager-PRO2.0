import { Request, Response, NextFunction } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const warehouseSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    description: z.string().optional(),
    address: z.string().optional(),
    temperatureMin: z.number().optional(),
    temperatureMax: z.number().optional(),
});

export class WarehouseController {
    // GET /api/v1/warehouses - List all warehouses
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = (req as any).tenant;
            if (!tenant) {
                throw new AppError('Tenant context required', 400);
            }

            const { page = 1, limit = 50, search, status } = req.query;

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: any = {};

            if (search) {
                where.OR = [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { code: { contains: String(search), mode: 'insensitive' } },
                ];
            }

            if (status === 'active') {
                where.isActive = true;
            } else if (status === 'inactive') {
                where.isActive = false;
            }

            const prisma = getTenantPrisma(tenant);
            if (!prisma) {
                throw new AppError('Failed to initialize database connection', 500);
            }

            const [warehouses, total] = await Promise.all([
                prisma.warehouse.findMany({
                    where,
                    skip,
                    take,
                    // Removido _count.stock até que relação com Stock seja adicionada ao schema
                    include: {
                        _count: {
                            select: {
                                temperatureReadings: true,
                            },
                        },
                    },
                    orderBy: { name: 'asc' },
                }),
                prisma.warehouse.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    warehouses,
                    pagination: {
                        page: Number(page),
                        limit: take,
                        total,
                        pages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // GET /api/v1/warehouses/:id - Get warehouse by ID
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);

            const warehouse = await prisma.warehouse.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            temperatureReadings: true,
                        },
                    },
                    temperatureReadings: {
                        take: 10,
                        orderBy: { recordedAt: 'desc' },
                    },
                },
            });

            if (!warehouse) {
                throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: warehouse,
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // POST /api/v1/warehouses - Create warehouse
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data = warehouseSchema.parse(req.body);
            const prisma = getTenantPrisma((req as any).tenant);

            // Check if code already exists
            const existing = await prisma.warehouse.findUnique({
                where: { code: data.code },
            });

            if (existing) {
                throw new AppError('Warehouse code already exists', 400, 'DUPLICATE_CODE');
            }

            const warehouse = await prisma.warehouse.create({
                data: {
                    ...data,
                    name: data.name || data.code,
                    isActive: true,
                },
            });

            res.status(201).json({
                success: true,
                data: warehouse,
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // PUT /api/v1/warehouses/:id - Update warehouse
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);

            const existing = await prisma.warehouse.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
            }

            const warehouse = await prisma.warehouse.update({
                where: { id },
                data: req.body,
            });

            res.json({
                success: true,
                data: warehouse,
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // DELETE /api/v1/warehouses/:id - Delete warehouse (soft delete)
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);

            const existing = await prisma.warehouse.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
            }

            // Nota: verificação de estoque removida até que a relação Stock-Warehouse seja implementada

            // Soft delete
            const warehouse = await prisma.warehouse.update({
                where: { id },
                data: { isActive: false },
            });

            res.json({
                success: true,
                data: warehouse,
            });
        } catch (error) {
            return next(error as any);
        }
    }
}
