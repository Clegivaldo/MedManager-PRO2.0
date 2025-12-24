import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';
import type { JWTPayload } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

// Usa JWTPayload do serviço de autenticação para manter tipagem única

/**
 * Extensão da interface Request para incluir o usuário autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      tenant?: {
        id: string;
        name: string;
        cnpj: string;
        plan: string;
      };
    }
  }
}

/**
 * Middleware de autenticação JWT
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verificar o token
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('JWT verification failed:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Adicionar informações do usuário à requisição
      console.log('[JWT-DECODE] Decoded token:', {
        userId: (decoded as any).userId,
        email: (decoded as any).email,
        role: (decoded as any).role,
        tenantId: (decoded as any).tenantId
      });
      req.user = decoded as JWTPayload;
      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

/**
 * Middleware para verificar se o usuário tem permissão para acessar recursos do tenant
 */
export function authorizeTenantAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Obter tenant ID dos headers ou parâmetros
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    const tenantIdFromParam = req.params.tenantId;
    const tenantCnpjFromHeader = req.headers['x-tenant-cnpj'] as string;

    const requestedTenantId = tenantIdFromHeader || tenantIdFromParam || tenantCnpjFromHeader;

    if (!requestedTenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID or CNPJ required'
      });
    }

    // Verificar se o usuário tem acesso ao tenant solicitado
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId && req.user.tenantId !== requestedTenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this tenant'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
}

/**
 * Middleware para verificar se o usuário está autenticado (uso opcional)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continuar sem autenticação
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.user = decoded as JWTPayload;
    }
    next();
  });
}