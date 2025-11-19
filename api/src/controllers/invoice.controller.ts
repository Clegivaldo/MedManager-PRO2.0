import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { PERMISSIONS } from '../middleware/permissions.js';
import { v4 as uuidv4 } from 'uuid';
import { prismaMaster as prisma } from '../lib/prisma.js';
import { auditLog } from '../utils/audit.js';

export class InvoiceController {
  // List invoices with filters
  listInvoices = async (req: Request, res: Response) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        type, 
        customerId, 
        startDate, 
        endDate,
        minValue,
        maxValue
      } = req.query;
      
      const offset = (Number(page) - 1) * Number(limit);
      
      const where: any = { tenantId: req.user!.tenantId };
      
      if (status) where.status = status;
      if (type) where.type = type;
      if (customerId) where.customerId = customerId;
      if (startDate || endDate) {
        where.issueDate = {};
        if (startDate) where.issueDate.gte = new Date(startDate as string);
        if (endDate) where.issueDate.lte = new Date(endDate as string);
      }
      if (minValue || maxValue) {
        where.totalValue = {};
        if (minValue) where.totalValue.gte = parseFloat(minValue as string);
        if (maxValue) where.totalValue.lte = parseFloat(maxValue as string);
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { issueDate: 'desc' },
          include: {
            customer: { select: { id: true, companyName: true, cnpjCpf: true, email: true } },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    
                  }
                }
              }
            },
            _count: {
              select: {
                items: true
              }
            }
          }
        }),
        prisma.invoice.count({ where })
      ]);

      res.json({
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing invoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Create a new invoice
  createInvoice = async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        type = 'sale',
        items,
        paymentMethod,
        paymentTerms,
        observations,
        discount = 0,
        shippingCost = 0
      } = req.body;

      // Validate customer
      const customer = await prisma.customer.findFirst({
        where: { id: customerId }
      });

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Validate and process items
      if (!items || items.length === 0) {
        throw new AppError('Invoice must have at least one item', 400);
      }

      const processedItems: any[] = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId }
        });

        if (!product) {
          throw new AppError(`Product ${item.productId} not found`, 404);
        }

        // Check stock availability
        

        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;

        processedItems.push({
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: itemTotal.toString(),
          discount: (item.discount || 0).toString(),
          cfop: '5405',
          product: { connect: { id: item.productId } },
          ...(item.batchId ? { batch: { connect: { id: item.batchId } } } : {})
        });
      }

      // Calculate totals
      const totalDiscount = discount;
      const totalValue = subtotal - totalDiscount + shippingCost;

      // Generate invoice number
      const invoiceNumber = Math.floor(Date.now() % 1000000000);

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          customerId,
          number: invoiceNumber,
          series: 1,
          invoiceType: type === 'sale' ? 'EXIT' : 'ENTRY',
          issueDate: new Date(),
          status: 'DRAFT',
          totalValue: subtotal - totalDiscount + shippingCost,
          userId: req.user!.userId,
          items: { create: processedItems }
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'Invoice',
        recordId: invoice.id,
        operation: 'CREATE',
        newData: { invoiceNumber, customerId, totalValue, itemsCount: items.length }
      });

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice
      });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Get invoice details
  getInvoice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: { id },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  
                }
              },
              batch: {
                select: {
                  id: true,
                  batchNumber: true,
                  expirationDate: true
                }
              }
            }
          },
          user: { select: { id: true, name: true, email: true } }
        }
      });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      res.json({ invoice });
    } catch (error) {
      logger.error('Error getting invoice:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Update invoice
  updateInvoice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const invoice = await prisma.invoice.findFirst({ where: { id } });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      // Prevent updating issued or cancelled invoices
      if (invoice.status === 'AUTHORIZED' || invoice.status === 'CANCELLED') {
        throw new AppError('Cannot update issued or cancelled invoice', 400);
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: updates,
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'Invoice',
        recordId: id,
        operation: 'UPDATE',
        newData: updates
      });

      res.json({
        message: 'Invoice updated successfully',
        invoice: updatedInvoice
      });
    } catch (error) {
      logger.error('Error updating invoice:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Issue electronic invoice (NF-e)
  issueElectronicInvoice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: { id },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (invoice.status !== 'DRAFT') {
        throw new AppError('Only draft invoices can be issued', 400);
      }

      // Validate required fields for NF-e
      if (!invoice.customer?.cnpjCpf || !invoice.customer?.email) {
        throw new AppError('Customer must have document and email for electronic invoice', 400);
      }

      // Generate NF-e XML
      const nfeXml = await this.generateNFeXML(invoice);

      const accessKey = this.generateAccessKey();
      await prisma.invoice.update({
        where: { id },
        data: {
          status: 'AUTHORIZED',
          authorizationDate: new Date(),
          accessKey,
          xmlContent: nfeXml
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'Invoice',
        recordId: id,
        operation: 'EMIT',
        newData: { invoiceId: id, accessKey }
      });

      res.json({
        message: 'Electronic invoice issued successfully',
        invoiceId: id,
        accessKey,
        status: 'AUTHORIZED'
      });
    } catch (error) {
      logger.error('Error issuing electronic invoice:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Cancel electronic invoice
  cancelElectronicInvoice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, justification } = req.body;

      const invoice = await prisma.invoice.findFirst({ where: { id } });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (!invoice.accessKey) {
        throw new AppError('No NF-e found for this invoice', 400);
      }

      if (invoice.status !== 'AUTHORIZED') {
        throw new AppError('Only issued electronic invoices can be cancelled', 400);
      }

      // Update electronic invoice status
      await prisma.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          xmlContent: JSON.stringify({ reason, justification })
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'Invoice',
        recordId: id,
        operation: 'CANCEL',
        newData: { invoiceId: id, reason, justification }
      });

      res.json({ message: 'Electronic invoice cancelled successfully' });
    } catch (error) {
      logger.error('Error cancelling electronic invoice:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Generate DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
  generateDANFE = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: { id },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (!invoice.accessKey || invoice.status !== 'AUTHORIZED') {
        throw new AppError('NF-e must be authorized to generate DANFE', 400);
      }

      const danfeData = {
        invoiceNumber: String(invoice.number),
        issueDate: invoice.issueDate,
        accessKey: invoice.accessKey,
        customer: invoice.customer,
        items: invoice.items,
        totals: {
          subtotal: Number(invoice.totalValue),
          discount: 0,
          shippingCost: 0,
          totalValue: Number(invoice.totalValue)
        },
        qrCode: this.generateQRCode(invoice.accessKey as string),
        generatedAt: new Date()
      };

      res.json({
        message: 'DANFE generated successfully',
        danfe: danfeData
      });
    } catch (error) {
      logger.error('Error generating DANFE:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  // Helper methods
  private async generateInvoiceNumber(): Promise<number> {
    return Math.floor(Date.now() % 1000000000);
  }

  private generateAccessKey(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `35${timestamp.substring(6)}${random}`;
  }

  private async generateNFeXML(invoice: any): Promise<string> {
    // This would generate actual NF-e XML according to Brazilian tax authority specifications
    // For now, return a simplified XML structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" version="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${invoice.number}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${Math.floor(Math.random() * 100000000)}</cNF>
        <natOp>VENDA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${invoice.number}</nNF>
        <dhEmi>${invoice.issueDate.toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${Math.floor(Math.random() * 10)}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ></CNPJ>
        <xNome></xNome>
        <xFant></xFant>
        <enderEmit>
          <xLgr></xLgr>
          <nro></nro>
          <xBairro></xBairro>
          <cMun>3550308</cMun>
          <xMun>SÃO PAULO</xMun>
          <UF>SP</UF>
          <CEP></CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderEmit>
        <IE>ISENTO</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${invoice.customer.cnpjCpf}</CNPJ>
        <xNome>${invoice.customer.companyName}</xNome>
        <enderDest>
          <xLgr></xLgr>
          <nro></nro>
          <xBairro></xBairro>
          <cMun>3550308</cMun>
          <xMun>SÃO PAULO</xMun>
          <UF>SP</UF>
          <CEP></CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCPUFDest>0.00</vFCPUFDest>
          <vICMSUFDest>0.00</vICMSUFDest>
          <vICMSUFRemet>0.00</vICMSUFRemet>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${parseFloat(invoice.totalValue).toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${parseFloat(invoice.totalValue).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <cobr>
        <fat>
          <nFat>${invoice.number}</nFat>
          <vOrig>${parseFloat(invoice.totalValue).toFixed(2)}</vOrig>
          <vDesc>0.00</vDesc>
          <vLiq>${parseFloat(invoice.totalValue).toFixed(2)}</vLiq>
        </fat>
      </cobr>
      <pag>
        <detPag>
          <indPag>0</indPag>
          <tPag>99</tPag>
          <vPag>${parseFloat(invoice.totalValue).toFixed(2)}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>${invoice.observations || ''}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;
  }

  private generateQRCode(accessKey: string): string {
    // This would generate an actual QR code
    // For now, return a placeholder
    return `https://www.tax-authority.gov.br/qr-code?chave=${accessKey}`;
  }
}