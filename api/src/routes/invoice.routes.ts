import { Router } from 'express';
import { z } from 'zod';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { NFeService } from '../services/nfe.service.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { auditLog } from '../utils/audit.js';
import { InvoiceType, InvoiceStatus, MovementType } from '@prisma/client';


const router: Router = Router();
const nfeService = new NFeService();

// Mapeamento de tipos de operação
const operationTypeMap: Record<string, InvoiceType> = {
  'sale': InvoiceType.EXIT,
  'return': InvoiceType.DEVOLUTION,
  'transfer': InvoiceType.EXIT,
  'bonus': InvoiceType.EXIT,
  'sample': InvoiceType.EXIT
};

// Validações Zod para NF-e
const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    discount: z.number().min(0).max(100).optional().default(0),
    batchId: z.string().uuid().optional(),
    expirationDate: z.string().datetime().optional(),
    controlledSubstance: z.boolean().optional().default(false),
  })),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'billet', 'pix']),
  installments: z.number().min(1).max(12).optional().default(1),
  observations: z.string().max(1000).optional(),
  operationType: z.enum(['sale', 'return', 'transfer', 'bonus', 'sample']).default('sale'),
  cfop: z.string().regex(/^\d{4}$/).optional(), // Código Fiscal de Operações e Prestações
  naturezaOperacao: z.string().max(60).optional(),
});

const cancelInvoiceSchema = z.object({
  justification: z.string().min(15).max(255),
  protocolNumber: z.string().optional(), // Número do protocolo de autorização
});

// Listar notas fiscais
router.get('/', requirePermissions([PERMISSIONS.INVOICE_READ]), async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      customerId, 
      startDate, 
      endDate,
      operationType 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const tenantId = req.tenant!.id;

    const where: any = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (operationType) where.invoiceType = operationType;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [invoices, total] = await Promise.all([
      prismaMaster.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              cnpjCpf: true,
              email: true,
            }
          },
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
                  expirationDate: true,
                }
              }
            }
          },
          
        },
        orderBy: { createdAt: 'desc' }
      }),
      prismaMaster.invoice.count({ where })
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
    next(error);
  }
});

// Buscar nota fiscal por ID
router.get('/:id', requirePermissions([PERMISSIONS.INVOICE_READ]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;

    const invoice = await prismaMaster.invoice.findFirst({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                isControlled: true,
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expirationDate: true,
                manufactureDate: true,
              }
            }
          }
        },
        // payments and nfe data are stored in the invoice itself
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    res.json(invoice);

  } catch (error) {
    next(error);
  }
});

// Criar nota fiscal (rascunho)
router.post('/', requirePermissions([PERMISSIONS.INVOICE_CREATE]), async (req, res, next) => {
  try {
    const validatedData = createInvoiceSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    const userId = req.user!.userId;

    // Verificar se o cliente existe
    const customer = await prismaMaster.customer.findFirst({
      where: { id: validatedData.customerId }
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Verificar produtos e estoque
    const productIds = validatedData.items.map(item => item.productId);
    const products = await prismaMaster.product.findMany({
      where: { 
        id: { in: productIds },
        isActive: true
      },
      include: {
        stock: {
          where: { availableQuantity: { gt: 0 } }
        }
      }
    });

    if (products.length !== productIds.length) {
      throw new AppError('Some products not found or inactive', 404, 'PRODUCTS_NOT_FOUND');
    }

    // Verificar estoque suficiente e validações RDC 430
    for (const item of validatedData.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      // Verificar estoque
      const totalStock = product.stock.reduce((sum, stock) => sum + stock.availableQuantity, 0);
      if (totalStock < item.quantity) {
        throw new AppError(`Insufficient stock for product ${product.name}`, 400);
      }

      // Validações específicas para medicamentos (RDC 430)
      if (product.isControlled && !item.batchId) {
        throw new AppError(`Controlled substance ${product.name} requires batch information`, 400);
      }

      const storage = product.storage as string || '';
      if (storage && storage.includes('temperature') && !storage.includes('range')) {
        throw new AppError(`Temperature controlled product ${product.name} requires temperature range`, 400);
      }

      // Verificar lote se fornecido
      if (item.batchId) {
        const batch = await prismaMaster.batch.findFirst({
          where: { 
            id: item.batchId, 
            productId: item.productId
          }
        });

        if (!batch) {
          throw new AppError(`Batch not found for product ${product.name}`, 404, 'BATCH_NOT_FOUND');
        }

        if (batch.expirationDate < new Date()) {
          throw new AppError(`Batch ${batch.batchNumber} for product ${product.name} is expired`, 400);
        }

        // Verificar estoque do lote específico
        const batchStock = await prismaMaster.stock.findFirst({
          where: { 
            productId: item.productId,
            batchId: item.batchId
          }
        });

        if (!batchStock || batchStock.availableQuantity < item.quantity) {
          throw new AppError(`Insufficient stock in batch ${batch.batchNumber} for product ${product.name}`, 400);
        }
      }
    }

    // Calcular totais
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const invoiceItems = validatedData.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemSubtotal * item.discount) / 100;
      const itemTotal = itemSubtotal - itemDiscount;

      // Calcular impostos (simplificado - ICMS 18% como exemplo)
      const icms = itemTotal * 0.18;
      totalTax += icms;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: itemSubtotal,
        total: itemTotal,
        batchId: item.batchId,
        icms,
        cfop: validatedData.cfop || '5405',
      };
    });

    const total = subtotal - totalDiscount + totalTax;

    // Criar nota fiscal em transação
    const invoice = await prismaMaster.$transaction(async (tx) => {
      // Criar a nota fiscal
      const createdInvoice = await tx.invoice.create({
        data: {
          number: Math.floor(Date.now() % 1000000000),
          series: 1,
          customerId: validatedData.customerId,
          userId,
          invoiceType: operationTypeMap[validatedData.operationType] || InvoiceType.EXIT,
          issueDate: new Date(),
          totalValue: total.toString(),
          status: InvoiceStatus.DRAFT, // Rascunho inicial
          xmlContent: JSON.stringify({
            cfop: validatedData.cfop || '5405',
            naturezaOperacao: validatedData.naturezaOperacao || 'VENDA DE MERCADORIA PARA TERCEIROS',
            paymentMethod: validatedData.paymentMethod,
            installments: validatedData.installments,
            observations: validatedData.observations,
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
          })
        }
      });

      // Criar os itens da nota fiscal
      const invoiceItemsData = validatedData.items.map(item => ({
        invoiceId: createdInvoice.id,
        productId: item.productId,
        batchId: item.batchId!,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: (item.quantity * item.unitPrice * (1 - item.discount / 100)).toString(),
        discount: item.discount.toString(),
        cfop: validatedData.cfop || '5405',
        ncm: '3003.90.00', // Default NCM for pharmaceuticals
        icmsCst: '00',
        icmsRate: '18.00'
      }));

      await tx.invoiceItem.createMany({
        data: invoiceItemsData
      });

      // Buscar a nota fiscal com os itens criados
      const completeInvoice = await tx.invoice.findUnique({
        where: { id: createdInvoice.id },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              cnpjCpf: true,
              email: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        }
      });

      // Registrar log de auditoria
      await auditLog({
        tenantId,
        userId,
        tableName: 'Invoice',
        recordId: createdInvoice.id,
        operation: 'CREATE',
        newData: {
          invoiceNumber: createdInvoice.number,
          customer: completeInvoice?.customer?.companyName,
          total: createdInvoice.totalValue,
          items: invoiceItemsData.length
        }
      });

      return completeInvoice;
    });

    logger.info(`Invoice ${invoice!.number} created as draft`, {
      tenantId,
      userId,
      invoiceId: invoice!.id,
      total: invoice!.totalValue
    });

    res.status(201).json(invoice);

  } catch (error) {
    next(error);
  }
});

// Emitir nota fiscal (NF-e)
router.post('/:id/emit', requirePermissions([PERMISSIONS.NFE_ISSUE]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;
    const userId = req.user!.userId;

    // Buscar nota fiscal com todos os dados necessários
    const invoice = await prismaMaster.invoice.findFirst({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            batch: true
          }
        },
        user: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'DRAFT') {
      throw new AppError('Only draft invoices can be emitted', 400);
    }

    // Preparar dados para NF-e
    const subtotal = invoice.items.reduce((sum, it) => sum + Number(it.totalPrice), 0);
    const discount = invoice.items.reduce((sum, it) => sum + Number(it.discount), 0);
    const total = Number(invoice.totalValue);
    const tax = total * 0.18;
    const nfeData = {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.number.toString(),
        operationType: 'SAIDA',
        cfop: invoice.items[0]?.cfop || '5405',
        naturezaOperacao: 'VENDA DE MERCADORIA PARA TERCEIROS',
        paymentMethod: 'billet',
        installments: 1,
        observations: undefined,
        subtotal,
        discount,
        tax,
        total,
        createdAt: invoice.issueDate,
      },
      issuer: {
        cnpj: req.tenant!.cnpj,
        name: req.tenant!.name,
        stateRegistration: '',
        municipalRegistration: undefined,
        address: '',
        phone: undefined,
        email: undefined,
      },
      customer: {
        id: invoice.customer?.id,
        name: invoice.customer?.companyName,
        cnpjCpf: invoice.customer?.cnpjCpf,
        email: invoice.customer?.email,
        phone: invoice.customer?.phone,
        address: invoice.customer?.address,
        stateRegistration: undefined,
        municipalRegistration: undefined,
        customerType: invoice.customer?.customerType,
      },
      items: invoice.items.map((item) => ({
        id: item.id,
        product: {
          id: item.productId,
          name: item.product.name,
          ncm: item.ncm || '3003.90.00',
          unit: 'UN',
          cfop: item.cfop,
        },
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        subtotal: Number(item.totalPrice),
        total: Number(item.totalPrice),
        icms: Number(item.totalPrice) * 0.18,
        batch: item.batch ? {
          id: item.batch.id,
          batchNumber: item.batch.batchNumber,
          expirationDate: item.batch.expirationDate,
          manufacturingDate: item.batch.manufactureDate || undefined,
        } : undefined,
      })),
    } as any;

    // Emitir NF-e usando o serviço (passa tenantId para buscar perfil fiscal)
    const nfeResult = await nfeService.emitNFe(nfeData, tenantId);

    // Atualizar nota fiscal com dados da NF-e
    const updatedInvoice = await prismaMaster.$transaction(async (tx) => {
      // Atualizar invoice com dados da NF-e
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: nfeResult.status === 'authorized' ? 'AUTHORIZED' : 'DENIED',
          accessKey: nfeResult.accessKey,
          protocol: nfeResult.protocolNumber,
          authorizationDate: nfeResult.authorizationDate,
          xmlContent: nfeResult.xmlContent
        }
      });

      // Buscar a nota fiscal atualizada
      const fullInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              cnpjCpf: true,
              email: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        }
      });

      // Atualizar estoque (reduzir quantidades)
      const invoiceItems = await tx.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
        include: { batch: true }
      });
      
      for (const item of invoiceItems) {
        if (item.batchId) {
          // Reduzir estoque do lote específico
          await tx.stock.updateMany({
            where: {
              productId: item.productId,
              batchId: item.batchId
            },
            data: {
              availableQuantity: {
                decrement: item.quantity
              }
            }
          });
        } else {
          // Reduzir estoque geral (FIFO - First In, First Out)
          const stocks = await tx.stock.findMany({
            where: {
              productId: item.productId,
              availableQuantity: { gt: 0 }
            },
            orderBy: { createdAt: 'asc' }
          });

          let remainingQuantity = item.quantity;
          for (const stock of stocks) {
            if (remainingQuantity <= 0) break;
            
            const quantityToReduce = Math.min(remainingQuantity, stock.availableQuantity);
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                availableQuantity: {
                  decrement: quantityToReduce
                }
              }
            });
            remainingQuantity -= quantityToReduce;
          }
        }

        // Registrar movimentação de estoque
        const stock = await tx.stock.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId
          }
        });

        if (stock) {
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              userId,
              movementType: MovementType.EXIT,
              quantity: item.quantity,
              previousBalance: stock.availableQuantity,
              newBalance: stock.availableQuantity - item.quantity,
              reason: 'Invoice emission',
              referenceDocument: invoice.id
            }
          });
        }
      }

      // Registrar log de auditoria
      await auditLog({
        tenantId,
        userId,
        tableName: 'Invoice',
        recordId: fullInvoice!.id,
        operation: 'EMIT',
        newData: {
          invoiceNumber: fullInvoice!.number,
          customer: fullInvoice!.customer?.companyName,
          total: fullInvoice!.totalValue,
          accessKey: nfeResult.accessKey,
          protocol: nfeResult.protocolNumber,
        }
      });

      return fullInvoice!;
    });

    logger.info(`Invoice ${updatedInvoice.number} emitted successfully`, {
      tenantId,
      userId,
      invoiceId: updatedInvoice.id,
      accessKey: nfeResult.accessKey,
      protocolNumber: nfeResult.protocolNumber,
    });

    res.json(updatedInvoice);

  } catch (error) {
    next(error);
  }
});

// Cancelar nota fiscal
router.post('/:id/cancel', requirePermissions([PERMISSIONS.NFE_CANCEL]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = cancelInvoiceSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    const userId = req.user!.userId;

    // Buscar nota fiscal
    const invoice = await prismaMaster.invoice.findFirst({ where: { id } });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'AUTHORIZED') {
      throw new AppError('Only authorized invoices can be cancelled', 400);
    }

    if (!invoice.accessKey) {
      throw new AppError('No NF-e found for this invoice', 400);
    }

    // Cancelar NF-e usando o serviço
    if (!req.user?.tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }
    
    const cancelResult = await nfeService.cancelNFe({
      accessKey: invoice.accessKey,
      protocolNumber: invoice.protocol || '',
      justification: validatedData.justification,
      cnpj: req.tenant!.cnpj,
    }, req.user.tenantId);

    // Atualizar nota fiscal e estoque em transação
    const updatedInvoice = await prismaMaster.$transaction(async (tx) => {
      // Atualizar dados da nota fiscal com cancelamento
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          protocol: cancelResult.protocolNumber,
          xmlContent: JSON.stringify({ cancellationJustification: validatedData.justification })
        }
      });

      // Atualizar status da nota fiscal
      const updated = await tx.invoice.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              cnpjCpf: true
            }
          },
          items: {
            include: {
              product: { select: { id: true, name: true } },
              batch: true
            }
          }
        }
      });

      // Devolver estoque (aumentar quantidades)
      const cancelItems = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
      for (const item of cancelItems) {
        if (item.batchId) {
          // Aumentar estoque do lote específico
          await tx.stock.updateMany({
            where: {
              productId: item.productId,
              batchId: item.batchId
            },
            data: {
              availableQuantity: {
                increment: item.quantity
              }
            }
          });
        } else {
          // Aumentar estoque geral
          await tx.stock.updateMany({
            where: { productId: item.productId },
            data: {
              availableQuantity: {
                increment: item.quantity
              }
            }
          });
        }

        // Registrar movimentação de estorno
        const stock = await tx.stock.findFirst({
          where: { productId: item.productId, batchId: item.batchId }
        });
        if (stock) {
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              userId,
              movementType: 'ENTRY',
              quantity: item.quantity,
              previousBalance: stock.availableQuantity,
              newBalance: stock.availableQuantity + item.quantity,
              reason: 'Invoice cancellation',
              referenceDocument: id
            }
          });
        }
      }

      // Registrar log de auditoria
      await auditLog({
        tenantId,
        userId,
        tableName: 'Invoice',
        recordId: updated!.id,
        operation: 'CANCEL',
        newData: {
          invoiceNumber: updated!.number,
          customer: updated!.customer?.companyName,
          total: updated!.totalValue,
          accessKey: updated!.accessKey,
          cancellationProtocol: cancelResult.protocolNumber,
          justification: validatedData.justification
        }
      });

      return updated;
    });

    logger.info(`Invoice ${updatedInvoice!.number} cancelled successfully`, {
      tenantId,
      userId,
      invoiceId: updatedInvoice!.id,
      accessKey: updatedInvoice!.accessKey,
      cancellationProtocol: cancelResult.protocolNumber,
    });

    res.json(updatedInvoice);

  } catch (error) {
    next(error);
  }
});

// Consultar status da NF-e
router.get('/:id/nfe-status', requirePermissions([PERMISSIONS.INVOICE_READ]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;

    const invoice = await prismaMaster.invoice.findFirst({ where: { id } });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.accessKey) {
      throw new AppError('No NF-e found for this invoice', 400);
    }

    // Consultar status na Sefaz
    if (!req.user?.tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }
    
    const statusResult = await nfeService.consultarStatusNFe(invoice.accessKey, req.user.tenantId);

    // Atualizar status se necessário
    if (statusResult.status !== invoice.status) {
      await prismaMaster.invoice.update({
        where: { id: invoice.id },
        data: { status: statusResult.status as InvoiceStatus }
      });
    }

    res.json({
      accessKey: invoice.accessKey,
      currentStatus: invoice.status,
      sefazStatus: statusResult.status,
      lastConsultation: new Date(),
      details: statusResult.details,
    });

  } catch (error) {
    next(error);
  }
});

// Gerar DANFE (PDF)
router.get('/:id/danfe', requirePermissions([PERMISSIONS.NFE_VIEW_DANFE]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;

    const invoice = await prismaMaster.invoice.findFirst({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            batch: true
          }
        },
        user: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.accessKey || invoice.status !== 'AUTHORIZED') {
      throw new AppError('NF-e must be authorized to generate DANFE', 400);
    }

    // Gerar DANFE usando o serviço
    const subtotal = invoice.items.reduce((sum, it) => sum + Number(it.totalPrice), 0);
    const discount = invoice.items.reduce((sum, it) => sum + Number(it.discount), 0);
    const total = Number(invoice.totalValue);
    const danfePdf = await nfeService.generateDANFE({
      id: invoice.id,
      customer: {
        name: invoice.customer?.companyName,
        cnpjCpf: invoice.customer?.cnpjCpf
      },
      items: invoice.items.map(it => ({
        product: { name: it.product.name, unit: 'UN' },
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        total: Number(it.totalPrice)
      })),
      nfe: { accessKey: invoice.accessKey, protocolNumber: invoice.protocol },
      tenant: { name: req.tenant!.name, cnpj: req.tenant!.cnpj, stateRegistration: '' },
      invoice: {
        invoiceNumber: invoice.number.toString(),
        subtotal,
        discount,
        total,
        createdAt: invoice.issueDate
      }
    });

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="danfe-${invoice.accessKey}.pdf"`);
    res.send(danfePdf);

  } catch (error) {
    next(error);
  }
});

// Download XML autorizado
router.get('/:id/xml', requirePermissions([PERMISSIONS.NFE_VIEW_DANFE]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;

    const invoice = await prismaMaster.invoice.findFirst({
      where: { id },
      select: {
        id: true,
        accessKey: true,
        status: true,
        xmlContent: true,
        number: true,
        series: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.accessKey || invoice.status !== 'AUTHORIZED') {
      throw new AppError('NF-e must be authorized to download XML', 400);
    }

    if (!invoice.xmlContent) {
      throw new AppError('XML content not available', 404);
    }

    // Log do acesso ao XML
    logger.info('XML downloaded', {
      tenantId,
      userId: req.user?.userId,
      invoiceId: invoice.id,
      accessKey: invoice.accessKey
    });

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="NFe-${invoice.accessKey}.xml"`);
    res.send(invoice.xmlContent);

  } catch (error) {
    next(error);
  }
});

export default router;