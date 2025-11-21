import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { prismaMaster } from '../lib/prisma.js';
import { config } from '../config/environment.js';

async function main() {
  const email = process.env.DEMO_EMAIL || 'admin@farmaciademo.com.br';
  const password = process.env.DEMO_PASSWORD || 'admin123';
  const cnpj = process.env.DEMO_CNPJ || '12345678000195';
  const tenant = await prismaMaster.tenant.findFirst({ where: { cnpj } });
  if (!tenant) {
    console.log('Tenant não encontrado');
    return;
  }
  const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
  const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });
  const user = await tenantPrisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('Usuário não encontrado');
  } else {
    const ok = await bcrypt.compare(password, user.password);
    console.log({ email: user.email, role: user.role, isActive: user.isActive, passwordMatches: ok });
  }
  await tenantPrisma.$disconnect();
  await prismaMaster.$disconnect();
}

main().catch(e => { console.error(e); process.exitCode = 1; });