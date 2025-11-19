import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';

/**
 * Middleware de controle de acesso baseado em roles (RBAC)
 * Verifica se o usuário tem um dos roles especificados
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const userRole = req.user.role;
      
      // Verificar se o usuário tem um dos roles permitidos
      const hasPermission = allowedRoles.includes(userRole);

      if (!hasPermission) {
        logger.warn(`Access denied: User ${req.user.userId} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role-based authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Middleware de controle de acesso baseado em permissões granulares
 * Verifica se o usuário tem todas as permissões especificadas
 */
export function requirePermissions(requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Bypass total para SUPERADMIN
      if (req.user.role === 'SUPERADMIN') {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      
      // Verificar se o usuário tem todas as permissões necessárias
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(permission => 
          !userPermissions.includes(permission)
        );
        
        logger.warn(`Access denied: User ${req.user.userId} missing permissions: ${missingPermissions.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          missing: missingPermissions
        });
      }

      next();
    } catch (error) {
      logger.error('Permission-based authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Middleware de controle de acesso para superadmin
 * Verifica se o usuário é superadmin
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.role !== 'SUPERADMIN') {
      logger.warn(`Access denied: User ${req.user.userId} with role ${req.user.role} tried to access superadmin resource`);
      
      return res.status(403).json({
        success: false,
        message: 'Superadmin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Superadmin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
}

/**
 * Middleware de controle de acesso para tenant admin
 * Verifica se o usuário é admin do tenant ou superadmin
 */
export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const isTenantAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN;

    if (!isTenantAdmin) {
      logger.warn(`Access denied: User ${req.user.userId} with role ${req.user.role} tried to access tenant admin resource`);
      
      return res.status(403).json({
        success: false,
        message: 'Tenant admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant admin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
}