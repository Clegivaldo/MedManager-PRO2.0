import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { AppError } from '../middleware/errorHandler.js';
export class QuoteController {
    async list(req, res) {
        try {
            const { page = 1, limit = 50, search, status } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);
            const where = {};
            if (search) {
                where.OR = [
                    { quoteNumber: { contains: String(search), mode: 'insensitive' } },
                ];
            }
            if (status) {
                where.status = status;
            }
            const prisma = getTenantPrisma(req.tenant);
            if (!prisma) {
                return res.status(400).json({ success: false, message: 'Tenant context not available' });
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: (error && error.message) || 'Internal error' });
        }
    }
    async getById(req, res) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma(req.tenant);
            if (!prisma) {
                return res.status(400).json({ success: false, message: 'Tenant context not available' });
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: (error && error.message) || 'Internal error' });
        }
    }
    async create(req, res) {
        try {
            const { customerId, validUntil, items, notes } = req.body;
            const prisma = getTenantPrisma(req.tenant);
            if (!prisma) {
                return res.status(400).json({ success: false, message: 'Tenant context not available' });
            }
            // Generate quote number
            const count = await prisma.quote.count();
            const quoteNumber = `#ORC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
            // Calculate total
            const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
            const quote = await prisma.quote.create({
                data: {
                    quoteNumber,
                    customerId,
                    validUntil: new Date(validUntil),
                    totalAmount,
                    notes,
                    status: 'pending',
                    items: {
                        create: items.map((item) => ({
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: (error && error.message) || 'Internal error' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const prisma = getTenantPrisma(req.tenant);
            if (!prisma) {
                return res.status(400).json({ success: false, message: 'Tenant context not available' });
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: (error && error.message) || 'Internal error' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            const prisma = getTenantPrisma(req.tenant);
            if (!prisma) {
                return res.status(400).json({ success: false, message: 'Tenant context not available' });
            }
            await prisma.quote.delete({
                where: { id },
            });
            res.json({
                success: true,
                message: 'Quote deleted successfully',
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: (error && error.message) || 'Internal error' });
        }
    }
}
//# sourceMappingURL=quote.controller.js.map