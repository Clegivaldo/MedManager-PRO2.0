import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

/**
 * Script para criar bancos de dados específicos de cada tenant usando Prisma
 */
async function createTenantDatabases() {
  try {
    logger.info('Creating tenant-specific databases...');

    // Buscar todos os tenants
    const tenants = await prismaMaster.tenant.findMany({
      where: { status: 'active' }
    });

    for (const tenant of tenants) {
      try {
        logger.info(`Creating database for tenant: ${tenant.name} (${tenant.cnpj})`);
        
        // Criar banco de dados e usuário diretamente via SQL
        await prismaMaster.$executeRawUnsafe(`
          DO $$
          BEGIN
            -- Criar usuário se não existir
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${tenant.databaseUser}') THEN
              CREATE USER ${tenant.databaseUser} WITH PASSWORD '${tenant.databasePassword}';
            END IF;
            
            -- Criar banco de dados se não existir
            IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${tenant.databaseName}') THEN
              CREATE DATABASE ${tenant.databaseName} OWNER ${tenant.databaseUser};
            END IF;
            
            -- Conceder privilégios
            GRANT ALL PRIVILEGES ON DATABASE ${tenant.databaseName} TO ${tenant.databaseUser};
          END
          $$;
        `);
        
        logger.info(`Created database and user for tenant: ${tenant.name}`);
        
      } catch (error) {
        logger.error(`Error creating database for tenant ${tenant.name}:`, error);
        // Continuar com os próximos tenants mesmo se um falhar
      }
    }

    logger.info('Tenant database creation completed!');

  } catch (error) {
    logger.error('Error during tenant database creation:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
createTenantDatabases()
  .then(() => {
    console.log('✅ Tenant database creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tenant database creation failed:', error);
    process.exit(1);
  });