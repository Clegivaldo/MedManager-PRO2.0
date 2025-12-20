import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';
import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
const UserRole = (pkg as any).UserRole as any;
import { ROLES } from '../middleware/permissions.js';

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().optional(), // Para login multi-tenant
  tenantCnpj: z.string().optional(), // Alternativa ao tenantId
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(255),
  tenantId: z.string().optional(),
  tenantCnpj: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  metadata: z.object({
    phone: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

/**
 * Controller de autenticação
 */
export class AuthController {
  /**
   * Login de usuário
   */
  login = [
    validateRequest(loginSchema),
    async (req: Request, res: Response) => {
      try {
        const { email, password, tenantId, tenantCnpj } = req.body;
        const sanitizedTenantCnpj = tenantCnpj ? tenantCnpj.replace(/\D/g, '') : undefined;
        logger.info('Login attempt received', { email, tenantId: tenantId || undefined, tenantCnpj: tenantCnpj || undefined });

        // Identificar o tenant
        let tenant;
        if (tenantId || sanitizedTenantCnpj) {
          tenant = await prismaMaster.tenant.findFirst({
            where: {
              OR: [
                { id: tenantId },
                { cnpj: sanitizedTenantCnpj }
              ],
              status: 'active'
            }
          });

          if (!tenant) {
            logger.warn('Tenant not found or inactive during login', { tenantId, tenantCnpj: sanitizedTenantCnpj });
            return res.status(404).json({
              success: false,
              message: 'Tenant not found or inactive'
            });
          }
          logger.info('Tenant resolved for login', { tenantId: tenant.id, databaseName: tenant.databaseName });
        }

        // Buscar usuário no banco apropriado
        let user;
        let userTenant;

        if (tenant) {
          const derivedUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
          logger.info('Instantiating tenant PrismaClient', { derivedUrl });
          const tenantPrisma = new PrismaClientRuntime({
            datasources: {
              db: { url: derivedUrl }
            }
          });
          try {
            user = await tenantPrisma.user.findUnique({ where: { email } });
          } catch (e) {
            logger.error('Error querying tenant user', { error: e instanceof Error ? e.message : 'Unknown' });
          } finally {
            await tenantPrisma.$disconnect();
          }
          userTenant = tenant;
        } else {
          // Buscar no banco mestre (para superadmin)
          user = await prismaMaster.user.findUnique({
            where: { email }
          });

          if (user && user.role === UserRole.SUPERADMIN) {
            userTenant = null; // Superadmin não tem tenant específico
          }
        }

        if (!user) {
          logger.warn('Login failed: user not found', { email, scope: tenant ? 'tenant' : 'master' });
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Verificar se o usuário está ativo
        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: 'User account is inactive'
          });
        }

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          logger.warn('Login failed: invalid password', { email });
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Auto-inject role default permissions if empty
        try {
          const rawPerm = typeof user.permissions === 'string' ? user.permissions : JSON.stringify(user.permissions || []);
          const parsed = rawPerm ? JSON.parse(rawPerm) : [];
          if (parsed.length === 0) {
            // Map role string to ROLES key (handles roles that may not be in Prisma enum like MANAGER/VIEWER)
            const roleStr = String(user.role).toUpperCase();
            const roleKey = (Object.keys(ROLES) as Array<keyof typeof ROLES>).find(r => r.toUpperCase() === roleStr);
            if (roleKey) {
              const defaultPerms = ROLES[roleKey].permissions;
              if (tenant) {
                const tenantPrisma = new PrismaClientRuntime({
                  datasources: { db: { url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`) } }
                });
                await tenantPrisma.user.update({
                  where: { id: user.id },
                  data: { permissions: JSON.stringify(defaultPerms) }
                });
                await tenantPrisma.$disconnect();
                user.permissions = JSON.stringify(defaultPerms);
              } else if (roleStr === 'SUPERADMIN') {
                user.permissions = JSON.stringify(defaultPerms);
              }
              logger.info('Default permissions injected', { role: roleStr, count: defaultPerms.length });
            } else {
              logger.info('No permission template for role; skipping injection', { role: roleStr });
            }
          }
        } catch (permErr) {
          logger.error('Error injecting default permissions', { error: permErr instanceof Error ? permErr.message : 'Unknown' });
        }

        // Gerar tokens
        const tokens = this.generateTokens(user, userTenant?.id || 'master');

        // Registrar login
        logger.info(`User ${user.email} logged in successfully`);

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatarUrl: user.avatarUrl,
            },
            tenant: userTenant ? {
              id: userTenant.id,
              name: userTenant.name,
              cnpj: userTenant.cnpj,
              plan: userTenant.plan,
              modulesEnabled: userTenant.modulesEnabled as string[] || []
            } : null,
            tokens
          }
        });
      } catch (error) {
        logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown' });
        res.status(500).json({
          success: false,
          message: 'Login failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  /**
   * Registrar novo usuário (apenas para admins)
   */
  register = [
    validateRequest(registerSchema),
    async (req: Request, res: Response) => {
      try {
        const { email, password, name, tenantId, tenantCnpj, role, metadata } = req.body;

        // Verificar se o usuário autenticado tem permissão para criar usuários
        if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions to create users'
          });
        }

        // Identificar o tenant
        let tenant;
        if (tenantId || tenantCnpj) {
          tenant = await prismaMaster.tenant.findFirst({
            where: {
              OR: [
                { id: tenantId },
                { cnpj: tenantCnpj }
              ],
              status: 'active'
            }
          });

          if (!tenant) {
            return res.status(404).json({
              success: false,
              message: 'Tenant not found or inactive'
            });
          }
        }

        // Verificar se o admin tem permissão para criar usuários neste tenant
        if (req.user.role === 'ADMIN' && tenant && req.user.tenantId !== tenant.id) {
          return res.status(403).json({
            success: false,
            message: 'Cannot create users for other tenants'
          });
        }

        // Criar usuário no banco apropriado
        let user;
        const hashedPassword = await bcrypt.hash(password, 12);

        if (tenant) {
          // Criar no banco do tenant
          const tenantPrisma = new PrismaClientRuntime({
            datasources: {
              db: {
                url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`)
              }
            }
          });

          // Enforce plan limits (users per tenant)
          const planLimits: Record<string, number> = { starter: 5, professional: 20, enterprise: 100 };
          const maxUsers = planLimits[tenant.plan] ?? 5;
          const currentUsers = await tenantPrisma.user.count();
          if (currentUsers >= maxUsers) {
            await tenantPrisma.$disconnect();
            return res.status(403).json({ success: false, message: 'Plan user limit reached' });
          }

          // Verificar se o email já existe
          const existingUser = await tenantPrisma.user.findUnique({
            where: { email }
          });

          if (existingUser) {
            await tenantPrisma.$disconnect();
            return res.status(409).json({
              success: false,
              message: 'User with this email already exists'
            });
          }

          user = await tenantPrisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role,
              isActive: true,
              permissions: '[]'
            }
          });

          await tenantPrisma.$disconnect();
        } else if (req.user.role === UserRole.SUPERADMIN) {
          // Superadmin pode criar no banco mestre
          user = await prismaMaster.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role: UserRole.SUPERADMIN,
              isActive: true,
              permissions: '[]'
            }
          });
        } else {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions to create users'
          });
        }

        logger.info(`User ${email} created successfully by ${req.user.email}`);

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              isActive: user.isActive
            }
          }
        });
      } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
          success: false,
          message: 'Registration failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  /**
   * Refresh token
   */
  refreshToken = [
    validateRequest(refreshTokenSchema),
    async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;

        // Verificar o refresh token
        jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, async (err: any, decoded: any) => {
          if (err) {
            return res.status(403).json({
              success: false,
              message: 'Invalid refresh token'
            });
          }

          const payload = decoded as any;

          // Buscar usuário para verificar se ainda existe e está ativo
          let user;
          let tenant;

          if (payload.tenantId && payload.tenantId !== 'master') {
            // Buscar no banco do tenant
            const tenantData = await prismaMaster.tenant.findUnique({
              where: { id: payload.tenantId }
            });

            if (tenantData) {
              const tenantPrisma = new PrismaClientRuntime({
                datasources: {
                  db: {
                    url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenantData.databaseName}`)
                  }
                }
              });

              user = await tenantPrisma.user.findUnique({
                where: { id: payload.userId }
              });

              tenant = tenantData;
              await tenantPrisma.$disconnect();
            }
          } else {
            // Buscar no banco mestre
            user = await prismaMaster.user.findUnique({
              where: { id: payload.userId }
            });
          }

          if (!user || !user.isActive) {
            return res.status(403).json({
              success: false,
              message: 'User not found or inactive'
            });
          }

          // Gerar novos tokens
          const tokens = this.generateTokens(user, payload.tenantId || 'master');

          res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { tokens }
          });
        });
      } catch (error) {
        logger.error('Refresh token error:', error);
        res.status(500).json({
          success: false,
          message: 'Token refresh failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  /**
   * Obter perfil do usuário autenticado
   */
  getProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Buscar informações completas do usuário
      let user;
      let tenant;

      if (req.user.tenantId && req.user.tenantId !== 'master') {
        const tenantData = await prismaMaster.tenant.findUnique({
          where: { id: req.user.tenantId }
        });

        if (tenantData) {
          const tenantPrisma = new PrismaClientRuntime({
            datasources: {
              db: {
                url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenantData.databaseName}`)
              }
            }
          });

          user = await tenantPrisma.user.findUnique({
            where: { id: req.user.userId }
          });

          tenant = tenantData;
          await tenantPrisma.$disconnect();
        }
      } else {
        user = await prismaMaster.user.findUnique({
          where: { id: req.user.userId }
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            permissions: user.permissions as string[] || []
          },
          tenant: tenant ? {
            id: tenant.id,
            name: tenant.name,
            cnpj: tenant.cnpj,
            plan: tenant.plan,
            status: tenant.status,
            modulesEnabled: tenant.modulesEnabled as string[] || []
          } : null
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Logout (invalidar token - em produção, adicionar blacklist)
   */
  logout = async (req: Request, res: Response) => {
    try {
      // Em produção, adicionar token a uma blacklist no Redis
      // Por enquanto, apenas retornar sucesso

      if (req.user) {
        logger.info(`User ${req.user.email} logged out`);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Gerar tokens JWT
   */
  private generateTokens(user: any, tenantId: string) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || [])
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN } as any);

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as any);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN
    };
  }
}

export const authController = new AuthController();