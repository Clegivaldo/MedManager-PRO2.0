import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';

// Cliente Prisma para o banco master (controle de tenants)
export const prismaMaster = new PrismaClient({
  datasources: {
    db: {
      url: config.DATABASE_URL
    }
  },
  log: config.isDevelopment 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

// Pool de clientes Prisma para tenants (database-per-tenant)
const tenantPrismaPool = new Map<string, PrismaClient>();

/**
 * Interface para configuração de conexão de tenant
 */
interface TenantConnectionConfig {
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
}

/**
 * Cria ou obtém cliente Prisma para um tenant específico
 */
export function getTenantPrisma(conn: TenantConnectionConfig): PrismaClient {
  const { databaseName, databaseUser, databasePassword } = conn;
  const poolKey = `${databaseName}:${databaseUser}`;
  
  // Verificar se já existe no pool
  if (tenantPrismaPool.has(poolKey)) {
    return tenantPrismaPool.get(poolKey)!;
  }
  
  // Criar nova conexão
  let connectionUrl: string;
  
  if (config.isDevelopment && config.DATABASE_URL.startsWith('file:')) {
    // Usar SQLite para desenvolvimento
    connectionUrl = `file:./tenant_${databaseName}.db`;
  } else {
    // Usar PostgreSQL para produção
    connectionUrl = `postgresql://${databaseUser}:${databasePassword}@${config.DATABASE_URL.split('@')[1].split('/')[0]}/${databaseName}`;
  }
  
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl
      }
    },
    log: config.isDevelopment 
      ? ['query', 'error', 'warn'] 
      : ['error']
  });
  
  // Adicionar ao pool
  tenantPrismaPool.set(poolKey, tenantPrisma);
  
  logger.info(`Created new Prisma client for tenant database: ${databaseName}`);
  
  return tenantPrisma;
}

/**
 * Remove cliente Prisma do pool (para cleanup)
 */
export function removeTenantPrisma(databaseName: string, databaseUser: string): void {
  const poolKey = `${databaseName}:${databaseUser}`;
  const client = tenantPrismaPool.get(poolKey);
  
  if (client) {
    client.$disconnect();
    tenantPrismaPool.delete(poolKey);
    logger.info(`Removed Prisma client from pool: ${poolKey}`);
  }
}

/**
 * Desconecta todos os clientes Prisma (para shutdown)
 */
export async function disconnectAllPrisma(): Promise<void> {
  if (shutdownState.hasDisconnected) return;
  shutdownState.hasDisconnected = true;
  logger.info('Disconnecting all Prisma clients...');

  try {
    await prismaMaster.$disconnect();
  } catch (e) {
    logger.warn('Error disconnecting prismaMaster (ignored)', e as any);
  }

  const disconnectPromises = Array.from(tenantPrismaPool.values()).map(client => client.$disconnect());
  await Promise.allSettled(disconnectPromises);
  tenantPrismaPool.clear();

  logger.info('All Prisma clients disconnected');
}

/**
 * Verifica se o banco de dados de um tenant existe e está acessível
 */
export async function validateTenantDatabase(conn: TenantConnectionConfig & { DATABASE_URL?: string }): Promise<boolean> {
  try {
    let connectionUrl: string;
    
    if (config.isDevelopment && conn.DATABASE_URL?.startsWith('file:')) {
      connectionUrl = `file:./tenant_${conn.databaseName}.db`;
    } else {
      connectionUrl = `postgresql://${conn.databaseUser}:${conn.databasePassword}@${conn.DATABASE_URL!.split('@')[1].split('/')[0]}/${conn.databaseName}`;
    }
    
    const testClient = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl
        }
      }
    });
    
    // Testar conexão com uma query simples
    await testClient.$queryRaw`SELECT 1`;
    await testClient.$disconnect();
    
    return true;
  } catch (error) {
    logger.error(`Failed to validate tenant database: ${conn.databaseName}`, error);
    return false;
  }
}

/**
 * Cria banco de dados para um novo tenant
 */
export async function createTenantDatabase(databaseName: string, databaseUser: string, databasePassword: string): Promise<void> {
  try {
    // Criar banco de dados
    await prismaMaster.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    
    // Criar usuário do banco
    await prismaMaster.$executeRawUnsafe(`CREATE USER "${databaseUser}" WITH PASSWORD '${databasePassword}'`);
    
    // Conceder permissões
    await prismaMaster.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${databaseUser}"`);
    
    logger.info(`Created tenant database: ${databaseName} with user: ${databaseUser}`);
  } catch (error) {
    logger.error(`Failed to create tenant database: ${databaseName}`, error);
    throw error;
  }
}

/**
 * Executa migrações no banco de dados de um tenant
 */
export async function migrateTenantDatabase(conn: TenantConnectionConfig & { DATABASE_URL?: string }): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    let connectionUrl: string;
    
    if (config.isDevelopment && conn.DATABASE_URL?.startsWith('file:')) {
      connectionUrl = `file:./tenant_${conn.databaseName}.db`;
    } else {
      connectionUrl = `postgresql://${conn.databaseUser}:${conn.databasePassword}@${conn.DATABASE_URL!.split('@')[1].split('/')[0]}/${conn.databaseName}`;
    }
    
    // Executar migrações do Prisma
    await execAsync(`DATABASE_URL="${connectionUrl}" npx prisma migrate deploy`, {
      cwd: process.cwd()
    });
    
    logger.info(`Migrated tenant database: ${conn.databaseName}`);
  } catch (error) {
    logger.error(`Failed to migrate tenant database: ${conn.databaseName}`, error);
    throw error;
  }
}

// Cleanup no shutdown do processo
const shutdownState = { hasDisconnected: false };

process.on('beforeExit', () => {
  void disconnectAllPrisma();
});

process.on('SIGINT', async () => {
  await disconnectAllPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectAllPrisma();
  process.exit(0);
});