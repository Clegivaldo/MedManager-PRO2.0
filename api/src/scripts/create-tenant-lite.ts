import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

async function createTenantLite() {
  try {
    const name = process.env.TENANT_NAME || 'Tenant Demo';
    const cnpj = process.env.TENANT_CNPJ || '12.345.678/0001-55';
    const plan = (process.env.TENANT_PLAN || 'starter') as 'starter' | 'professional' | 'enterprise';

    logger.info(`Creating lite tenant record: ${name} (${cnpj})`);

    const existing = await prismaMaster.tenant.findUnique({ where: { cnpj } });
    if (existing) {
      logger.info('Tenant already exists');
      console.log(JSON.stringify({ id: existing.id, cnpj: existing.cnpj, name: existing.name }));
      return;
    }

    const tenant = await prismaMaster.tenant.create({
      data: {
        name,
        cnpj,
        plan,
        status: 'active',
        databaseName: 'tenant_demo',
        databaseUser: 'tenant_demo',
        databasePassword: 'demo123',
        metadata: { email: 'contato@tenantdemo.com' }
      }
    });

    logger.info('Lite tenant created');
    console.log(JSON.stringify({ id: tenant.id, cnpj: tenant.cnpj, name: tenant.name }));
  } catch (error) {
    logger.error('Error creating lite tenant:', error);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

if (process.argv[1]?.toLowerCase().endsWith('create-tenant-lite.js')) {
  createTenantLite();
}
