import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment.js';
import { prismaMaster } from './prisma.js';

/**
 * Helper para obter instância Prisma dinâmica baseada em tenant context
 * Retorna master se não houver tenant, tenant-specific caso contrário
 */
export function getTenantPrisma(tenantContext?: any | string): PrismaClient {
  if (!tenantContext) {
    return prismaMaster as any;
  }

  // Allow either passing an object ({ databaseName }) or a plain string (databaseName)
  const dbName = typeof tenantContext === 'string' ? tenantContext : (tenantContext.databaseName || tenantContext.id || undefined);
  if (!dbName) {
    return prismaMaster as any;
  }

  const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${dbName}`);
  
  return new PrismaClient({
    datasources: {
      db: { url: tenantDbUrl }
    }
  });
}

/**
 * Wrapper que garante disconnect ao finalizar operação
 */
export async function withTenantPrisma<T>(
  tenantContext: any | undefined,
  operation: (prisma: PrismaClient) => Promise<T>
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
