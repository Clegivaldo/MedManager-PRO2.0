import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { SuperAdminController } from '../controllers/superadmin.controller.js';
import { GlobalPaymentConfigController } from '../controllers/globalPaymentConfig.controller.js';

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
router.post('/tenants/:tenantId/extend-subscription', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.extendSubscription(req, res));
router.get('/notifications', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.getNotifications(req, res));

// Endpoint para corrigir permissões
router.post('/fix-permissions', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.fixUserPermissions(req, res));

// Configuração Global de Gateways de Pagamento
router.get('/payment-providers', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), GlobalPaymentConfigController.get);
router.put('/payment-providers', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), GlobalPaymentConfigController.update);

// Criar cobrança para um tenant (superadmin)
router.post('/tenants/:tenantId/create-charge', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.createChargeForTenant(req, res));

// Listar cobranças (superadmin)
router.get('/charges', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.listCharges(req, res));

// Sincronizar status de uma cobrança
router.post('/charges/:chargeId/sync', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.syncChargeStatus(req, res));

// Importar cobranças do Asaas
router.post('/charges/import-from-asaas', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.importChargesFromAsaas(req, res));

// Sincronizar todas as cobranças com o Asaas
router.post('/charges/sync-all', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.syncAllCharges(req, res));

// Cancelar uma cobrança
router.post('/charges/:chargeId/cancel', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.cancelCharge(req, res));

// Listar contas a receber (superadmin)
router.get('/billing-accounts', authenticateToken, requirePermission('SUPERADMIN_ACCESS'), (req, res) => controller.listBillingAccounts(req, res));

export default router;