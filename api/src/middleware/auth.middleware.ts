import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { TenantRequest } from '../middleware/tenantMiddleware.js';

/**
 * Middleware de autenticação JWT
 */
export function authenticateToken(req: TenantRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar token
    const payload = verifyAccessToken(token);
    
    // Adicionar informações do usuário ao request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions
    };
    
    // Verificar se o tenant do token corresponde ao tenant do request
    if (req.tenant && req.tenant.id !== payload.tenantId) {
      return res.status(403).json({
        error: 'Token tenant does not match request tenant',
        code: 'TENANT_MISMATCH',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware de autorização baseado em roles
 */
export function authorizeRole(allowedRoles: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const userRole = req.user.role;
    const hasPermission = allowedRoles.includes(userRole);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: userRole,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

/**
 * Middleware de autorização baseado em permissões específicas
 */
export function authorizePermission(requiredPermissions: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        error: 'Missing required permissions',
        code: 'MISSING_PERMISSIONS',
        requiredPermissions,
        userPermissions,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

/**
 * Middleware de autorização para administradores
 */
export function requireAdmin(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({
      error: 'User not authenticated',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }
  
  const adminRoles = ['MASTER', 'ADMIN'];
  const isAdmin = adminRoles.includes(req.user.role);
  
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Middleware de autorização para farmacêuticos
 */
export function requirePharmacist(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({
      error: 'User not authenticated',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }
  
  const pharmacistRoles = ['MASTER', 'ADMIN', 'PHARMACIST'];
  const isPharmacist = pharmacistRoles.includes(req.user.role);
  
  if (!isPharmacist) {
    return res.status(403).json({
      error: 'Pharmacist authorization required',
      code: 'PHARMACIST_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

// Extensão da interface Request para incluir usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}