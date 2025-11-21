import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

async function main() {
  try {
    const cnpj = process.env.DEMO_CNPJ || '12345678000195';
    const tenant = await prismaMaster.tenant.findFirst({ where: { cnpj } });
    if (!tenant) {
      console.log('Tenant não encontrado para CNPJ', cnpj);
      return;
    }
    console.log('Dados do tenant demo:\n');
    console.log({
      id: tenant.id,
      name: tenant.name,
      cnpj: tenant.cnpj,
      plan: tenant.plan,
      status: tenant.status,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionEnd: tenant.subscriptionEnd,
      databaseName: tenant.databaseName,
      databaseUser: tenant.databaseUser,
    });
  } catch (e) {
    logger.error('Falha ao exibir tenant demo', e as any);
    process.exitCode = 1;
  } finally {
    await prismaMaster.$disconnect();
  }
}

main();