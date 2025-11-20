import { prismaMaster } from './api/src/lib/prisma.js';

async function getTenantInfo() {
  try {
    const tenant = await prismaMaster.tenant.findUnique({
      where: { cnpj: '12345678000195' },
      select: { id: true, name: true, cnpj: true, status: true, subscriptionStatus: true, subscriptionEnd: true },
    });

    if (tenant) {
      console.log('Tenant encontrado:');
      console.log(JSON.stringify(tenant, (key, value) => {
        if (key === 'subscriptionEnd' && value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));
    } else {
      console.log('Tenant não encontrado');
      
      console.log('\nTodos os tenants:');
      const allTenants = await prismaMaster.tenant.findMany({
        select: { id: true, name: true, cnpj: true, status: true, subscriptionStatus: true },
      });
      
      allTenants.forEach(t => {
        console.log(`  - ${t.id.substring(0, 8)}... | ${t.name} | ${t.cnpj} | ${t.subscriptionStatus}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaMaster.$disconnect();
  }
}

getTenantInfo();
