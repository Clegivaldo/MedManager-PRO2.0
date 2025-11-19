import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { TenantController } from '../controllers/tenant.controller.js';

const controller = new TenantController();

const router: Router = Router();

// Rotas de gerenciamento de tenants (para superadmin)
router.get('/', authenticateToken, requirePermission('TENANT_LIST'), async (req, res, next) => {
  try {
    res.json({ message: 'Tenant list endpoint - implementar' });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requirePermission('TENANT_CREATE'), async (req, res, next) => {
  try {
    res.json({ message: 'Tenant create endpoint - implementar' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, requirePermission('TENANT_VIEW'), async (req, res, next) => {
  try {
    res.json({ message: 'Tenant view endpoint - implementar' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, requirePermission('TENANT_UPDATE'), async (req, res, next) => {
  try {
    res.json({ message: 'Tenant update endpoint - implementar' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, requirePermission('TENANT_DELETE'), async (req, res, next) => {
  try {
    res.json({ message: 'Tenant delete endpoint - implementar' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/backup', authenticateToken, requirePermission('TENANT_BACKUP'), (req, res, next) => controller.backupTenant(req, res));

export default router;