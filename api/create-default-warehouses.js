import { PrismaClient } from '@prisma/client';

const prismaMaster = new PrismaClient();

// Função para criar warehouse padrão em cada tenant
async function createDefaultWarehouses() {
  try {
    console.log('🏭 Criando warehouses padrão...');
    
    const tenants = await prismaMaster.tenant.findMany({
      select: {
        id: true,
        name: true,
        cnpj: true,
        databaseName: true,
        databaseUser: true,
        databasePassword: true
      }
    });

    for (const tenant of tenants) {
      try {
        const dbUrl = `postgresql://${tenant.databaseUser}:${tenant.databasePassword}@localhost:5432/${tenant.databaseName}`;
        const tenantPrisma = new PrismaClient({
          datasources: { db: { url: dbUrl } }
        });

        // Verificar se já existe warehouse
        const existingWarehouse = await tenantPrisma.warehouse.findFirst();
        
        if (!existingWarehouse) {
          await tenantPrisma.warehouse.create({
            data: {
              name: 'Armazém Principal',
              code: 'ARM-001',
              description: 'Armazém padrão do sistema',
              address: 'Endereço principal',
              temperatureMin: 15,
              temperatureMax: 25,
              isActive: true
            }
          });
          console.log(`✅ Warehouse criado para ${tenant.name}`);
        } else {
          console.log(`ℹ️  ${tenant.name} já possui warehouse`);
        }

        await tenantPrisma.$disconnect();
      } catch (error) {
        console.error(`❌ Erro ao criar warehouse para ${tenant.name}:`, error.message);
      }
    }

    console.log('\n✨ Processo concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prismaMaster.$disconnect();
  }
}

createDefaultWarehouses();
