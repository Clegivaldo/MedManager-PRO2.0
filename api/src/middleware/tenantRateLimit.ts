import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';
import { Request, Response } from 'express';

/**
 * Rate limiter específico por Tenant
 * Utiliza o ID do tenant (do header ou request) como chave
 */
export const tenantRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: (req) => {
        // Pode ser customizado por plano no futuro
        return 1000; // 1000 requisições por minuto por tenant
    },
    keyGenerator: (req: Request) => {
        // Tenta pegar do objeto request (já populado pelo tenantMiddleware)
        if ((req as any).tenant?.id) {
            return (req as any).tenant.id;
        }
        // Fallback para header
        return req.headers['x-tenant-id'] as string || req.ip || 'unknown';
    },
    message: {
        error: 'Too many requests from this tenant, please try again later.',
        code: 'TENANT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
