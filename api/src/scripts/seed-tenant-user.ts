import { prismaMaster } from '../lib/prisma.js';
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../services/auth.service.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

async function seedTenantUser() {
  const TENANT_CNPJ = process.env.TENANT_CNPJ || '12.345.678/0001-55';
  const EMAIL = process.env.USER_EMAIL || 'user@tenantdemo.com';
  const PASSWORD = process.env.USER_PASSWORD || 'tenant123';
  const NAME = process.env.USER_NAME || 'Tenant Demo User';
  const ROLE = (process.env.USER_ROLE as UserRole) || UserRole.ADMIN;

  try {
    logger.info(`Finding tenant by CNPJ: ${TENANT_CNPJ}`);
    const onlyDigits = TENANT_CNPJ.replace(/\D/g, '');
    const tenant = await prismaMaster.tenant.findFirst({
      where: { OR: [{ cnpj: TENANT_CNPJ }, { cnpj: onlyDigits }], status: 'active' }
    });

    if (!tenant) {
      throw new Error('Tenant not found or inactive');
    }

    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`) } }
    });

    const existing = await tenantPrisma.user.findUnique({ where: { email: EMAIL.toLowerCase() } });
    if (existing) {
      logger.info('Tenant user already exists');
      console.log(JSON.stringify({ tenant: tenant.name, email: existing.email, id: existing.id }));
      await tenantPrisma.$disconnect();
      return;
    }

    const user = await tenantPrisma.user.create({
      data: {
        email: EMAIL.toLowerCase(),
        name: NAME,
        password: await hashPassword(PASSWORD),
        role: ROLE,
        isActive: true,
        permissions: '[]'
      }
    });

    await tenantPrisma.$disconnect();
    logger.info('Tenant user created');
    console.log(JSON.stringify({ tenant: tenant.name, email: user.email, id: user.id }));
  } catch (error) {
    logger.error('Error seeding tenant user:', error);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

if (process.argv[1]?.toLowerCase().endsWith('seed-tenant-user.js')) {
  seedTenantUser();
}

export { seedTenantUser };
