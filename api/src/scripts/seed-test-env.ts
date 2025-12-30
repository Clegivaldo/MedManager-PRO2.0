import { prismaMaster } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';
import { createTenantDatabase, getTenantPrismaLegacy } from '../lib/prisma.js';
import { config } from '../config/environment.js';
import { exec } from 'child_process';
import { PERMISSIONS } from '../middleware/permissions.js';

/**
 * Seed mínimo para ambiente de testes E2E NF-e.
 */
export async function seedTestEnvironment(): Promise<void> {
  const tenants = [
    { cnpj: '12345678000195', name: 'Farmácia Demo', adminEmail: 'admin@farmaciademo.com.br' },
    { cnpj: '12345678000155', name: 'Tenant Demo', adminEmail: 'admin@medmanager.com.br' }
  ];

  const plan = await prismaMaster.plan.upsert({
    where: { name: 'starter' },
    update: {},
    create: {
      name: 'starter',
      displayName: 'Starter',
      description: 'Plano inicial para testes',
      priceMonthly: 99.0,
      maxUsers: 10,
      maxProducts: 1000,
      maxMonthlyTransactions: 1000,
      maxStorageGb: 5,
      maxApiCallsPerMinute: 120,
      features: ['DASHBOARD', 'PRODUCTS', 'STOCK', 'NFE']
    }
  });

  for (const t of tenants) {
    const dbName = `tenant_${t.cnpj}`;
    const dbUser = `user_${t.cnpj}`;
    const dbPass = `pass_${t.cnpj}`;
    const existingByDb = await prismaMaster.tenant.findFirst({ where: { databaseName: dbName } });

    const tenant = existingByDb || await prismaMaster.tenant.upsert({
      where: { cnpj: t.cnpj },
      update: {
        databaseName: dbName,
        databaseUser: dbUser,
        databasePassword: dbPass,
        plan: 'starter',
        modulesEnabled: ['DASHBOARD', 'PRODUCTS', 'NFE', 'INVENTORY', 'WAREHOUSE', 'TEMPERATURE', 'SALES', 'FINANCIAL', 'AUDIT']
      },
      create: {
        name: t.name,
        cnpj: t.cnpj,
        databaseName: dbName,
        databaseUser: dbUser,
        databasePassword: dbPass,
        plan: 'starter',
        status: 'active',
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscriptionStatus: 'active',
        modulesEnabled: ['DASHBOARD', 'PRODUCTS', 'NFE', 'INVENTORY', 'WAREHOUSE', 'TEMPERATURE', 'SALES', 'FINANCIAL', 'AUDIT'],
        paymentGateway: 'asaas'
      }
    });

    if (!config.DATABASE_URL.startsWith('file:')) {
      try {
        await createTenantDatabase(dbName, dbUser, dbPass);
      } catch (e) {
        logger.warn('createTenantDatabase skipped/failed', { dbName, error: (e as Error).message });
      }
      try {
        await new Promise<void>((resolve, reject) => {
          const url = `postgresql://${dbUser}:${dbPass}@localhost:5432/${dbName}`;
          const child = exec(`npx cross-env DATABASE_URL=${url} prisma migrate deploy`, { cwd: process.cwd() });
          child.stdout?.on('data', d => logger.info('migrate stdout', { dbName, data: d.toString() }));
          child.stderr?.on('data', d => logger.error('migrate stderr', { dbName, data: d.toString() }));
          child.on('exit', code => code === 0 ? resolve() : reject(new Error(`migrate exit code ${code}`)));
          child.on('error', reject);
        });
        logger.info('Migrations applied', { dbName });
      } catch (e) {
        logger.error('Migration failed', { dbName, error: (e as Error).message });
      }
    }

    const tenantPrisma = getTenantPrismaLegacy({ databaseName: dbName, databaseUser: dbUser, databasePassword: dbPass });
    const passwordHash = await bcrypt.hash('admin123', 10);
    await tenantPrisma.user.upsert({
      where: { email: t.adminEmail },
      update: {
        // Garantimos credenciais padronizadas para os testes E2E
        password: passwordHash,
        permissions: JSON.stringify(Object.values(PERMISSIONS)),
        isActive: true,
        name: 'Admin Demo'
      },
      create: {
        email: t.adminEmail,
        name: 'Admin Demo',
        password: passwordHash,
        role: 'MASTER',
        permissions: JSON.stringify(Object.values(PERMISSIONS)),
        isActive: true
      }
    });
    // Limpeza defensiva para evitar P2002 ao repetir seeds em modo watch
    await tenantPrisma.customer.deleteMany({ where: { cnpjCpf: '12345678901234' } });
    await tenantPrisma.customer.upsert({
      where: { cnpjCpf: '12345678901234' },
      update: {},
      create: {
        cnpjCpf: '12345678901234',
        companyName: 'Cliente E2E',
        tradeName: 'Cliente E2E',
        customerType: 'business',
        address: { street: 'Rua Teste', number: '1', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
        phone: '11999999999',
        email: 'cliente@example.com',
        isActive: true
      }
    });
    const product = await tenantPrisma.product.upsert({
      where: { internalCode: 'E2E-PRD-001' },
      update: {},
      create: {
        internalCode: 'E2E-PRD-001',
        name: 'Produto E2E',
        gtin: '7890000000000',
        productType: 'COMMON',
        storage: { temp: '15-25C' },
        isControlled: false,
        stripe: 'NONE',
        isActive: true
      }
    });
    await tenantPrisma.batch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: 'E2E-LOT-1' } },
      update: {},
      create: {
        productId: product.id,
        batchNumber: 'E2E-LOT-1',
        manufacturer: 'Lab Demo',
        quantityEntry: 50,
        quantityCurrent: 50,
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      }
    });
    const existingFiscal = await prismaMaster.tenantFiscalProfile.findUnique({ where: { tenantId: tenant.id } });
    if (!existingFiscal) {
      await prismaMaster.tenantFiscalProfile.create({
        data: {
          tenantId: tenant.id,
          companyName: `${t.name} LTDA`,
          tradingName: t.name,
          cnpj: t.cnpj,
          taxRegime: 'simple_national',
          sefazEnvironment: 'homologacao'
        }
      });
    }
  }
  logger.info('Seed concluído', { tenants: tenants.length });
}

if (process.argv[1]?.endsWith('seed-test-env.ts')) {
  seedTestEnvironment().then(() => process.exit(0)).catch(() => process.exit(1)).finally(() => prismaMaster.$disconnect());
}