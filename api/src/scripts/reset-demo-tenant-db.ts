import { prismaMaster, createTenantDatabase } from '../lib/prisma.js';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

const databaseName = 'medmanager_tenant_demo';
const databaseUser = 'tenant_demo_user';
const databasePassword = 'tenant_demo_pass_123';

async function main() {
  logger.info('Dropping tenant database if exists');
  try {
    await (prismaMaster as any).$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  } catch (e) {
    logger.warn('Drop database failed/ignored', { message: (e as Error).message });
  }
  try {
    await (prismaMaster as any).$executeRawUnsafe(`DROP USER IF EXISTS "${databaseUser}"`);
  } catch (e) {
    logger.warn('Drop user failed/ignored', { message: (e as Error).message });
  }

  logger.info('Creating tenant database and user');
  await createTenantDatabase(databaseName, databaseUser, databasePassword);

  logger.info('Applying migrations to tenant database');
  const url = `postgresql://${databaseUser}:${databasePassword}@localhost:5432/${databaseName}`;
  execSync(`npx cross-env DATABASE_URL=${url} prisma migrate deploy`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  logger.info('Tenant database reset complete');
}

main()
  .catch(err => {
    logger.error('Reset demo tenant failed', err as any);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaMaster.$disconnect();
  });
