import { prismaMaster } from '../lib/prisma.js';
import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { hashPassword } from '../services/auth.service.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

async function fixTenantUserPassword() {
  try {
    const TENANT_CNPJ = '12345678000195';
    const EMAIL = 'admin@farmaciademo.com.br';
    const NEW_PASSWORD = 'admin123';

    logger.info(`Finding tenant by CNPJ: ${TENANT_CNPJ}`);
    const tenant = await prismaMaster.tenant.findFirst({
      where: { cnpj: TENANT_CNPJ, status: 'active' }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const tenantPrisma = new PrismaClientRuntime({
      datasources: { db: { url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`) } }
    });

    const user = await tenantPrisma.user.findUnique({ where: { email: EMAIL } });
    
    if (!user) {
      logger.info('User not found, nothing to update');
      await tenantPrisma.$disconnect();
      return;
    }

    const hashedPassword = await hashPassword(NEW_PASSWORD);
    
    await tenantPrisma.user.update({
      where: { email: EMAIL },
      data: { password: hashedPassword }
    });

    await tenantPrisma.$disconnect();
    logger.info(`Password updated for user: ${EMAIL}`);
    console.log(`✅ Password updated successfully for ${EMAIL}`);
  } catch (error) {
    logger.error('Error fixing tenant user password:', error);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

fixTenantUserPassword();
