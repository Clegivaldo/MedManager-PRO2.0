import { Request, Response, NextFunction } from 'express';
import { nfceService, type NFeInvoiceData } from '../services/nfce.service.js';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class NFCeController {

    /**
     * Emit NFC-e for a POS sale
     */
    static async emit(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { items, paymentMethod, customerId, amountPaid } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                throw new AppError('Items are required', 400);
            }

            // Fetch Tenant (Issuer)
            const tenant = await prismaMaster.tenant.findUnique({
                where: { id: tenantId },
            });
            if (!tenant) throw new AppError('Tenant not found', 404);

            // Fetch Fiscal Profile
            const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
                where: { tenantId }
            });
            if (!fiscalProfile) throw new AppError('Fiscal profile not configured', 400);

            // Fetch Customer (Optional)
            let customer;
            if (customerId) {
                customer = await prismaMaster.customer.findUnique({
                    where: { id: customerId }
                });
            }

            // Prepare Invoice Data
            // 1. Calculate Totals
            // 2. Fetch Product Details (Mocking here, assuming items contain details, IDEALLY fetch from DB)
            // For MVP speed, we assume frontend sends necessary product data or we trust IDs if we had a product service handy.
            // Better: Fetch products to ensure NCM/CFOP are correct.

            const productIds = items.map((i: any) => i.productId);
            const products = await prismaMaster.product.findMany({
                where: { id: { in: productIds }, tenantId }
            });

            const productsMap = new Map(products.map(p => [p.id, p]));

            let subtotal = 0;
            const nfeItems = items.map((item: any) => {
                const product = productsMap.get(item.productId) as any;
                if (!product) throw new AppError(`Product ${item.productId} not found`, 400);

                const total = item.quantity * Number(product.price); // Use price from DB
                subtotal += total;

                return {
                    id: item.productId, // Using product ID as item ID
                    product: {
                        id: product.id,
                        name: product.name,
                        ncm: product.ncm || '00000000',
                        unit: 'UN', // Default
                        gtin: product.ean || 'SEM GTIN',
                        cfop: '5102' // Venda consumidor
                    },
                    quantity: item.quantity,
                    unitPrice: Number(product.price),
                    discount: 0,
                    subtotal: total,
                    total: total,
                    icms: 0 // Simple National usually
                };
            });

            // Construct NFeInvoiceData
            const invoiceData: NFeInvoiceData = {
                invoice: {
                    id: 'temp-' + Date.now(), // Invoice will be created/updated by service
                    invoiceNumber: '0', // Will be assigned
                    operationType: 'EXIT',
                    cfop: '5102',
                    naturezaOperacao: 'VENDA CONSUMIDOR',
                    paymentMethod: paymentMethod || 'CASH',
                    installments: 1,
                    subtotal: subtotal,
                    discount: 0,
                    tax: 0,
                    total: subtotal,
                    createdAt: new Date()
                },
                issuer: {
                    cnpj: fiscalProfile.cnpj,
                    name: fiscalProfile.companyName,
                    stateRegistration: fiscalProfile.stateRegistration || '',
                    municipalRegistration: fiscalProfile.municipalRegistration,
                    address: fiscalProfile.address || '{}', // Parses inside service
                    email: tenant.email,
                },
                customer: customer ? {
                    id: customer.id,
                    name: customer.name,
                    cnpjCpf: customer.cpf || customer.cnpj || '',
                    email: customer.email,
                    address: customer.address
                } : undefined,
                items: nfeItems,
                payments: [{
                    method: paymentMethod || '01',
                    amount: subtotal,
                    status: 'paid'
                }]
            };

            // Create Invoice record in DB first? 
            // NFeService usually updates an existing invoice.
            // Let's create a pending invoice.
            const invoice = await prismaMaster.invoice.create({
                data: {
                    tenantId,
                    invoiceNumber: 0, // Placeholder
                    series: 0,
                    type: 'EXIT',
                    status: 'DRAFT',
                    total: subtotal,
                    customerName: customer?.name || 'Consumidor Final',
                    customerDocument: customer?.cpf || customer?.cnpj,
                    xmlContent: '',
                }
            });

            invoiceData.invoice.id = invoice.id;

            // Call Service
            const result = await nfceService.emitNFCe(invoiceData, tenantId);

            // Update Invoice with real number/status handled by service partially, but we update number here if not
            // Service updates accessKey, protocol...

            res.json(result);

        } catch (error) {
            next(error);
        }
    }
}
