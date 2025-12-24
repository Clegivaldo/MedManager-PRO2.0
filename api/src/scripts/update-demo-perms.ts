import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { prismaMaster } from '../lib/prisma.js';
import { config } from '../config/environment.js';
import { PERMISSIONS } from '../middleware/permissions.js';

async function run() {
  const cnpj = '12345678000195';
  const email = 'admin@farmaciademo.com.br';

  const tenant = await prismaMaster.tenant.findFirst({ where: { cnpj } });
  if (!tenant) throw new Error('Tenant not found');

  const tenantUrl = config.DATABASE_URL.replace(/\/[^/]+$/, `/${tenant.databaseName}`);
  const prisma = new PrismaClientRuntime({ datasources: { db: { url: tenantUrl } } });

  const perms = JSON.stringify(Object.values(PERMISSIONS));

  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: 'MASTER',
      permissions: perms,
      isActive: true,
    },
  });

  console.log('✅ Demo user permissions updated', { email: updated.email, role: updated.role });
  await prisma.$disconnect();
  await prismaMaster.$disconnect();
}

run().catch(async (err) => {
  console.error('❌ Failed to update demo permissions', err);
  await prismaMaster.$disconnect();
  process.exit(1);
});
