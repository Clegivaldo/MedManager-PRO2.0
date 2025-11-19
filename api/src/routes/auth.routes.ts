import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { prismaMaster } from '../lib/prisma.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  extractTokenFromHeader
} from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/environment.js';

const router: Router = Router();

// Rotas públicas de autenticação
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Buscar usuário no tenant específico
    const user = await prismaMaster.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar se o usuário está ativo
    if (!user.isActive) {
      throw new AppError('User account is inactive', 401);
    }

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Atualizar último acesso
    await prismaMaster.user.update({
      where: { id: user.id },
      data: { lastAccess: new Date() }
    });

    // Gerar tokens
    const permissions = user.permissions as string[] || [];
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // Registrar log de login
    logger.info(`User ${user.email} logged in successfully`, {
      userId: user.id,
      role: user.role
    });

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
    next(error);
  }
});

// Login por CNPJ + Email + Senha (autentica no banco do tenant)
router.post('/login-tenant', async (req, res, next) => {
  try {
    const { cnpj, email, password } = req.body as { cnpj?: string; email?: string; password?: string };

    if (!cnpj || !email || !password) {
      throw new AppError('CNPJ, email and password are required', 400);
    }

    // Normalizar CNPJ (com e sem máscara)
    const onlyDigits = cnpj.replace(/\D/g, '');

    // Buscar tenant por CNPJ (permitindo ambos formatos)
    const tenant = await prismaMaster.tenant.findFirst({
      where: {
        OR: [
          { cnpj },
          { cnpj: onlyDigits }
        ],
        status: 'active'
      }
    });

    if (!tenant) {
      throw new AppError('Tenant not found or inactive', 404, 'TENANT_NOT_FOUND');
    }

    // Conectar no banco do tenant
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`)
        }
      }
    });

    // Buscar usuário por email
    const user = await tenantPrisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      await tenantPrisma.$disconnect();
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      await tenantPrisma.$disconnect();
      throw new AppError('User account is inactive', 401);
    }

    // Validar senha
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      await tenantPrisma.$disconnect();
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Atualizar último acesso
    await tenantPrisma.user.update({ where: { id: user.id }, data: { lastAccess: new Date() } });

    const permissions = (user.permissions as any) || [];
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      permissions
    });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId: tenant.id });

    await tenantPrisma.$disconnect();

    logger.info(`Tenant login success: ${email} @ ${tenant.name}`);

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
        tenant: {
          id: tenant.id,
          name: tenant.name,
          cnpj: tenant.cnpj,
          plan: tenant.plan
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

export default router;
