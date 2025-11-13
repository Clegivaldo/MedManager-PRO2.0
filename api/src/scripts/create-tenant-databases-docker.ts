import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';

/**
 * Script para criar bancos de dados específicos de cada tenant usando Docker
 */
async function createTenantDatabasesDocker() {
  try {
    logger.info('Creating tenant-specific databases using Docker...');

    // Buscar todos os tenants
    const tenants = await prismaMaster.tenant.findMany({
      where: { status: 'active' }
    });

    for (const tenant of tenants) {
      try {
        logger.info(`Creating database for tenant: ${tenant.name} (${tenant.cnpj})`);
        
        // Criar usuário do PostgreSQL
        try {
          const createUserCmd = `docker exec medmanager-postgres psql -U postgres -d postgres -c "CREATE USER ${tenant.databaseUser} WITH PASSWORD '${tenant.databasePassword}';"`;
          execSync(createUserCmd, { stdio: 'pipe' });
          logger.info(`Created PostgreSQL user: ${tenant.databaseUser}`);
        } catch (error) {
          logger.warn(`User ${tenant.databaseUser} might already exist or error: ${error.message}`);
        }
        
        // Criar banco de dados
        try {
          const createDbCmd = `docker exec medmanager-postgres createdb -U postgres -O ${tenant.databaseUser} ${tenant.databaseName}`;
          execSync(createDbCmd, { stdio: 'pipe' });
          logger.info(`Created database: ${tenant.databaseName}`);
        } catch (error) {
          logger.warn(`Database ${tenant.databaseName} might already exist or error: ${error.message}`);
        }
        
        // Conceder privilégios
        try {
          const grantCmd = `docker exec medmanager-postgres psql -U postgres -d ${tenant.databaseName} -c "GRANT ALL PRIVILEGES ON DATABASE ${tenant.databaseName} TO ${tenant.databaseUser};"`;
          execSync(grantCmd, { stdio: 'pipe' });
          logger.info(`Granted privileges to user ${tenant.databaseUser} on database ${tenant.databaseName}`);
        } catch (error) {
          logger.warn(`Error granting privileges: ${error.message}`);
        }
        
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
createTenantDatabasesDocker()
  .then(() => {
    console.log('✅ Tenant database creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tenant database creation failed:', error);
    process.exit(1);
  });