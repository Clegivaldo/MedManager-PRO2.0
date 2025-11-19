import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

async function seedBasic() {
  try {
    logger.info('Seeding basic data (customer, product, batch, stock)...');

    // Create or get a customer
    const customer = await prismaMaster.customer.upsert({
      where: { cnpjCpf: '12.345.678/0001-99' },
      update: {},
      create: {
        cnpjCpf: '12.345.678/0001-99',
        companyName: 'Cliente Teste LTDA',
        tradeName: 'Cliente Teste',
        customerType: 'business',
        address: {
          street: 'Rua Exemplo',
          number: '123',
          city: 'São Paulo',
          state: 'SP',
          zip: '01000-000'
        },
        phone: '(11) 99999-0000',
        email: 'compras@cliente.com.br',
        isActive: true
      }
    });

    // Create or get a product
    const product = await prismaMaster.product.upsert({
      where: { internalCode: 'PRD-001' },
      update: {},
      create: {
        internalCode: 'PRD-001',
        name: 'Medicamento A 500mg',
        gtin: '7891234567890',
        productType: 'COMMON',
        storage: 'temperature range 2-8C',
        isControlled: false,
        stripe: 'NONE',
        isActive: true
      }
    });

    // Create a batch
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const batch = await prismaMaster.batch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: 'Lote-001' } },
      update: {},
      create: {
        productId: product.id,
        batchNumber: 'Lote-001',
        manufacturer: 'Lab Exemplo',
        quantityEntry: 100,
        quantityCurrent: 100,
        expirationDate: nextYear
      }
    });

    // Create stock for batch
    await prismaMaster.stock.upsert({
      where: { productId_batchId: { productId: product.id, batchId: batch.id } },
      update: { availableQuantity: 100 },
      create: {
        productId: product.id,
        batchId: batch.id,
        availableQuantity: 100,
        reservedQuantity: 0,
        location: 'A1-01'
      }
    });

    logger.info('Seed completed:', { customerId: customer.id, productId: product.id, batchId: batch.id });
    console.log(JSON.stringify({ customerId: customer.id, productId: product.id, batchId: batch.id }));
  } catch (error) {
    logger.error('Seed error:', error);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executa somente quando rodado diretamente via `node dist/scripts/seed-basic.js`
if (process.argv[1]?.toLowerCase().endsWith('seed-basic.js')) {
  seedBasic();
}
