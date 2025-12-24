import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { prismaMaster } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { config } from '../config/environment.js';

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
    // Obter tenant ID do header ou do JWT
    let tenantId = tenantReq.headers['x-tenant-id'] as string | undefined;
    const tenantCnpj = tenantReq.headers['x-tenant-cnpj'] as string;

    // Se não estiver no header, tentar extrair do JWT
    if (!tenantId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded: any = jwt.verify(token, config.JWT_SECRET);
          tenantId = decoded.tenantId;
          console.log('[TENANT-MIDDLEWARE] tenantId extracted from JWT:', tenantId);
        } catch (jwtErr) {
          // JWT inválido ou expirado, continuar para erro abaixo
          console.log('[TENANT-MIDDLEWARE] Failed to extract tenantId from JWT:', (jwtErr as Error).message);
        }
      }
    }

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
    let tenantIdFromJwt: string | undefined;
    
    // Tentar extrair tenantId do JWT se houver Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, config.JWT_SECRET);
        tenantIdFromJwt = decoded.tenantId;
        console.log('[DEBUG-MIDDLEWARE] tenantId extracted from JWT:', tenantIdFromJwt);
      } catch (jwtErr) {
        // JWT inválido ou expirado, continuar
        console.log('[DEBUG-MIDDLEWARE] Failed to extract tenantId from JWT:', (jwtErr as Error).message);
      }
    }
    
    const tenantId = (req.headers['x-tenant-id'] as string) || tenantIdFromJwt || (req as any).user?.tenantId;
    const tenantCnpj = req.headers['x-tenant-cnpj'] as string;

    console.log('[DEBUG-MIDDLEWARE] optionalTenantMiddleware started', {
      tenantIdInHeader: req.headers['x-tenant-id'],
      tenantIdInJwt: tenantIdFromJwt,
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