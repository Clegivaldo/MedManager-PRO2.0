import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import crypto from 'crypto';

/**
 * Middleware de proteção CSRF simplificado
 * Valida origem da requisição e tokens personalizados
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://app.medmanager.com',
  'https://medmanager.com',
];

/**
 * Middleware para validar origem e prevenir CSRF
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip para GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip para webhooks (validados por token)
  if (req.path.includes('/webhooks')) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Verificar se tem origin ou referer
  if (!origin && !referer) {
    throw new AppError('Missing origin or referer header', 403);
  }

  // Validar origin
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      throw new AppError('Invalid origin', 403);
    }
  }

  // Validar referer
  if (referer && !origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      throw new AppError('Invalid referer', 403);
    }
  }

  // Validar custom token (opcional)
  const csrfToken = req.headers['x-csrf-token'] as string;
  const expectedToken = req.cookies?.csrf;

  if (expectedToken && csrfToken !== expectedToken) {
    throw new AppError('Invalid CSRF token', 403);
  }

  next();
}

/**
 * Gerar token CSRF para sessão
 */
export function generateCsrfToken(req: Request, res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  
  // Armazenar em cookie httpOnly
  res.cookie('csrf', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hora
  });

  return token;
}

/**
 * Endpoint para obter token CSRF
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
}
