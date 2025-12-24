import pkg from '@prisma/client';
const { PrismaClient } = pkg as any;

// Dados do tenant demo (extraídos via verify-by-id.ts)
const TENANT_DB_NAME = 'medmanager_tenant_demo';
const TENANT_DB_USER = 'tenant_demo_user';
const TENANT_DB_PASS = 'tenant_demo_pass_123';
const DATABASE_URL = `postgresql://${TENANT_DB_USER}:${TENANT_DB_PASS}@localhost:5432/${TENANT_DB_NAME}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  console.log('Seeding demo tenant data (customer, product, batch, quote)...');

  const customer = await prisma.customer.upsert({
    where: { cnpjCpf: '11111111000191' },
    update: {},
    create: {
      cnpjCpf: '11111111000191',
      companyName: 'Cliente Quote Demo LTDA',
      tradeName: 'Cliente Quote Demo',
      customerType: 'business',
      address: {
        street: 'Rua das Cotações',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01001000'
      },
      phone: '11999990000',
      email: 'compras+quote@demo.com',
      isActive: true
    }
  });

  const product = await prisma.product.upsert({
    where: { internalCode: 'Q-PRD-001' },
    update: {},
    create: {
      internalCode: 'Q-PRD-001',
      name: 'Produto Orçamento 1',
      gtin: '7899999000001',
      productType: 'COMMON',
      storage: { temp: '15-25C' },
      isControlled: false,
      stripe: 'NONE',
      isActive: true
    }
  });

  const batch = await prisma.batch.upsert({
    where: { productId_batchNumber: { productId: product.id, batchNumber: 'Q-LOT-1' } },
    update: {},
    create: {
      productId: product.id,
      batchNumber: 'Q-LOT-1',
      manufacturer: 'Lab Quote',
      quantityEntry: 100,
      quantityCurrent: 100,
      expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    }
  });

  const quoteNumber = 'Q-0001';
  const quoteTotal = 62.5;

  const existingQuote = await prisma.quote.findUnique({ where: { quoteNumber } });

  let quote;
  if (!existingQuote) {
    quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: customer.id,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        totalAmount: quoteTotal,
        status: 'pending',
        notes: 'Seeded demo quote',
        items: {
          create: [
            {
              productId: product.id,
              quantity: 5,
              unitPrice: 12.5,
              totalPrice: quoteTotal
            }
          ]
        }
      }
    });
  } else {
    quote = await prisma.quote.update({
      where: { id: existingQuote.id },
      data: {
        customerId: customer.id,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        totalAmount: quoteTotal,
        status: 'pending',
        notes: 'Refreshed demo quote',
        items: {
          deleteMany: {},
          create: [
            {
              productId: product.id,
              quantity: 5,
              unitPrice: 12.5,
              totalPrice: quoteTotal
            }
          ]
        }
      }
    });
  }

  console.log('Seed concluído');
  console.log({
    customerId: customer.id,
    productId: product.id,
    batchId: batch.id,
    quoteId: quote.id,
    quoteNumber
  });
}

main()
  .catch(err => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
