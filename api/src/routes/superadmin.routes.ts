import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { SuperAdminController } from '../controllers/superadmin.controller.js';

const controller = new SuperAdminController();

const router: Router = Router();

// Rotas de superadmin
router.get('/dashboard', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getSystemOverview(req, res));
router.get('/dashboard/metrics', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getDashboardMetrics(req, res));

router.get('/analytics', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getAuditLogs(req, res));

router.get('/tenants', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.listTenants(req, res));
router.post('/tenants', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.createTenant(req, res));
router.get('/tenants/:id', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getTenant(req, res));
router.put('/tenants/:id', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.updateTenant(req, res));
router.delete('/tenants/:id', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.deleteTenant(req, res));
router.put('/tenants/:id/status', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.updateTenantStatus(req, res));
router.put('/tenants/:id/plan', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.updateTenantPlan(req, res));

export default router;
router.get('/notifications', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getNotifications(req, res));