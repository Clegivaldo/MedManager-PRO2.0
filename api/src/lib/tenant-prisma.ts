import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { prismaMaster } from './prisma.js';

/**
 * Pool para reutilizar conexões Prisma por tenant
 */
const tenantPrismaPool = new Map<string, PrismaClientType>();

/**
 * Helper para obter instância Prisma dinâmica baseada em tenant context
 * Retorna master se não houver tenant, tenant-specific caso contrário
 */
export function getTenantPrisma(tenantContext?: any | string): PrismaClientType {
  try {
    if (!tenantContext) {
      logger.debug('[getTenantPrisma] No tenant context, returning prismaMaster');
      return prismaMaster as any;
    }

    // Allow either passing an object ({ databaseName, databaseUser, databasePassword }) or a plain string (databaseName)
    if (typeof tenantContext === 'string') {
      // Se for string, usar apenas databaseName
      const dbName = tenantContext;
      const poolKey = `${dbName}:default`;

      logger.debug(`[getTenantPrisma] String tenant: ${dbName}`);

      if (tenantPrismaPool.has(poolKey)) {
        logger.debug(`[getTenantPrisma] Found in pool: ${poolKey}`);
        return tenantPrismaPool.get(poolKey)!;
      }

      const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${dbName}`);
      logger.debug(`[getTenantPrisma] Creating new Prisma client for ${dbName}`);
      
      const prismaInstance = new PrismaClientRuntime({
        datasources: {
          db: { url: tenantDbUrl }
        }
      });

      tenantPrismaPool.set(poolKey, prismaInstance);
      logger.info(`[getTenantPrisma] Created Prisma client for ${dbName}`);
      return prismaInstance;
    }

    // Se for objeto, usar databaseName, databaseUser e databasePassword
    const dbName = tenantContext.databaseName || tenantContext.id;
    logger.debug(`[getTenantPrisma] Object tenant: ${dbName}, user: ${tenantContext.databaseUser}`);
    
    if (!dbName) {
      logger.warn('[getTenantPrisma] No databaseName or id in tenant context, returning prismaMaster');
      return prismaMaster as any;
    }

    const poolKey = `${dbName}:${tenantContext.databaseUser || 'default'}`;

    // Verificar se já existe no pool
    if (tenantPrismaPool.has(poolKey)) {
      logger.debug(`[getTenantPrisma] Found in pool: ${poolKey}`);
      return tenantPrismaPool.get(poolKey)!;
    }

    // Construir URL com credenciais
    let tenantDbUrl: string;
    
    if (tenantContext.databaseUser && tenantContext.databasePassword) {
      // URL com credenciais de banco customizadas
      const masterUrl = new URL(config.DATABASE_URL);
      tenantDbUrl = `${masterUrl.protocol}//${tenantContext.databaseUser}:${tenantContext.databasePassword}@${masterUrl.host}/${dbName}`;
      logger.debug(`[getTenantPrisma] Using custom credentials for ${dbName}`);
    } else {
      // URL padrão (substituir apenas banco)
      tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${dbName}`);
      logger.debug(`[getTenantPrisma] Using default credentials for ${dbName}`);
    }

    logger.debug(`[getTenantPrisma] DB URL: ${tenantDbUrl.replace(/:[^@]*@/, ':***@')}`); // Hide password in logs

    const prismaInstance = new PrismaClientRuntime({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    tenantPrismaPool.set(poolKey, prismaInstance);
    logger.info(`[getTenantPrisma] Created Prisma client for ${poolKey}`);
    return prismaInstance;
  } catch (error) {
    logger.error('[getTenantPrisma] Error creating Prisma instance:', error);
    // Return prismaMaster as fallback on error instead of throwing
    return prismaMaster as any;
  }
}

/**
 * Wrapper que garante disconnect ao finalizar operação
 */
export async function withTenantPrisma<T>(
  tenantContext: any | undefined,
  operation: (prisma: PrismaClientType) => Promise<T>
): Promise<T> {
  const prisma = getTenantPrisma(tenantContext);
  const shouldDisconnect = !!tenantContext; // Só desconecta se for tenant-specific
  
  try {
    return await operation(prisma);
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}
