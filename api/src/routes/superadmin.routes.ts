import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { SuperAdminController } from '../controllers/superadmin.controller';
import { validateRequest } from '../middleware/validateRequest';
import { requireRole } from '../middleware/auth';

const router = Router();
const superAdminController = new SuperAdminController();

// All superadmin routes require superadmin role
router.use(requireRole('superadmin'));

// Tenant Management Routes
router.get('/tenants', 
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('plan').optional().isIn(['starter', 'professional', 'enterprise'])
  ],
  validateRequest,
  superAdminController.listTenants
);

router.post('/tenants',
  [
    body('name').trim().isLength({ min: 3, max: 100 }),
    body('cnpj').trim().isLength({ min: 14, max: 14 }).isNumeric(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim().isLength({ min: 10, max: 20 }),
    body('address').optional().isObject(),
    body('plan').isIn(['starter', 'professional', 'enterprise']),
    body('adminName').trim().isLength({ min: 3, max: 100 }),
    body('adminEmail').isEmail().normalizeEmail(),
    body('adminPassword').isLength({ min: 8 })
  ],
  validateRequest,
  superAdminController.createTenant
);

router.get('/tenants/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  superAdminController.getTenant
);

router.put('/tenants/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 3, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim().isLength({ min: 10, max: 20 }),
    body('address').optional().isObject(),
    body('plan').optional().isIn(['starter', 'professional', 'enterprise']),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('maxStorageGB').optional().isInt({ min: 1 })
  ],
  validateRequest,
  superAdminController.updateTenant
);

router.delete('/tenants/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  superAdminController.deleteTenant
);

// Tenant Status Management
router.patch('/tenants/:id/status',
  [
    param('id').isUUID(),
    body('status').isIn(['active', 'inactive', 'suspended']),
    body('reason').optional().trim().isLength({ max: 500 })
  ],
  validateRequest,
  superAdminController.updateTenantStatus
);

router.patch('/tenants/:id/plan',
  [
    param('id').isUUID(),
    body('plan').isIn(['starter', 'professional', 'enterprise']),
    body('effectiveDate').optional().isISO8601()
  ],
  validateRequest,
  superAdminController.updateTenantPlan
);

// Tenant Database Management
router.post('/tenants/:id/database/backup',
  [
    param('id').isUUID(),
    body('backupType').optional().isIn(['full', 'incremental'])
  ],
  validateRequest,
  superAdminController.backupTenantDatabase
);

router.get('/tenants/:id/database/backups',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  superAdminController.listTenantBackups
);

router.post('/tenants/:id/database/restore',
  [
    param('id').isUUID(),
    body('backupId').isUUID()
  ],
  validateRequest,
  superAdminController.restoreTenantDatabase
);

// Tenant File Management
router.get('/tenants/:id/storage',
  [
    param('id').isUUID()
  ],
  validateRequest,
  superAdminController.getTenantStorageInfo
);

router.post('/tenants/:id/storage/cleanup',
  [
    param('id').isUUID(),
    body('olderThanDays').optional().isInt({ min: 1 }),
    body('fileTypes').optional().isArray()
  ],
  validateRequest,
  superAdminController.cleanupTenantStorage
);

// System Statistics
router.get('/stats/overview',
  superAdminController.getSystemOverview
);

router.get('/stats/tenants',
  [
    query('period').optional().isIn(['day', 'week', 'month', 'year'])
  ],
  validateRequest,
  superAdminController.getTenantStats
);

router.get('/stats/usage',
  [
    query('period').optional().isIn(['day', 'week', 'month', 'year'])
  ],
  validateRequest,
  superAdminController.getUsageStats
);

// Audit Logs
router.get('/audit-logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('tenantId').optional().isUUID(),
    query('userId').optional().isUUID(),
    query('action').optional().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  superAdminController.getAuditLogs
);

// System Configuration
router.get('/config',
  superAdminController.getSystemConfig
);

router.patch('/config',
  [
    body('maxTenants').optional().isInt({ min: 1 }),
    body('defaultTenantStorageGB').optional().isInt({ min: 1 }),
    body('backupRetentionDays').optional().isInt({ min: 1 }),
    body('rateLimitWindowMs').optional().isInt({ min: 1000 }),
    body('rateLimitMaxRequests').optional().isInt({ min: 1 })
  ],
  validateRequest,
  superAdminController.updateSystemConfig
);

export default router;