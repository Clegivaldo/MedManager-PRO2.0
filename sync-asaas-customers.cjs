const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres123@db:5432/medmanager_master'
    }
  }
});

// IDs dos customers que apareceram nos logs
const customerMapping = [
  { customerId: 'cus_000007245081', cnpj: '11987654000100' }, // MedManager Master
  { customerId: 'cus_000007244969', cnpj: '12345678000195' }, // Farmácia Demo
];

async function syncCustomers() {
  console.log('🔄 Sincronizando customers do Asaas com tenants...\n');

  for (const mapping of customerMapping) {
    const tenant = await prisma.tenant.findUnique({
      where: { cnpj: mapping.cnpj }
    });

    if (!tenant) {
      console.log(`❌ Tenant não encontrado para CNPJ ${mapping.cnpj}`);
      continue;
    }

    const currentMetadata = tenant.metadata || {};
    
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        metadata: {
          ...currentMetadata,
          asaasCustomerId: mapping.customerId
        }
      }
    });

    console.log(`✅ ${tenant.name} (${mapping.cnpj}) → Customer ${mapping.customerId}`);
  }

  console.log('\n✅ Sincronização concluída!');
  await prisma.$disconnect();
}

syncCustomers().catch(console.error);
