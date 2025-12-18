import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { hashPassword } from '../services/auth.service.js';
import { config } from '../config/environment.js';
import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

async function run() {
  const DEMO_CNPJ = '12345678000195';
  const TARGET_EMAIL = 'admin@farmaciademo.com.br';
  const PASSWORD = 'admin123';

  logger.info('Iniciando correção de usuário admin demo', { DEMO_CNPJ, TARGET_EMAIL });

  const tenant = await prismaMaster.tenant.findFirst({ where: { cnpj: DEMO_CNPJ } });
  if (!tenant) {
    logger.error('Tenant demo não encontrado');
    process.exit(1);
  }

  const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
  const tenantPrisma = new PrismaClientRuntime({ datasources: { db: { url: tenantDbUrl } } });

  // Verifica se já existe usuário com email alvo
  let user = await tenantPrisma.user.findUnique({ where: { email: TARGET_EMAIL } });

  if (!user) {
    // Verificar se existe admin com email antigo para atualizar
    const legacyEmails = ['admin@farmaciademo.com', 'admin@medmanager.com.br'];
    for (const legacy of legacyEmails) {
      const legacyUser = await tenantPrisma.user.findUnique({ where: { email: legacy } });
      if (legacyUser) {
        logger.info('Atualizando email de usuário admin legacy', { from: legacy, to: TARGET_EMAIL });
        user = await tenantPrisma.user.update({ where: { email: legacy }, data: { email: TARGET_EMAIL } });
        break;
      }
    }
  }

  if (!user) {
    logger.info('Criando novo usuário admin demo com email alvo');
    user = await tenantPrisma.user.create({
      data: {
        email: TARGET_EMAIL,
        name: 'Administrador Demo',
        password: await hashPassword(PASSWORD),
        role: 'ADMIN',
        isActive: true,
        permissions: '[]'
      }
    });
  } else {
    logger.info('Reforçando senha do usuário admin demo');
    await tenantPrisma.user.update({ where: { email: TARGET_EMAIL }, data: { password: await hashPassword(PASSWORD), isActive: true } });
  }

  logger.info('Usuário admin demo pronto', { email: TARGET_EMAIL });
  await tenantPrisma.$disconnect();
  await prismaMaster.$disconnect();
}

run().catch(err => {
  logger.error('Falha no script de correção demo', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
