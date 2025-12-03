import { Request, Response } from 'express';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const prisma = prismaMaster;

export class TenantBillingController {
    /**
     * GET /api/v1/tenant/billing/invoices
     * Listar faturas do tenant autenticado
     */
    listInvoices = async (req: Request, res: Response) => {
        try {
            const tenantId = (req as any).tenantId; // Vem do middleware tenantMiddleware
            const { page = 1, limit = 10, status } = req.query;
            const offset = (Number(page) - 1) * Number(limit);

            if (!tenantId) {
                throw new AppError('Tenant ID não encontrado', 401);
            }

            const where: any = { tenantId };
            if (status) where.status = status;

            const [invoices, total] = await Promise.all([
                prisma.payment.findMany({
                    where,
                    skip: offset,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        amount: true,
                        currency: true,
                        paymentMethod: true,
                        status: true,
                        dueDate: true,
                        paidAt: true,
                        createdAt: true,
                        metadata: true
                    }
                }),
                prisma.payment.count({ where })
            ]);

            // Calcular estatísticas
            const summary = {
                totalPending: await prisma.payment.count({
                    where: { tenantId, status: { in: ['pending', 'overdue'] } }
                }),
                totalPaid: await prisma.payment.count({
                    where: { tenantId, status: 'confirmed' }
                })
            };

            res.json({
                invoices: invoices.map(inv => ({
                    id: inv.id,
                    amount: inv.amount.toString(),
                    currency: inv.currency,
                    paymentMethod: inv.paymentMethod,
                    status: inv.status,
                    dueDate: inv.dueDate,
                    paidAt: inv.paidAt,
                    createdAt: inv.createdAt,
                    description: (inv.metadata as any)?.description || 'Mensalidade'
                })),
                summary,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            logger.error('Error listing tenant invoices:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    };

    /**
     * GET /api/v1/tenant/billing/invoices/:id/payment-info
     * Obter informações de pagamento (Pix QR Code, boleto) para uma fatura específica
     */
    getPaymentInfo = async (req: Request, res: Response) => {
        try {
            const tenantId = (req as any).tenantId;
            const { id } = req.params;

            if (!tenantId) {
                throw new AppError('Tenant ID não encontrado', 401);
            }

            const payment = await prisma.payment.findUnique({
                where: { id }
            });

            if (!payment || payment.tenantId !== tenantId) {
                throw new AppError('Fatura não encontrada', 404);
            }

            res.json({
                paymentInfo: {
                    id: payment.id,
                    amount: payment.amount.toString(),
                    status: payment.status,
                    dueDate: payment.dueDate,
                    paymentMethod: payment.paymentMethod,
                    pixQrCode: payment.pixQrCode,
                    pixQrCodeBase64: payment.pixQrCodeBase64,
                    boletoUrl: payment.boletoUrl,
                    boletoBarcode: payment.boletoBarcode
                }
            });
        } catch (error) {
            logger.error('Error getting payment info:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    };
}
