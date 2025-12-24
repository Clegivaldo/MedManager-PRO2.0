import { prismaMaster } from '../lib/prisma.js';

async function run() {
  const oldCnpj = '98765432000195';
  const newCnpj = '12345678000195';

  const updated = await prismaMaster.tenant.update({
    where: { cnpj: oldCnpj },
    data: {
      cnpj: newCnpj,
      name: 'Farmácia Demo',
      databaseName: 'medmanager_tenant_demo',
      databaseUser: 'tenant_demo_user',
      databasePassword: 'tenant_demo_pass_123',
      status: 'active',
      subscriptionStatus: 'active',
    },
  });

  console.log('✅ Tenant atualizado', {
    id: updated.id,
    cnpj: updated.cnpj,
    name: updated.name,
    db: updated.databaseName,
  });
}

run()
  .catch((err) => {
    console.error('❌ Falhou ao atualizar tenant', err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaMaster.$disconnect();
  });
