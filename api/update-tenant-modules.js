import { PrismaClient } from '@prisma/client';

const prismaMaster = new PrismaClient();

async function updateTenantModules() {
  try {
    console.log('🔧 Atualizando módulos dos tenants...');
    
    const modules = [
      'DASHBOARD',
      'PRODUCTS',
      'NFE',
      'INVENTORY',
      'WAREHOUSE',
      'TEMPERATURE',
      'SALES',
      'FINANCIAL',
      'AUDIT'
    ];

    const tenants = await prismaMaster.tenant.findMany({
      select: { id: true, name: true, cnpj: true }
    });

    for (const tenant of tenants) {
      await prismaMaster.tenant.update({
        where: { id: tenant.id },
        data: { modulesEnabled: modules }
      });
      console.log(`✅ Tenant ${tenant.name} (${tenant.cnpj}) atualizado`);
    }

    console.log(`\n✨ ${tenants.length} tenants atualizados com sucesso!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar tenants:', error);
    process.exit(1);
  } finally {
    await prismaMaster.$disconnect();
  }
}

updateTenantModules();
