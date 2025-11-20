import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { prismaMaster } from '../lib/prisma.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  extractTokenFromHeader
} from '../services/auth.service.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/environment.js';
import { emailService } from '../services/email.service.js';

const router: Router = Router();

// Rotas públicas de autenticação
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info('Login (master) attempt', { email });

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prismaMaster.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logger.warn('Login failed: user not found', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      logger.warn('Login failed: inactive account', { email });
      throw new AppError('User account is inactive', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Login failed: wrong password', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    await prismaMaster.user.update({
      where: { id: user.id },
      data: { lastAccess: new Date() }
    });

    // Inject default permissions if empty (SUPERADMIN bypass)
    let permissions: string[] = [];
    try {
      const raw = user.permissions as any;
      permissions = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);
      if (permissions.length === 0) {
        // For SUPERADMIN assign all permissions (simplificado)
        if (String(user.role).toUpperCase() === 'SUPERADMIN') {
          permissions = [];// pode deixar vazio e backend ignora via bypass
        }
      }
    } catch (permErr) {
      logger.error('Permission parse error', { error: permErr instanceof Error ? permErr.message : 'Unknown' });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    logger.info(`User ${user.email} logged in successfully`, { userId: user.id, role: user.role });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '24h'
        }
      }
    });
  } catch (error) {
    logger.error('Login master error', { error: error instanceof Error ? error.message : 'Unknown', stack: (error as any)?.stack });
    next(error);
  }
});

// Login por CNPJ + Email + Senha (autentica no banco do tenant)
router.post('/login-tenant', async (req, res, next) => {
  try {
    const { cnpj, email, password } = req.body as { cnpj?: string; email?: string; password?: string };
    logger.info('Login (tenant) attempt', { email, cnpj });

    if (!cnpj || !email || !password) {
      throw new AppError('CNPJ, email and password are required', 400);
    }

    const onlyDigits = cnpj.replace(/\D/g, '');

    const tenant = await prismaMaster.tenant.findFirst({
      where: { OR: [{ cnpj }, { cnpj: onlyDigits }], status: 'active' }
    });

    if (!tenant) {
      logger.warn('Tenant login failed: tenant not found or inactive', { cnpj });
      throw new AppError('Tenant not found or inactive', 404, 'TENANT_NOT_FOUND');
    }

    const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
    logger.info('Resolved tenant DB URL', { tenantDbUrl });

    const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

    let user;
    try {
      user = await tenantPrisma.user.findUnique({ where: { email: email.toLowerCase() } });
    } catch (queryErr) {
      logger.error('Error querying tenant user', { error: queryErr instanceof Error ? queryErr.message : 'Unknown' });
    }

    if (!user) {
      await tenantPrisma.$disconnect();
      logger.warn('Tenant login failed: user not found', { email, cnpj });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      await tenantPrisma.$disconnect();
      logger.warn('Tenant login failed: inactive user', { email });
      throw new AppError('User account is inactive', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      await tenantPrisma.$disconnect();
      logger.warn('Tenant login failed: wrong password', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    await tenantPrisma.user.update({ where: { id: user.id }, data: { lastAccess: new Date() } });

    let permissions: string[] = [];
    try {
      const raw = user.permissions as any;
      permissions = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);
    } catch (permErr) {
      logger.error('Permission parse error (tenant)', { error: permErr instanceof Error ? permErr.message : 'Unknown' });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      permissions
    });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId: tenant.id });

    await tenantPrisma.$disconnect();

    logger.info('Tenant login success', { email, tenant: tenant.name });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions },
        tenant: { id: tenant.id, name: tenant.name, cnpj: tenant.cnpj, plan: tenant.plan },
        tokens: { accessToken, refreshToken, expiresIn: '24h' }
      }
    });
  } catch (error) {
    logger.error('Login tenant error', { error: error instanceof Error ? error.message : 'Unknown', stack: (error as any)?.stack });
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    // Verificar se o email já existe
    const existingUser = await prismaMaster.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Em ambiente multitenant, o tenant é resolvido por contexto; aqui omitimos validações de tenant

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar usuário
    const user = await prismaMaster.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: (role || 'OPERATOR'),
        permissions: '[]',
        isActive: true
      }
    });

    // Gerar tokens
    const permissions = user.permissions as string[] || [];
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      permissions
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // Registrar log de registro
    logger.info(`New user registered: ${user.email}`, { userId: user.id });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          permissions
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '24h'
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Verificar refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Buscar usuário
    const user = await prismaMaster.user.findUnique({ where: { id: payload.userId } });

    if (!user || !user.isActive) {
      throw new AppError('Invalid or inactive user', 401);
    }

    // Verificar se o tenant está ativo
    // Tenant status é gerenciado pelo contexto; omitimos validação aqui

    // Gerar novo access token
    const permissions = user.permissions as string[] || [];
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions
    });

    // Registrar log
    logger.info(`Token refreshed for user: ${user.email}`, { userId: user.id });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Solicitação de reset de senha (placeholder – implementação de envio de email futura)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, cnpj } = req.body as { email?: string; cnpj?: string };

    if (!email) {
      throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase();
    let user: any = null;
    let tenant: any = null;

    // Se veio CNPJ tentar localizar tenant e procurar usuário naquele banco
    if (cnpj) {
      const onlyDigits = cnpj.replace(/\D/g, '');
      tenant = await prismaMaster.tenant.findFirst({
        where: { OR: [{ cnpj }, { cnpj: onlyDigits }], status: 'active' }
      });
      if (tenant) {
        try {
          const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
          const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });
          user = await tenantPrisma.user.findUnique({ where: { email: normalizedEmail } });
          await tenantPrisma.$disconnect();
        } catch (tenantErr) {
          logger.error('Forgot password tenant query error', { error: tenantErr instanceof Error ? tenantErr.message : 'Unknown' });
        }
      }
    }

    // Se não achou via tenant, procurar no master (superadmin / usuários globais)
    if (!user) {
      try {
        user = await prismaMaster.user.findFirst({ where: { email: normalizedEmail } });
      } catch (masterErr) {
        logger.error('Forgot password master query error', { error: masterErr instanceof Error ? masterErr.message : 'Unknown' });
      }
    }

    if (user) {
      // Gerar e persistir token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      try {
        await prismaMaster.passwordResetToken.create({
          data: {
            userId: user.id,
            tenantId: tenant?.id || null,
            token: resetToken,
            expiresAt
          }
        });
      } catch (persistErr) {
        logger.error('Persist reset token failed', { error: persistErr instanceof Error ? persistErr.message : 'Unknown' });
      }

      // Enviar email com token de reset
      try {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
        logger.info('Password reset email sent', { userId: user.id, tenantId: tenant?.id || null });
      } catch (emailErr) {
        logger.error('Failed to send password reset email', { error: emailErr instanceof Error ? emailErr.message : 'Unknown' });
      }

      return res.json({
        success: true,
        data: {
          message: 'Se o email existir, enviaremos instruções de recuperação.',
          dev: process.env.NODE_ENV !== 'production' ? { token: resetToken } : undefined
        }
      });
    }

    // Resposta genérica se usuário não encontrado
    return res.json({
      success: true,
      data: { message: 'Se o email existir, enviaremos instruções de recuperação.' }
    });
  } catch (error) {
    next(error);
  }
});

// Reset efetivo da senha
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      throw new AppError('Token and password are required', 400, 'MISSING_FIELDS');
    }

    const resetRecord = await prismaMaster.passwordResetToken.findUnique({ where: { token } });
    if (!resetRecord) {
      throw new AppError('Invalid token', 400, 'INVALID_TOKEN');
    }
    if (resetRecord.usedAt) {
      throw new AppError('Token already used', 400, 'TOKEN_USED');
    }
    if (resetRecord.expiresAt.getTime() < Date.now()) {
      throw new AppError('Token expired', 400, 'TOKEN_EXPIRED');
    }

    const user = await prismaMaster.user.findUnique({ where: { id: resetRecord.userId } });
    if (!user || !user.isActive) {
      throw new AppError('Invalid user', 400, 'INVALID_USER');
    }

    const newHash = await hashPassword(password);
    await prismaMaster.$transaction([
      prismaMaster.user.update({ where: { id: user.id }, data: { password: newHash } }),
      prismaMaster.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } })
    ]);

    logger.info('Password successfully reset', { userId: user.id });
    return res.json({ success: true, data: { message: 'Senha redefinida com sucesso.' } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Buscar usuário para registrar log
    const user = await prismaMaster.user.findUnique({
      where: { id: userId }
    });

    if (user) {
      logger.info(`User logged out: ${user.email}`, { userId: user.id });
    }

    // Em produção, você pode invalidar tokens armazenando-os em uma blacklist
    // Por enquanto, apenas retornamos sucesso
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Obter dados do usuário autenticado
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const prisma = getTenantPrisma((req as any).tenant);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
