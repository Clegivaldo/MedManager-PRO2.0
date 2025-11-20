import { prismaMaster } from './src/lib/prisma.js';

async function checkTenants() {
  const tenants = await prismaMaster.tenant.findMany({
    where: {
      OR: [
        { cnpj: { contains: '123456780001' } },
        { name: { contains: 'Demo' } }
      ]
    }
  });

  console.log('📋 Tenants encontrados:\n');
  tenants.forEach(t => {
    console.log(`ID: ${t.id}`);
    console.log(`Nome: ${t.name}`);
    console.log(`CNPJ: ${t.cnpj}`);
    console.log(`Status: ${t.status}`);
    console.log(`Subscription Status: ${t.subscriptionStatus}`);
    console.log(`Subscription End: ${t.subscriptionEnd}`);
    console.log('---');
  });

  await prismaMaster.$disconnect();
}

checkTenants().catch(console.error);
