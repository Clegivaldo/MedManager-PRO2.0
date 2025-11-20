import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { AppError } from '../utils/errors.js';
import { LimitsService } from '../services/limits.service.js';

const router: Router = Router();
const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);
const limitsService = new LimitsService(prisma);

// GET /subscriptions/info - Informações da assinatura do tenant logado
router.get('/info', authenticateToken, tenantMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant não identificado', 400);
    }

    const info = await subscriptionService.getSubscriptionInfo(tenantId);

    if (!info) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada',
      });
    }

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    next(error);
  }
});

// GET /subscriptions/usage - Dashboard de uso vs limites (acessível mesmo com assinatura expirada)
router.get('/usage', authenticateToken, tenantMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant não identificado', 400);
    }
    console.log(`[subscriptions/usage] TenantID=${tenantId} iniciando coleta dashboard`);
    const dashboard = await limitsService.getUsageDashboard(tenantId);
    console.log(`[subscriptions/usage] Dashboard gerado:`, {
      limits: dashboard.limits,
      metricsCount: dashboard.metrics?.length
    });
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[subscriptions/usage] Erro:', (error as any)?.message);
    next(error);
  }
});

// POST /subscriptions/renew - Renovar assinatura (manual)
router.post('/renew', authenticateToken, tenantMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant não identificado', 400);
    }

    const { months = 1 } = req.body;
    const result = await subscriptionService.renewSubscription(tenantId, { months });

    res.json({
      success: true,
      message: 'Assinatura renovada com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /subscriptions/change-plan - Alterar plano
router.patch('/change-plan', authenticateToken, tenantMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant não identificado', 400);
    }

    const { newPlanId } = req.body;
    if (!newPlanId) {
      throw new AppError('newPlanId é obrigatório', 400);
    }

    const result = await subscriptionService.changePlan(tenantId, newPlanId);

    res.json({
      success: true,
      message: 'Plano alterado com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /subscriptions/cancel - Cancelar assinatura
router.post('/cancel', authenticateToken, tenantMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new AppError('Tenant não identificado', 400);
    }

    const { reason } = req.body;
    const result = await subscriptionService.cancelSubscription(tenantId, reason);

    res.json({
      success: true,
      message: 'Assinatura cancelada',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
