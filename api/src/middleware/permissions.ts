import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import pkg from '@prisma/client';
const UserRole = (pkg as any).UserRole as any;

// Define all available permissions in the system
export const PERMISSIONS = {
  // Super Admin Permissions
  SUPER_ADMIN: 'super_admin',
  
  // Tenant Management
  TENANT_CREATE: 'tenant_create',
  TENANT_READ: 'tenant_read',
  TENANT_UPDATE: 'tenant_update',
  TENANT_DELETE: 'tenant_delete',
  TENANT_MANAGE_PLAN: 'tenant_manage_plan',
  TENANT_MANAGE_STATUS: 'tenant_manage_status',
  
  // User Management
  USER_CREATE: 'user_create',
  USER_READ: 'user_read',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_MANAGE_ROLES: 'user_manage_roles',
  USER_MANAGE_PERMISSIONS: 'user_manage_permissions',
  
  // Product Management
  PRODUCT_CREATE: 'product_create',
  PRODUCT_READ: 'product_read',
  PRODUCT_UPDATE: 'product_update',
  PRODUCT_DELETE: 'product_delete',
  PRODUCT_MANAGE_STOCK: 'product_manage_stock',
  PRODUCT_MANAGE_PRICES: 'product_manage_prices',
  PRODUCT_VIEW_COSTS: 'product_view_costs',
  
  // Batch Management
  BATCH_CREATE: 'batch_create',
  BATCH_READ: 'batch_read',
  BATCH_UPDATE: 'batch_update',
  BATCH_DELETE: 'batch_delete',
  BATCH_MANAGE_EXPIRY: 'batch_manage_expiry',
  BATCH_MANAGE_LOCATION: 'batch_manage_location',
  
  // Inventory Management
  INVENTORY_VIEW: 'inventory_view',
  INVENTORY_ADJUST: 'inventory_adjust',
  INVENTORY_TRANSFER: 'inventory_transfer',
  INVENTORY_COUNT: 'inventory_count',
  
  // Customer Management
  CUSTOMER_CREATE: 'customer_create',
  CUSTOMER_READ: 'customer_read',
  CUSTOMER_UPDATE: 'customer_update',
  CUSTOMER_DELETE: 'customer_delete',
  CUSTOMER_VIEW_DOCUMENTS: 'customer_view_documents',
  
  // Supplier Management
  SUPPLIER_CREATE: 'supplier_create',
  SUPPLIER_READ: 'supplier_read',
  SUPPLIER_UPDATE: 'supplier_update',
  SUPPLIER_DELETE: 'supplier_delete',
  SUPPLIER_MANAGE_CONTRACTS: 'supplier_manage_contracts',
  
  // Invoice Management
  INVOICE_CREATE: 'invoice_create',
  INVOICE_READ: 'invoice_read',
  INVOICE_UPDATE: 'invoice_update',
  INVOICE_DELETE: 'invoice_delete',
  INVOICE_CANCEL: 'invoice_cancel',
  INVOICE_PRINT: 'invoice_print',
  INVOICE_EMAIL: 'invoice_email',
  
  // Electronic Invoice (NF-e)
  NFE_ISSUE: 'nfe_issue',
  NFE_CANCEL: 'nfe_cancel',
  NFE_CORRECT: 'nfe_correct',
  NFE_VIEW_XML: 'nfe_view_xml',
  NFE_VIEW_DANFE: 'nfe_view_danfe',
  
  // Financial Management
  FINANCIAL_VIEW: 'financial_view',
  FINANCIAL_MANAGE_PAYMENTS: 'financial_manage_payments',
  FINANCIAL_MANAGE_RECEIPTS: 'financial_manage_receipts',
  FINANCIAL_VIEW_REPORTS: 'financial_view_reports',
  
  // Dashboard
  DASHBOARD_VIEW: 'dashboard_view',
  
  // Reports and Analytics
  REPORTS_VIEW: 'reports_view',
  REPORTS_CREATE: 'reports_create',
  REPORTS_EXPORT: 'reports_export',
  ANALYTICS_VIEW: 'analytics_view',
  
  // Regulatory Compliance (RDC 430/Guia 33)
  REGULATORY_VIEW: 'regulatory_view',
  REGULATORY_MANAGE_SNGPC: 'regulatory_manage_sngpc',
  REGULATORY_MANAGE_SNCM: 'regulatory_manage_sncm',
  REGULATORY_VIEW_AUDIT: 'regulatory_view_audit',
  REGULATORY_MANAGE_PRESCRIPTION: 'regulatory_manage_prescription',
  REGULATORY_MANAGE_CONTROLLED_SUBSTANCES: 'regulatory_manage_controlled_substances',
  
  // Controlled Substances (Guia 33)
  CONTROLLED_CREATE: 'controlled_create',
  CONTROLLED_READ: 'controlled_read',
  CONTROLLED_UPDATE: 'controlled_update',
  CONTROLLED_DELETE: 'controlled_delete',
  CONTROLLED_MANAGE_STOCK: 'controlled_manage_stock',
  CONTROLLED_VIEW_MOVEMENTS: 'controlled_view_movements',
  CONTROLLED_GENERATE_G33: 'controlled_generate_g33',
  
  // Audit and Logs
  AUDIT_VIEW: 'audit_view',
  AUDIT_EXPORT: 'audit_export',
  LOGS_VIEW: 'logs_view',
  LOGS_MANAGE: 'logs_manage',
  
  // Backup and Recovery
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',
  BACKUP_VIEW: 'backup_view',
  BACKUP_DOWNLOAD: 'backup_download',
  BACKUP_MANAGE: 'backup_manage',
  
  // System Configuration
  SYSTEM_CONFIG: 'system_config',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  
  // File Management
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  FILE_DELETE: 'file_delete',
  FILE_MANAGE: 'file_manage'
} as const;

// Role definitions with associated permissions
export const ROLES = {
  MASTER: {
    name: 'master',
    permissions: Object.values(PERMISSIONS),
    description: 'Full tenant administrative access'
  },
  SUPERADMIN: {
    name: 'superadmin',
    permissions: Object.values(PERMISSIONS),
    description: 'Full system access'
  },
  
  ADMIN: {
    name: 'admin',
    permissions: [
      // User Management
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_MANAGE_ROLES,
      PERMISSIONS.USER_MANAGE_PERMISSIONS,
      
      // Product Management
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.PRODUCT_UPDATE,
      PERMISSIONS.PRODUCT_DELETE,
      PERMISSIONS.PRODUCT_MANAGE_STOCK,
      PERMISSIONS.PRODUCT_MANAGE_PRICES,
      PERMISSIONS.PRODUCT_VIEW_COSTS,
      
      // Batch Management
      PERMISSIONS.BATCH_CREATE,
      PERMISSIONS.BATCH_READ,
      PERMISSIONS.BATCH_UPDATE,
      PERMISSIONS.BATCH_DELETE,
      PERMISSIONS.BATCH_MANAGE_EXPIRY,
      PERMISSIONS.BATCH_MANAGE_LOCATION,
      
      // Inventory
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_TRANSFER,
      PERMISSIONS.INVENTORY_COUNT,
      
      // Customer Management
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.CUSTOMER_DELETE,
      PERMISSIONS.CUSTOMER_VIEW_DOCUMENTS,
      
      // Supplier Management
      PERMISSIONS.SUPPLIER_CREATE,
      PERMISSIONS.SUPPLIER_READ,
      PERMISSIONS.SUPPLIER_UPDATE,
      PERMISSIONS.SUPPLIER_DELETE,
      PERMISSIONS.SUPPLIER_MANAGE_CONTRACTS,
      
      // Invoice Management
      PERMISSIONS.INVOICE_CREATE,
      PERMISSIONS.INVOICE_READ,
      PERMISSIONS.INVOICE_UPDATE,
      PERMISSIONS.INVOICE_PRINT,
      PERMISSIONS.INVOICE_EMAIL,
      
      // Electronic Invoice
      PERMISSIONS.NFE_ISSUE,
      PERMISSIONS.NFE_VIEW_XML,
      PERMISSIONS.NFE_VIEW_DANFE,
      
      // Dashboard
      PERMISSIONS.DASHBOARD_VIEW,
      
      // Financial
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.FINANCIAL_MANAGE_PAYMENTS,
      PERMISSIONS.FINANCIAL_MANAGE_RECEIPTS,
      PERMISSIONS.FINANCIAL_VIEW_REPORTS,
      
      // Reports
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_CREATE,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
      
      // Regulatory
      PERMISSIONS.REGULATORY_VIEW,
      PERMISSIONS.REGULATORY_MANAGE_SNGPC,
      PERMISSIONS.REGULATORY_MANAGE_SNCM,
      PERMISSIONS.REGULATORY_VIEW_AUDIT,
      PERMISSIONS.REGULATORY_MANAGE_PRESCRIPTION,
      
      // Controlled Substances
      PERMISSIONS.CONTROLLED_CREATE,
      PERMISSIONS.CONTROLLED_READ,
      PERMISSIONS.CONTROLLED_UPDATE,
      PERMISSIONS.CONTROLLED_MANAGE_STOCK,
      PERMISSIONS.CONTROLLED_VIEW_MOVEMENTS,
      PERMISSIONS.CONTROLLED_GENERATE_G33,
      
      // Audit
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
      
      // File Management
      PERMISSIONS.FILE_UPLOAD,
      PERMISSIONS.FILE_DOWNLOAD,
      PERMISSIONS.FILE_DELETE,
      PERMISSIONS.FILE_MANAGE
    ],
    description: 'Administrative access to tenant resources'
  },
  
  MANAGER: {
    name: 'manager',
    permissions: [
      // User Management (limited)
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_UPDATE,
      
      // Product Management (no costs)
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.PRODUCT_UPDATE,
      PERMISSIONS.PRODUCT_MANAGE_STOCK,
      PERMISSIONS.PRODUCT_MANAGE_PRICES,
      
      // Batch Management
      PERMISSIONS.BATCH_CREATE,
      PERMISSIONS.BATCH_READ,
      PERMISSIONS.BATCH_UPDATE,
      PERMISSIONS.BATCH_MANAGE_EXPIRY,
      PERMISSIONS.BATCH_MANAGE_LOCATION,
      
      // Inventory
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_TRANSFER,
      PERMISSIONS.INVENTORY_COUNT,
      
      // Customer Management
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.CUSTOMER_VIEW_DOCUMENTS,
      
      // Supplier Management
      PERMISSIONS.SUPPLIER_CREATE,
      PERMISSIONS.SUPPLIER_READ,
      PERMISSIONS.SUPPLIER_UPDATE,
      
      // Invoice Management
      PERMISSIONS.INVOICE_CREATE,
      PERMISSIONS.INVOICE_READ,
      PERMISSIONS.INVOICE_UPDATE,
      PERMISSIONS.INVOICE_PRINT,
      PERMISSIONS.INVOICE_EMAIL,
      
      // Electronic Invoice
      PERMISSIONS.NFE_ISSUE,
      PERMISSIONS.NFE_VIEW_XML,
      PERMISSIONS.NFE_VIEW_DANFE,
      
      // Financial (view only)
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.FINANCIAL_VIEW_REPORTS,
      
      // Dashboard
      PERMISSIONS.DASHBOARD_VIEW,
      
      // Reports
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_CREATE,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
      
      // Regulatory
      PERMISSIONS.REGULATORY_VIEW,
      PERMISSIONS.REGULATORY_MANAGE_SNGPC,
      PERMISSIONS.REGULATORY_MANAGE_PRESCRIPTION,
      
      // Controlled Substances
      PERMISSIONS.CONTROLLED_CREATE,
      PERMISSIONS.CONTROLLED_READ,
      PERMISSIONS.CONTROLLED_UPDATE,
      PERMISSIONS.CONTROLLED_MANAGE_STOCK,
      PERMISSIONS.CONTROLLED_VIEW_MOVEMENTS,
      
      // File Management
      PERMISSIONS.FILE_UPLOAD,
      PERMISSIONS.FILE_DOWNLOAD,
      PERMISSIONS.FILE_MANAGE
    ],
    description: 'Management access to daily operations'
  },
  
  OPERATOR: {
    name: 'operator',
    permissions: [
      // Product (read only)
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.PRODUCT_MANAGE_STOCK,
      
      // Batch (read only)
      PERMISSIONS.BATCH_READ,
      PERMISSIONS.BATCH_MANAGE_LOCATION,
      
      // Inventory
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_COUNT,
      
      // Customer
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_UPDATE,
      
      // Invoice
      PERMISSIONS.INVOICE_CREATE,
      PERMISSIONS.INVOICE_READ,
      PERMISSIONS.INVOICE_PRINT,
      PERMISSIONS.INVOICE_EMAIL,
      
      // Electronic Invoice
      PERMISSIONS.NFE_ISSUE,
      PERMISSIONS.NFE_VIEW_DANFE,
      
      // Dashboard
      PERMISSIONS.DASHBOARD_VIEW,
      
      // Financial (view only)
      PERMISSIONS.FINANCIAL_VIEW,
      
      // Reports (view only)
      PERMISSIONS.REPORTS_VIEW,
      
      // Regulatory
      PERMISSIONS.REGULATORY_VIEW,
      PERMISSIONS.REGULATORY_MANAGE_PRESCRIPTION,
      
      // Controlled Substances
      PERMISSIONS.CONTROLLED_READ,
      PERMISSIONS.CONTROLLED_MANAGE_STOCK,
      PERMISSIONS.CONTROLLED_VIEW_MOVEMENTS,
      
      // File Management
      PERMISSIONS.FILE_UPLOAD,
      PERMISSIONS.FILE_DOWNLOAD
    ],
    description: 'Operational access to daily tasks'
  },
  
  VIEWER: {
    name: 'viewer',
    permissions: [
      // Dashboard
      PERMISSIONS.DASHBOARD_VIEW,
      
      // Read only access
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.BATCH_READ,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.SUPPLIER_READ,
      PERMISSIONS.INVOICE_READ,
      PERMISSIONS.NFE_VIEW_DANFE,
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REGULATORY_VIEW,
      PERMISSIONS.CONTROLLED_READ,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.FILE_DOWNLOAD
    ],
    description: 'Read only access to all resources'
  }
};

// Permission checking middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Superadmin and Master bypass (Master has full tenant-level access)
      if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.MASTER) {
        return next();
      }

      // Check if user has the required permission
      const userPermissions = req.user.permissions || [];
      if (!userPermissions.includes(permission)) {
        logger.warn(`User ${req.user.userId} attempted to access ${permission} without permission`);
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error('Permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Multiple permissions check (requires all permissions)
export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Superadmin and MASTER bypass
      if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.MASTER) {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn(`User ${req.user.userId} attempted to access without required permissions: ${permissions.join(', ')}`);
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error('Permissions check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Any permission check (requires at least one permission)
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Superadmin and MASTER bypass
      if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.MASTER) {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      const hasAnyPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        logger.warn(`User ${req.user.userId} attempted to access without any required permissions: ${permissions.join(', ')}`);
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error('Any permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Role-based permission check
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      if (req.user.role !== role && req.user.role !== 'superadmin') {
        logger.warn(`User ${req.user.userId} attempted to access with role ${req.user.role}, required: ${role}`);
        throw new AppError('Insufficient role permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error('Role check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Resource-specific permission check (e.g., own data vs all data)
export const requireResourcePermission = (permission: string, resourceField: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Superadmin and MASTER bypass
      if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.MASTER) {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      const resourceId = req.params[resourceField] || req.params.id;
      const userId = req.user.userId;

      // Check if user has the specific permission
      if (!userPermissions.includes(permission)) {
        // Check if it's their own resource and they have read permission
        if (resourceId === userId && permission.includes('_READ')) {
          return next();
        }
        
        logger.warn(`User ${req.user.userId} attempted to access resource ${resourceId} without permission ${permission}`);
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error('Resource permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Helper function to get permissions for a role
export const getRolePermissions = (roleName: string): string[] => {
  const role = Object.values(ROLES).find(r => r.name === roleName);
  return role ? role.permissions : [];
};

// Helper function to check if role exists
export const roleExists = (roleName: string): boolean => {
  return Object.values(ROLES).some(r => r.name === roleName);
};
