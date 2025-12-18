import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { prismaMaster } from '../lib/prisma.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

async function main() {
  const cnpj = process.env.DEMO_CNPJ || '12345678000195';
  try {
    const tenant = await prismaMaster.tenant.findFirst({ where: { cnpj } });
    if (!tenant) {
      console.log('Tenant não encontrado para CNPJ', cnpj);
      process.exitCode = 1;
      return;
    }
    const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
    const tenantPrisma = new PrismaClientRuntime({ datasources: { db: { url: tenantDbUrl } } });
    const users = await tenantPrisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isActive: true, password: true } });
    console.log(`Usuários do tenant ${tenant.name} (${tenant.cnpj}) - database ${tenant.databaseName}:`);
    users.forEach(u => console.log(u));
    await tenantPrisma.$disconnect();
  } catch (e) {
    logger.error('Falha ao listar usuários do tenant demo', e as any);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

main();