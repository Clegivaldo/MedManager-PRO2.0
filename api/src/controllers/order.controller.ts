import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { z } from 'zod';

export class OrderController {
    async list(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const search = req.query.search as string;
            const status = req.query.status as string;

            const where: any = {};

            if (search) {
                where.OR = [
                    { id: { contains: search, mode: 'insensitive' } },
                    { customer: { companyName: { contains: search, mode: 'insensitive' } } },
                ];
            }

            if (status && status !== 'all') {
                where.status = status.toUpperCase();
            }

            const prisma = getTenantPrisma((req as any).tenant);

            const [orders, total] = await Promise.all([
                prisma.order.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        customer: {
                            select: {
                                id: true,
                                companyName: true,
                                cnpjCpf: true,
                            }
                        },
                        items: true,
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.order.count({ where }),
            ]);

            return res.json({
                data: orders,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Error listing orders:', error);
            return res.status(500).json({ error: 'Failed to list orders' });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);
            const order = await prisma.order.findUnique({
                where: { id },
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.json(order);
        } catch (error) {
            console.error('Error getting order:', error);
            return res.status(500).json({ error: 'Failed to get order' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const schema = z.object({
                customerId: z.string(),
                items: z.array(z.object({
                    productId: z.string(),
                    quantity: z.number().min(1),
                    unitPrice: z.number(),
                })),
                paymentMethod: z.string().optional(),
                deliveryDate: z.string().optional(), // ISO date string
                notes: z.string().optional(),
            });

            const data = schema.parse(req.body);

            // Calculate totals
            let totalValue = 0;
            const orderItems = data.items.map(item => {
                const total = item.quantity * item.unitPrice;
                totalValue += total;
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total,
                };
            });

            const prisma = getTenantPrisma((req as any).tenant);
            const order = await prisma.order.create({
                data: {
                    customerId: data.customerId,
                    totalValue,
                    paymentMethod: data.paymentMethod,
                    deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
                    notes: data.notes,
                    status: 'PENDING',
                    items: {
                        create: orderItems,
                    },
                },
                include: {
                    items: true,
                },
            });

            return res.status(201).json(order);
        } catch (error) {
            console.error('Error creating order:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation error', details: error.errors });
            }
            return res.status(500).json({ error: 'Failed to create order' });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const schema = z.object({
                status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
                deliveryDate: z.string().optional(),
                notes: z.string().optional(),
            });

            const data = schema.parse(req.body);

            const updateData: any = {};
            if (data.status) updateData.status = data.status;
            if (data.deliveryDate) updateData.deliveryDate = new Date(data.deliveryDate);
            if (data.notes) updateData.notes = data.notes;

            const prisma = getTenantPrisma((req as any).tenant);
            const order = await prisma.order.update({
                where: { id },
                data: updateData,
            });

            return res.json(order);
        } catch (error) {
            console.error('Error updating order:', error);
            return res.status(500).json({ error: 'Failed to update order' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            // Usually we don't hard delete orders, but for CRUD completeness:
            // Or maybe soft delete / cancel?
            // Let's implement delete for now, but in reality we might want to just cancel.

            // Delete items first (cascade should handle this if configured, but let's be safe or rely on cascade)
            // Prisma schema didn't specify onDelete: Cascade for items relation in Order side, but usually it's on the Item side.
            // In OrderItem: order Order @relation(..., onDelete: Cascade) is not present in my schema update.
            // I should have added onDelete: Cascade.
            // For now, I will delete items manually in transaction or just delete order and let it fail if constraint exists.

            const prisma = getTenantPrisma((req as any).tenant);
            const deleteItems = prisma.orderItem.deleteMany({
                where: { orderId: id },
            });
            const deleteOrder = prisma.order.delete({
                where: { id },
            });

            await prisma.$transaction([deleteItems, deleteOrder]);

            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting order:', error);
            return res.status(500).json({ error: 'Failed to delete order' });
        }
    }
}
