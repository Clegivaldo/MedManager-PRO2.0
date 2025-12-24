import { Request, Response, NextFunction } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const temperatureSchema = z.object({
    warehouseId: z.string(),
    temperature: z.number(),
    humidity: z.number().optional(),
    recordedBy: z.string().optional(),
});

export class TemperatureController {
    // POST /api/v1/temperature - Record temperature
    async record(req: Request, res: Response, next: NextFunction) {
        try {
            const data = temperatureSchema.parse(req.body);
            const prisma = getTenantPrisma((req as any).tenant);

            // Get warehouse to check temperature limits
            const warehouse = await prisma.warehouse.findUnique({
                where: { id: data.warehouseId },
            });

            if (!warehouse) {
                throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
            }

            // Check if temperature is out of range
            let isAlert = false;
            let alertMessage = null;

            if (warehouse.temperatureMin !== null && data.temperature < warehouse.temperatureMin) {
                isAlert = true;
                alertMessage = `Temperature below minimum (${warehouse.temperatureMin}°C)`;
            } else if (warehouse.temperatureMax !== null && data.temperature > warehouse.temperatureMax) {
                isAlert = true;
                alertMessage = `Temperature above maximum (${warehouse.temperatureMax}°C)`;
            }

            const reading = await prisma.temperatureReading.create({
                data: {
                    warehouseId: data.warehouseId,
                    temperature: data.temperature,
                    humidity: data.humidity,
                    recordedBy: data.recordedBy || (req.user as any)?.userId || 'system',
                    isAlert,
                    alertMessage,
                },
                include: {
                    warehouse: true,
                },
            });

            res.status(201).json({
                success: true,
                data: reading,
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // GET /api/v1/temperature/latest - Get latest readings per warehouse
    async getLatest(req: Request, res: Response, next: NextFunction) {
        try {
            const prisma = getTenantPrisma((req as any).tenant);

            const warehouses = await prisma.warehouse.findMany({
                where: { isActive: true },
                include: {
                    temperatureReadings: {
                        take: 1,
                        orderBy: { recordedAt: 'desc' },
                    },
                },
            });

            const latestReadings = warehouses.map((warehouse) => ({
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                warehouseCode: warehouse.code,
                temperatureMin: warehouse.temperatureMin,
                temperatureMax: warehouse.temperatureMax,
                latestReading: warehouse.temperatureReadings[0] || null,
            }));

            res.json({
                success: true,
                data: latestReadings,
            });
        } catch (error) {
            return next(error as any);
        }
    }

    // GET /api/v1/temperature/warehouse/:warehouseId - Get temperature history
    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const { warehouseId } = req.params;
            const { limit = 50, page = 1 } = req.query;

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const prisma = getTenantPrisma((req as any).tenant);

            const [readings, total] = await Promise.all([
                prisma.temperatureReading.findMany({
                    where: { warehouseId },
                    skip,
                    take,
                    orderBy: { recordedAt: 'desc' },
                }),
                prisma.temperatureReading.count({ where: { warehouseId } }),
            ]);

            res.json({
                success: true,
                data: {
                    readings,
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

    // GET /api/v1/temperature/alerts - Get temperature alerts
    async getAlerts(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit = 20 } = req.query;
            const tenant = (req as any).tenant;
            console.log('[TEMPERATURE-ALERTS] Tenant context:', { id: tenant?.id, databaseName: tenant?.databaseName });
            
            if (!tenant) {
                throw new Error('Tenant context is required for temperature alerts');
            }
            
            const prisma = getTenantPrisma(tenant);
            if (!prisma) {
                throw new Error('Failed to initialize Prisma client for tenant: ' + tenant.id);
            }

            const alerts = await prisma.temperatureReading.findMany({
                where: { isAlert: true },
                take: Number(limit),
                orderBy: { recordedAt: 'desc' },
                include: {
                    warehouse: true,
                },
            });

            return res.json({
                success: true,
                data: alerts,
            });
        } catch (error) {
            console.error('[TEMPERATURE-ALERTS] Error:', error instanceof Error ? error.message : error);
            return next(error as any);
        }
    }
}
