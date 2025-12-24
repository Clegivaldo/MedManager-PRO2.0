import { Request, Response, NextFunction } from 'express';
import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { isBefore } from 'date-fns';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClientRuntime();

/**
 * Middleware que valida se a assinatura do tenant está ativa
 * Bloqueia acesso se licença estiver vencida, suspensa ou cancelada
 */
export const validateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(`\n🔍 [validateSubscription] MIDDLEWARE EXECUTADO - PATH: ${req.path}`);
  try {
    // Tentar obter tenantId de várias fontes
    const tenantFromRequest = (req as any).tenant;
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    const tenantIdFromJwt = (req as any).user?.tenantId;
    const tenantIdFromContext = tenantFromRequest?.id;
    
    // Prioridade: context > JWT > header
    const tenantId = tenantIdFromContext || tenantIdFromJwt || tenantIdFromHeader;
    const userRole = (req as any).user?.role;

    logger.info(`[validateSubscription] Validando tenant: ${tenantId}, role: ${userRole}`);

    // SUPERADMIN tem acesso total (bypass), mas MASTER apenas se NÃO tiver x-tenant-id específico
    // Se tem x-tenant-id, é um usuário de tenant e deve respeitar a assinatura
    if (userRole === 'SUPERADMIN') {
      logger.info(`[validateSubscription] BYPASS - User is SUPERADMIN`);
      return next();
    }

    if (userRole === 'MASTER' && !tenantId) {
      logger.info(`[validateSubscription] BYPASS - User is MASTER (no tenant specified)`);
      return next();
    }

    // Se MASTER tiver tenantId específico, não faz bypass - valida normalmente
    if (userRole === 'MASTER' && tenantId) {
      logger.info(`[validateSubscription] MASTER com tenant específico - validando assinatura`);
    }

    // Se não tem tenantId, não pode validar (erro na autenticação)
    if (!tenantId) {
      throw new AppError('Tenant ID não fornecido', 400);
    }

    // Buscar tenant com assinatura
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        status: true,
      },
    });

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404);
    }

    // Verificar se tenant está ativo
    if (tenant.status === 'inactive') {
      throw new AppError('Tenant inativo. Entre em contato com o suporte.', 403, 'TENANT_INACTIVE');
    }

    // Verificar se tenant está suspenso
    if (tenant.status === 'suspended') {
      throw new AppError(
        'Tenant suspenso por inadimplência. Entre em contato com o suporte.',
        403,
        'TENANT_SUSPENDED'
      );
    }

    // Verificar status da assinatura
    const now = new Date();

    // Se não tem data de fim de assinatura, permitir (trial ou configuração inicial)
    if (!tenant.subscriptionEnd) {
      logger.info(`[validateSubscription] ✓ SEM DATA FIM - permitindo acesso`);
      return next();
    }

    // Verificar se expirou
    if (isBefore(tenant.subscriptionEnd, now)) {
      logger.warn(`[validateSubscription] ❌ EXPIRADA! subscriptionEnd: ${tenant.subscriptionEnd}, agora: ${now}`);
      // Atualizar apenas o status da assinatura, não o status geral do tenant
      // Tenant permanece 'active' para permitir acesso à rota de renovação
      if (tenant.subscriptionStatus !== 'expired') {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionStatus: 'expired',
            // NÃO alterar status do tenant - manter 'active' permitindo renovação
          },
        });

        await prisma.subscription.update({
          where: { tenantId },
          data: { status: 'expired' },
        });
      }

      throw new AppError(
        'Sua assinatura expirou. Renove para continuar usando o sistema.',
        403,
        'LICENSE_EXPIRED'
      );
    }

    // Verificar se está suspensa
    if (tenant.subscriptionStatus === 'suspended') {
      throw new AppError(
        'Sua assinatura está suspensa. Entre em contato com o suporte.',
        403,
        'LICENSE_SUSPENDED'
      );
    }

    // Verificar se está cancelada
    if (tenant.subscriptionStatus === 'cancelled') {
      throw new AppError(
        'Sua assinatura foi cancelada.',
        403,
        'LICENSE_CANCELLED'
      );
    }

    // Tudo ok, permitir acesso
    next();
  } catch (error) {
    logger.error('[validateSubscription] Erro no middleware', { 
      message: (error as any)?.message, 
      stack: (error as any)?.stack,
      tenantHeader: req.headers['x-tenant-id']
    });
    next(error);
  }
};

/**
 * Middleware que valida se o módulo está habilitado no plano do tenant
 */
export const validateModule = (requiredModule: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantReq = req as any;
      const userRole = (req as any).user?.role;
      const tenantContext = tenantReq.tenant;

      // SUPERADMIN sem tenant específica tem acesso a tudo
      if (userRole === 'SUPERADMIN' && !tenantContext) {
        return next();
      }

      // MASTER com tenant específica ainda precisa respeitar módulos da tenant
      if (userRole === 'MASTER' && !tenantContext) {
        // MASTER sem tenant (navegando como superadmin) tem acesso a tudo
        return next();
      }

      // Tentar obter tenant do contexto (req.tenant após tenantMiddleware)
      let modules = tenantReq.tenant?.modulesEnabled as string[] || [];

      // Se não estiver em req.tenant, tentar buscar do banco
      if (modules.length === 0) {
        const tenantId = req.headers['x-tenant-id'] as string;
        
        if (!tenantId) {
          throw new AppError('Tenant ID não fornecido', 400);
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            modulesEnabled: true,
          },
        });

        if (!tenant) {
          throw new AppError('Tenant não encontrado', 404);
        }

        modules = tenant.modulesEnabled as string[];
      }

      // Verificar se módulo está habilitado
      if (!modules.includes(requiredModule)) {
        throw new AppError(
          `Módulo "${requiredModule}" não está disponível no seu plano. Faça upgrade para acessar.`,
          403,
          'MODULE_NOT_ENABLED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware que valida limites do plano antes de criar recursos
 */
export const validatePlanLimit = (limitType: 'user' | 'product' | 'transaction' | 'storage') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userRole = (req as any).user?.role;

      // SUPERADMIN não tem limites
      if (userRole === 'SUPERADMIN' || userRole === 'MASTER') {
        return next();
      }

      if (!tenantId) {
        throw new AppError('Tenant ID não fornecido', 400);
      }

      // Importar LimitsService aqui para evitar dependência circular
      const { LimitsService } = await import('../services/limits.service.js');
      const limitsService = new LimitsService(prisma);

      let result;

      switch (limitType) {
        case 'user':
          result = await limitsService.checkUserLimit(tenantId);
          break;
        case 'product':
          result = await limitsService.checkProductLimit(tenantId);
          break;
        case 'transaction':
          result = await limitsService.checkTransactionLimit(tenantId);
          break;
        case 'storage':
          const fileSize = req.headers['content-length'] 
            ? parseInt(req.headers['content-length']) / (1024 * 1024) 
            : 0;
          result = await limitsService.checkStorageLimit(tenantId, fileSize);
          break;
        default:
          return next();
      }

      if (!result.allowed) {
        throw new AppError(
          result.message || 'Limite do plano atingido',
          402, // Payment Required
          'PLAN_LIMIT_REACHED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
