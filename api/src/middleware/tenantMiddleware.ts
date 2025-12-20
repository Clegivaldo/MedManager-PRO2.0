import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';

// Interface estendida para Request com tenant
export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    name: string;
    cnpj: string;
    plan: string;
    databaseName: string;
    databaseUser: string;
    databasePassword: string;
    modulesEnabled: string[];
  };
}

/**
 * Middleware de multitenancy
 * Identifica o tenant a partir do header/subdomínio e configura o contexto
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantReq = req as TenantRequest;
  try {
    // Obter tenant ID do header ou subdomínio
    const tenantId = tenantReq.headers['x-tenant-id'] as string;
    const tenantCnpj = tenantReq.headers['x-tenant-cnpj'] as string;

    if (!tenantId && !tenantCnpj) {
      throw new AppError('Tenant identification required', 400);
    }

    // Buscar tenant no banco master
    let tenant;
    if (tenantId) {
      tenant = await prismaMaster.tenant.findUnique({
        where: { id: tenantId }
      });
    } else if (tenantCnpj) {
      tenant = await prismaMaster.tenant.findUnique({
        where: { cnpj: tenantCnpj }
      });
    }

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Verificar se o tenant está ativo
    if (tenant.status !== 'active') {
      throw new AppError('Tenant is not active', 403);
    }

    // Adicionar tenant ao request
    tenantReq.tenant = {
      id: tenant.id,
      name: tenant.name,
      cnpj: tenant.cnpj,
      plan: tenant.plan,
      databaseName: tenant.databaseName,
      databaseUser: tenant.databaseUser,
      databasePassword: tenant.databasePassword,
      modulesEnabled: tenant.modulesEnabled as string[] || []
    };

    logger.info(`Tenant identified: ${tenant.name} (${tenant.cnpj})`);

    next();
  } catch (error) {
    logger.error('Error in tenant middleware:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error during tenant identification',
      timestamp: new Date().toISOString()
    });
    return;
  }
}

/**
 * Middleware opcional para rotas que não requerem tenant
 * Mas que podem beneficiar de ter o contexto se disponível
 */
export async function optionalTenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantReq = req as TenantRequest;
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const tenantCnpj = req.headers['x-tenant-cnpj'] as string;

    console.log('[DEBUG-MIDDLEWARE] optionalTenantMiddleware started', {
      tenantIdInHeader: req.headers['x-tenant-id'],
      tenantIdInUser: (req as any).user?.tenantId,
      finalTenantId: tenantId
    });

    if (!tenantId && !tenantCnpj) {
      return next();
    }

    // Buscar tenant (mesma lógica do middleware principal)
    let tenant;
    if (tenantId) {
      tenant = await prismaMaster.tenant.findUnique({
        where: { id: tenantId }
      });
    } else if (tenantCnpj) {
      tenant = await prismaMaster.tenant.findUnique({
        where: { cnpj: tenantCnpj }
      });
    }

    if (tenant && tenant.status === 'active') {
      tenantReq.tenant = {
        id: tenant.id,
        name: tenant.name,
        cnpj: tenant.cnpj,
        plan: tenant.plan,
        databaseName: tenant.databaseName,
        databaseUser: tenant.databaseUser,
        databasePassword: tenant.databasePassword,
        modulesEnabled: tenant.modulesEnabled as string[] || []
      };
      console.log('[DEBUG-MIDDLEWARE] Tenant resolved', {
        id: tenant.id,
        modules: tenant.modulesEnabled
      });
    } else {
      console.log('[DEBUG-MIDDLEWARE] Tenant NOT resolved or inactive', {
        tenantFound: !!tenant,
        status: tenant?.status
      });
    }

    next();
  } catch (error) {
    logger.error('Error in optional tenant middleware:', error);
    // Em caso de erro, continuar sem tenant
    next();
  }
}