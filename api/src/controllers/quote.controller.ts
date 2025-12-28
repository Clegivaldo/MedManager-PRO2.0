import { Request, Response, NextFunction } from 'express';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class QuoteController {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page = 1, limit = 50, search, status } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: any = {};

            if (search) {
                where.OR = [
                    { quoteNumber: { contains: String(search), mode: 'insensitive' } },
                ];
            }

            if (status) {
                where.status = status;
            }

            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            const [quotes, total] = await Promise.all([
                prisma.quote.findMany({
                    where,
                    skip,
                    take,
                    include: {
                        customer: true,
                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.quote.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    quotes,
                    pagination: {
                        page: Number(page),
                        limit: take,
                        total,
                        pages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            const quote = await prisma.quote.findUnique({
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

            if (!quote) {
                throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: quote,
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { customerId, validUntil, items, notes } = req.body;
            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            // Generate quote number
            const count = await prisma.quote.count();
            const quoteNumber = `#ORC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            // Calculate total
            const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

            const quote = await prisma.quote.create({
                data: {
                    quoteNumber,
                    customerId,
                    validUntil: new Date(validUntil),
                    totalAmount,
                    notes,
                    status: 'pending',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                        })),
                    },
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            res.status(201).json({
                success: true,
                data: quote,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            const quote = await prisma.quote.update({
                where: { id },
                data: { status, notes },
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            res.json({
                success: true,
                data: quote,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            await prisma.quote.delete({
                where: { id },
            });

            res.json({
                success: true,
                message: 'Quote deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    async approve(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma((req as any).tenant);
            if (!prisma) {
                return next(new AppError('Tenant context not available', 400, 'TENANT_REQUIRED'));
            }

            // 1. Buscar o orçamento
            const quote = await prisma.quote.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    customer: true,
                },
            });

            if (!quote) {
                throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');
            }

            // 2. Validar se o orçamento já foi aprovado
            if (quote.status === 'approved') {
                // Verificar se já existe um pedido para este orçamento
                const existingOrder = await prisma.order.findFirst({
                    where: { quoteId: id },
                });

                if (existingOrder) {
                    throw new AppError('This quote has already been converted to an order', 400, 'QUOTE_ALREADY_APPROVED');
                }
            }

            // 3. Atualizar status do orçamento para aprovado
            await prisma.quote.update({
                where: { id },
                data: { status: 'approved' },
            });

            // 4. Gerar número do pedido
            const orderCount = await prisma.order.count();
            const orderNumber = `#PED-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

            // 5. Criar o pedido com os itens do orçamento
            const order = await prisma.order.create({
                data: {
                    orderNumber,
                    customerId: quote.customerId,
                    quoteId: quote.id,
                    totalValue: quote.totalAmount,
                    saleDate: new Date(),
                    status: 'PENDING',
                    nfeStatus: 'pending',
                    notes: `Criado a partir do orçamento ${quote.quoteNumber}`,
                    items: {
                        create: quote.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.totalPrice,
                        })),
                    },
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    quote: true,
                },
            });

            res.status(201).json({
                success: true,
                data: order,
                message: 'Quote approved and order created successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
