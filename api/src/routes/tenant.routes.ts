import { Router } from 'express';
import { tenantController } from '../controllers/tenant.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateParams } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

// Schema de validação de parâmetros
const paramsSchema = z.object({
  id: z.string().uuid()
});

/**
 * Rotas de gerenciamento de tenants (Superadmin)
 */

// Listar todos os tenants (com filtros opcionais)
router.get(
  '/tenants',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  tenantController.listTenants
);

// Obter estatísticas dos tenants
router.get(
  '/tenants/stats',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  tenantController.getTenantStats
);

// Criar novo tenant
router.post(
  '/tenants',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  tenantController.createTenant
);

// Obter tenant específico
router.get(
  '/tenants/:id',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  validateParams(paramsSchema),
  tenantController.getTenant
);

// Atualizar tenant
router.put(
  '/tenants/:id',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  validateParams(paramsSchema),
  tenantController.updateTenant
);

// Desativar tenant
router.patch(
  '/tenants/:id/deactivate',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  validateParams(paramsSchema),
  tenantController.deactivateTenant
);

// Ativar tenant
router.patch(
  '/tenants/:id/activate',
  authenticateToken,
  requireRole(['SUPERADMIN']),
  validateParams(paramsSchema),
  tenantController.activateTenant
);

export default router;