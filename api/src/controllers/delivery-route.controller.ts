import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class DeliveryRouteController {
    async list(req: Request, res: Response) {
        try {
            const { page = 1, limit = 50, status, date } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: any = {};

            if (status) {
                where.status = status;
            }

            if (date) {
                const searchDate = new Date(String(date));
                where.plannedDate = {
                    gte: new Date(searchDate.setHours(0, 0, 0, 0)),
                    lte: new Date(searchDate.setHours(23, 59, 59, 999)),
                };
            }

            const prisma = getTenantPrisma((req as any).tenant);

            const [routes, total] = await Promise.all([
                prisma.deliveryRoute.findMany({
                    where,
                    skip,
                    take,
                    include: {
                        stops: {
                            include: {
                                order: {
                                    include: {
                                        customer: true,
                                    },
                                },
                            },
                            orderBy: { stopSequence: 'asc' },
                        },
                    },
                    orderBy: { plannedDate: 'desc' },
                }),
                prisma.deliveryRoute.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    routes,
                    pagination: {
                        page: Number(page),
                        limit: take,
                        total,
                        pages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            throw error;
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);

            const route = await prisma.deliveryRoute.findUnique({
                where: { id },
                include: {
                    stops: {
                        include: {
                            order: {
                                include: {
                                    customer: true,
                                    items: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { stopSequence: 'asc' },
                    },
                },
            });

            if (!route) {
                throw new AppError('Route not found', 404, 'ROUTE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: route,
            });
        } catch (error) {
            throw error;
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { driverName, vehiclePlate, plannedDate, orderIds, notes } = req.body;
            const prisma = getTenantPrisma((req as any).tenant);

            // Generate route number
            const count = await prisma.deliveryRoute.count();
            const routeNumber = `ROTA-${String(count + 1).padStart(3, '0')}`;

            // Get orders with customer addresses
            const orders = await prisma.order.findMany({
                where: {
                    id: { in: orderIds },
                },
                include: {
                    customer: true,
                },
            });

            const route = await prisma.deliveryRoute.create({
                data: {
                    routeNumber,
                    driverName,
                    vehiclePlate,
                    plannedDate: new Date(plannedDate),
                    totalStops: orderIds.length,
                    notes,
                    stops: {
                        create: orderIds.map((orderId: string, index: number) => {
                            const order = orders.find(o => o.id === orderId);
                            return {
                                orderId,
                                stopSequence: index + 1,
                                customerAddress: order?.customer?.address ? JSON.stringify(order.customer.address) : 'Endereço não disponível',
                            };
                        }),
                    },
                },
                include: {
                    stops: {
                        include: {
                            order: {
                                include: {
                                    customer: true,
                                },
                            },
                        },
                        orderBy: { stopSequence: 'asc' },
                    },
                },
            });

            res.status(201).json({
                success: true,
                data: route,
            });
        } catch (error) {
            throw error;
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const prisma = getTenantPrisma((req as any).tenant);

            const route = await prisma.deliveryRoute.update({
                where: { id },
                data: { status, notes },
                include: {
                    stops: {
                        include: {
                            order: {
                                include: {
                                    customer: true,
                                },
                            },
                        },
                        orderBy: { stopSequence: 'asc' },
                    },
                },
            });

            res.json({
                success: true,
                data: route,
            });
        } catch (error) {
            throw error;
        }
    }

    async completeStop(req: Request, res: Response) {
        try {
            const { id, stopId } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);

            // Complete the stop
            await prisma.routeStop.update({
                where: { id: stopId },
                data: {
                    isCompleted: true,
                    completedAt: new Date(),
                },
            });

            // Update route completed stops count
            const route = await prisma.deliveryRoute.findUnique({
                where: { id },
                include: {
                    stops: true,
                },
            });

            if (route) {
                const completedCount = route.stops.filter(s => s.isCompleted).length;

                await prisma.deliveryRoute.update({
                    where: { id },
                    data: {
                        completedStops: completedCount,
                        status: completedCount === route.totalStops ? 'completed' : 'in_transit',
                    },
                });
            }

            res.json({
                success: true,
                message: 'Stop completed successfully',
            });
        } catch (error) {
            throw error;
        }
    }
}
