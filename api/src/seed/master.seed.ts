import { prismaMaster } from '../lib/prisma.js';
import { hashPassword } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

/**
 * Script de seed para popular o banco com dados iniciais
 */
async function seed() {
  try {
    logger.info('Starting database seed...');

    // Verificar se já existem tenants no banco
    const existingTenants = await prismaMaster.tenant.count();
    if (existingTenants > 0) {
      logger.info(`Database already contains ${existingTenants} tenants. Skipping seed.`);
      return;
    }

    // Criar tenant master (distribuidora principal)
    const masterTenant = await prismaMaster.tenant.create({
      data: {
        name: 'MedManager Master',
        cnpj: '12345678000195',
        databaseName: 'tenant_master',
        databaseUser: 'tenant_master',
        databasePassword: 'master123',
        plan: 'enterprise',
        status: 'active',
        metadata: JSON.stringify({
          address: 'Av. Principal, 1000',
          city: 'São Paulo',
          state: 'SP',
          phone: '11 3000-0000',
          email: 'contato@medmanager.com.br'
        })
      }
    });

    logger.info(`Created master tenant: ${masterTenant.name} (${masterTenant.cnpj})`);

    // Criar tenant de demonstração
    const demoTenant = await prismaMaster.tenant.create({
      data: {
        name: 'Farmácia Demo',
        cnpj: '98765432000195',
        databaseName: 'tenant_demo',
        databaseUser: 'tenant_demo',
        databasePassword: 'demo123',
        plan: 'professional',
        status: 'active',
        metadata: JSON.stringify({
          address: 'R. das Flores, 500',
          city: 'Rio de Janeiro',
          state: 'RJ',
          phone: '21 4000-0000',
          email: 'demo@farmaciademo.com.br'
        })
      }
    });

    logger.info(`Created demo tenant: ${demoTenant.name} (${demoTenant.cnpj})`);

    // Criar tenant starter
    const starterTenant = await prismaMaster.tenant.create({
      data: {
        name: 'Drogaria Local',
        cnpj: '11223344000155',
        databaseName: 'tenant_starter',
        databaseUser: 'tenant_starter',
        databasePassword: 'starter123',
        plan: 'starter',
        status: 'active',
        metadata: JSON.stringify({
          address: 'R. Central, 123',
          city: 'Belo Horizonte',
          state: 'MG',
          phone: '31 5000-0000',
          email: 'contato@drogariastarter.com.br'
        })
      }
    });

    logger.info(`Created starter tenant: ${starterTenant.name} (${starterTenant.cnpj})`);

    logger.info('Database seed completed successfully!');

  } catch (error) {
    logger.error('Error during database seed:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o seed automaticamente
seed()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });

export { seed };