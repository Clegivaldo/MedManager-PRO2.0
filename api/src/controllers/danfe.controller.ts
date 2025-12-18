import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { danfeService } from '../services/danfe.service.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';

export class DanfeController {
    async generate(req: Request, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;
            const tenantId = req.tenant?.id;

            if (!tenantId) {
                throw new AppError('Tenant not identified', 400);
            }

            // Fetch invoice with xmlContent
            const invoice = await withTenantPrisma({ id: tenantId } as any, async (prisma) => {
                return prisma.invoice.findUnique({
                    where: { id: invoiceId }
                });
            });

            if (!invoice) {
                throw new AppError('Invoice not found', 404);
            }

            if (!invoice.xmlContent) {
                throw new AppError('Invoice does not have XML content (not authorized yet?)', 400);
            }

            const pdfBuffer = await danfeService.generatePDF(invoice.xmlContent);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=danfe-${invoice.accessKey || invoiceId}.pdf`);
            res.send(pdfBuffer);

        } catch (error) {
            next(error);
        }
    }
}

export const danfeController = new DanfeController();
