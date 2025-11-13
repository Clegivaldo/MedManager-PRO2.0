import { tenantService } from '../services/tenant.service.js';
import { logger } from '../utils/logger.js';
import { prismaMaster } from '../lib/prisma.js';

/**
 * Script para criar bancos de dados individuais para os tenants existentes
 */
async function createTenantDatabases() {
  try {
    logger.info('Starting tenant database creation...');

    // Buscar todos os tenants ativos
    const tenants = await prismaMaster.tenant.findMany({
      where: { status: 'active' }
    });

    logger.info(`Found ${tenants.length} tenants to process`);

    for (const tenant of tenants) {
      try {
        logger.info(`Processing tenant: ${tenant.name} (${tenant.cnpj})`);

        // Criar banco de dados do tenant
        await tenantService.createTenantDatabase(
          tenant.databaseName,
          tenant.databaseUser,
          tenant.databasePassword
        );

        // Executar migrations
        await tenantService.runTenantMigrations(tenant.databaseName);

        // Criar usuário admin padrão
        await tenantService.createDefaultAdminUser(tenant.databaseName, tenant.name);

        logger.info(`Database created successfully for tenant: ${tenant.name}`);
      } catch (error) {
        logger.error(`Error processing tenant ${tenant.name}:`, error);
      }
    }

    logger.info('All tenant databases created successfully!');
  } catch (error) {
    logger.error('Error creating tenant databases:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
if (import.meta.url === `file://${process.argv[1]}`) {
  createTenantDatabases()
    .then(() => {
      console.log('✅ Tenant databases created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error creating tenant databases:', error);
      process.exit(1);
    });
}