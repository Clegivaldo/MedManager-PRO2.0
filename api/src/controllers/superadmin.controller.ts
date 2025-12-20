import { Request, Response } from 'express';
import { prismaMaster } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { tenantService } from '../services/tenant.service.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { AsaasGateway } from '../services/payment/AsaasGateway.js';
import { GlobalPaymentConfigService } from '../services/payment/globalPaymentConfig.service.js';

const prisma = prismaMaster;

export class SuperAdminController {
  listTenants = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, status, plan } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (plan) where.plan = plan;

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            cnpj: true,
            plan: true,
            status: true,
            createdAt: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            subscriptionStatus: true,
            metadata: true,
            databaseName: true
          }
        }),
        prisma.tenant.count({ where })
      ]);

      // Buscar contagem de usuários para cada tenant
      const tenantsWithUsers = await Promise.all(
        tenants.map(async (tenant) => {
          try {
            const pkg = await import('@prisma/client');
            const PrismaClientRuntime = (pkg as any).PrismaClient as any;
            const { config } = await import('../config/environment.js');
            const tenantDbUrl = config.DATABASE_URL.replace(/\/([\w]+)$/, `/${tenant.databaseName}`);
            const tenantPrisma = new PrismaClientRuntime({ datasources: { db: { url: tenantDbUrl } } });

            const userCount = await tenantPrisma.user.count();
            await tenantPrisma.$disconnect();

            return {
              ...tenant,
              userCount,
              daysRemaining: tenant.subscriptionEnd
                ? Math.ceil((new Date(tenant.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
            };
          } catch (err) {
            logger.error(`Error getting user count for tenant ${tenant.id}:`, err);
            return {
              ...tenant,
              userCount: 0,
              daysRemaining: tenant.subscriptionEnd
                ? Math.ceil((new Date(tenant.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
            };
          }
        })
      );

      res.json({
        tenants: tenantsWithUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing tenants:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  createTenant = async (req: Request, res: Response) => {
    try {
      const { name, cnpj, plan, email, phone, address } = req.body;

      const metadata = { email, phone, address };
      const result = await tenantService.createTenant({ name, cnpj, plan, metadata });

      res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          cnpj: result.tenant.cnpj,
          plan: result.tenant.plan,
          status: result.tenant.status,
          createdAt: result.tenant.createdAt
        },
        databaseName: result.databaseName,
        folderStructure: result.folderStructure
      });
    } catch (error) {
      logger.error('Error creating tenant:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      res.json({ tenant });
    } catch (error) {
      logger.error('Error getting tenant:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const updatedTenant = await tenantService.updateTenant(id, updates);

      res.json({
        message: 'Tenant updated successfully',
        tenant: updatedTenant
      });
    } catch (error) {
      logger.error('Error updating tenant:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  deleteTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      await prisma.tenant.delete({
        where: { id }
      });

      res.json({ message: 'Tenant deleted successfully' });
    } catch (error) {
      logger.error('Error deleting tenant:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateTenantStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const updatedTenant = await prisma.tenant.update({ where: { id }, data: { status } });

      res.json({
        message: 'Tenant status updated successfully',
        tenant: updatedTenant
      });
    } catch (error) {
      logger.error('Error updating tenant status:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateTenantPlan = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { plan, effectiveDate } = req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const updatedTenant = await prisma.tenant.update({ where: { id }, data: { plan } });

      res.json({
        message: 'Tenant plan updated successfully',
        tenant: updatedTenant
      });
    } catch (error) {
      logger.error('Error updating tenant plan:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getSystemOverview = async (req: Request, res: Response) => {
    try {
      const [totalTenants, activeTenants, recentTenants] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: 'active' } }),
        prisma.tenant.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, cnpj: true, plan: true, status: true, createdAt: true }
        })
      ]);

      res.json({
        overview: {
          totalTenants,
          activeTenants,
          recentTenants
        }
      });
    } catch (error) {
      logger.error('Error getting system overview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getDashboardMetrics = async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalTenants,
        activeTenants,
        sngpcSubmissions,
        sncmTracking,
        guia33Generated,
        expiringSoon,
        expired,
        lowStock,
        invoicesAuthorized,
        invoicesCancelled,
        invoicesDraft,
        unreadNotifications
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: 'active' } }),
        prisma.sngpcSubmission.count({ where: { submissionDate: { gte: last30Days } } }),
        prisma.medicationTracking.count({ where: { trackedAt: { gte: last30Days } } }),
        prisma.guia33.count({ where: { generatedAt: { gte: last30Days } } }),
        prisma.batch.count({ where: { expirationDate: { gt: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
        prisma.batch.count({ where: { expirationDate: { lte: now } } }),
        prisma.stock.count({ where: { availableQuantity: { lte: 5 } } }),
        prisma.invoice.count({ where: { status: 'AUTHORIZED', issueDate: { gte: last30Days } } }),
        prisma.invoice.count({ where: { status: 'CANCELLED', issueDate: { gte: last30Days } } }),
        prisma.invoice.count({ where: { status: 'DRAFT' } }),
        prisma.notification.count({ where: { read: false } })
      ]);

      res.json({
        metrics: {
          tenants: { total: totalTenants, active: activeTenants },
          regulatory: {
            sngpcSubmissionsLast30Days: sngpcSubmissions,
            sncmTrackingLast30Days: sncmTracking,
            guia33GeneratedLast30Days: guia33Generated
          },
          inventory: {
            expiringSoonCount: expiringSoon,
            expiredCount: expired,
            lowStockCount: lowStock
          },
          invoices: {
            authorizedLast30Days: invoicesAuthorized,
            cancelledLast30Days: invoicesCancelled,
            draftCount: invoicesDraft
          },
          notifications: { unread: unreadNotifications }
        }
      });
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 50,
        tenantId,
        userId,
        action,
        startDate,
        endDate
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: {
              select: { id: true, name: true, cnpj: true }
            }
          }
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getNotifications = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, tenantId, userId, severity } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (severity) where.severity = severity;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: { select: { id: true, name: true, cnpj: true } },
            user: { select: { id: true, name: true, email: true } }
          }
        }),
        prisma.notification.count({ where })
      ]);

      res.json({
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  extendSubscription = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { months = 1 } = req.body;

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const currentEnd = tenant.subscriptionEnd || new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + months);

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionEnd: newEnd,
          subscriptionStatus: 'active'
        }
      });

      res.json({
        message: `Subscription extended by ${months} month(s)`,
        subscription: {
          tenantId: updatedTenant.id,
          subscriptionEnd: updatedTenant.subscriptionEnd,
          subscriptionStatus: updatedTenant.subscriptionStatus
        }
      });
    } catch (error) {
      logger.error('Error extending subscription:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  fixUserPermissions = async (req: Request, res: Response) => {
    try {
      const pkg = await import('@prisma/client');
      const PrismaClientRuntime = (pkg as any).PrismaClient as any;
      const { ROLES } = await import('../middleware/permissions.js');
      const { config } = await import('../config/environment.js');

      const results = {
        tenantsProcessed: 0,
        usersUpdated: 0,
        usersSkipped: 0,
        errors: [] as string[]
      };

      // Buscar todos os tenants ativos
      const tenants = await prisma.tenant.findMany({
        where: { status: 'active' }
      });

      for (const tenant of tenants) {
        try {
          const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
          const tenantPrisma = new PrismaClientRuntime({
            datasources: { db: { url: tenantDbUrl } }
          });

          const users = await tenantPrisma.user.findMany();

          for (const user of users) {
            try {
              const rawPerm = typeof user.permissions === 'string'
                ? user.permissions
                : JSON.stringify(user.permissions || []);

              const parsed = rawPerm ? JSON.parse(rawPerm) : [];

              if (parsed.length === 0) {
                const roleStr = String(user.role).toUpperCase();
                const roleKey = (Object.keys(ROLES) as Array<keyof typeof ROLES>).find(
                  r => r.toUpperCase() === roleStr
                );

                if (roleKey) {
                  const defaultPerms = ROLES[roleKey].permissions;

                  await tenantPrisma.user.update({
                    where: { id: user.id },
                    data: { permissions: JSON.stringify(defaultPerms) }
                  });

                  results.usersUpdated++;
                  logger.info(`Permissions fixed for user ${user.email} (${user.role})`, {
                    tenant: tenant.name,
                    permissionsCount: defaultPerms.length
                  });
                } else {
                  results.usersSkipped++;
                }
              } else {
                results.usersSkipped++;
              }
            } catch (userError) {
              const errorMsg = `Error updating user ${user.email}: ${userError instanceof Error ? userError.message : 'Unknown'}`;
              results.errors.push(errorMsg);
              logger.error(errorMsg);
            }
          }

          await tenantPrisma.$disconnect();
          results.tenantsProcessed++;
        } catch (tenantError) {
          const errorMsg = `Error processing tenant ${tenant.name}: ${tenantError instanceof Error ? tenantError.message : 'Unknown'}`;
          results.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Processar SUPERADMINs no banco master
      const masterUsers = await prisma.user.findMany({
        where: { role: 'SUPERADMIN' }
      });

      for (const user of masterUsers) {
        try {
          const rawPerm = typeof user.permissions === 'string'
            ? user.permissions
            : JSON.stringify(user.permissions || []);

          const parsed = rawPerm ? JSON.parse(rawPerm) : [];

          if (parsed.length === 0) {
            const defaultPerms = ROLES.SUPERADMIN.permissions;

            await prisma.user.update({
              where: { id: user.id },
              data: { permissions: JSON.stringify(defaultPerms) }
            });

            results.usersUpdated++;
            logger.info(`Permissions fixed for SUPERADMIN ${user.email}`, {
              permissionsCount: defaultPerms.length
            });
          } else {
            results.usersSkipped++;
          }
        } catch (userError) {
          const errorMsg = `Error updating SUPERADMIN ${user.email}: ${userError instanceof Error ? userError.message : 'Unknown'}`;
          results.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      res.json({
        success: true,
        message: 'User permissions fix completed',
        data: results
      });
    } catch (error) {
      logger.error('Error fixing user permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private getPlanLimit(plan: string, type: 'users' | 'storage'): number {
    const limits = {
      starter: { users: 5, storage: 10 },
      professional: { users: 20, storage: 50 },
      enterprise: { users: 100, storage: 200 }
    };
    return limits[plan as keyof typeof limits]?.[type] || 10;
  }

  // Payment Methods
  listCharges = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, status, method } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (method) where.paymentMethod = method;
      if (search) {
        where.OR = [
          { gatewayChargeId: { contains: String(search), mode: 'insensitive' } },
          { tenant: { name: { contains: String(search), mode: 'insensitive' } } }
        ];
      }

      const [charges, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: { select: { id: true, name: true } }
          }
        }),
        prisma.payment.count({ where })
      ]);

      res.json({
        charges: charges.map(c => ({
          id: c.id,
          chargeId: c.gatewayChargeId || c.id,
          tenantId: c.tenantId,
          tenantName: c.tenant?.name,
          amount: c.amount.toString(),
          currency: c.currency,
          paymentMethod: c.paymentMethod,
          gateway: c.gateway,
          gatewayChargeId: c.gatewayChargeId,
          status: c.status,
          dueDate: c.dueDate,
          paidAt: c.paidAt,
          pixQrCode: c.pixQrCode,
          pixQrCodeBase64: c.pixQrCodeBase64,
          boletoUrl: c.boletoUrl,
          boletoBarcode: c.boletoBarcode,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing charges:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  createChargeForTenant = async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { amount, paymentMethod, description, billingCycle } = req.body;

      if (!amount || !paymentMethod) {
        throw new AppError('amount e paymentMethod são obrigatórios', 400);
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new AppError('Tenant não encontrado', 404);

      const paymentService = new PaymentService(prisma);
      const { charge, payment } = await paymentService.createCharge({
        tenantId,
        amount: parseFloat(String(amount)),
        description: description || `Cobrança ${paymentMethod}`,
        paymentMethod: paymentMethod.toUpperCase() as 'PIX' | 'BOLETO',
        billingCycle: (billingCycle as 'monthly' | 'annual') || 'monthly'
      });

      res.json({
        success: true,
        message: 'Cobrança criada com sucesso',
        data: {
          chargeId: charge.id,
          status: payment.status,
          dueDate: charge.dueDate,
          pixQrCode: charge.pixQrCode,
          pixQrCodeBase64: charge.pixQrCodeBase64,
          boletoUrl: charge.boletoUrl,
          boletoBarcode: (payment.metadata as any)?.barcode
        }
      });
    } catch (error) {
      logger.error('Error creating charge for tenant:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  };

  syncChargeStatus = async (req: Request, res: Response) => {
    try {
      const { chargeId } = req.params;

      const paymentService = new PaymentService(prisma);
      const result = await paymentService.syncChargeStatus(chargeId);

      res.json({
        success: true,
        message: result.updated ? 'Status sincronizado com sucesso' : 'Status já estava atualizado',
        data: {
          chargeId: result.payment.gatewayChargeId,
          status: result.payment.status,
          updated: result.updated
        }
      });
    } catch (error) {
      logger.error('Error syncing charge status:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  };

  importChargesFromAsaas = async (req: Request, res: Response) => {
    try {
      const configService = new GlobalPaymentConfigService(prisma);
      const config = await configService.getFullConfig();

      if (!config.asaasApiKey) {
        throw new AppError('Asaas API Key não configurada', 400);
      }

      const asaasGateway = new AsaasGateway({
        apiKey: config.asaasApiKey,
        environment: config.asaasEnvironment
      });

      const { data: charges } = await asaasGateway.listAllCharges({ limit: 100 });

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const charge of charges) {
        try {
          const existing = await prisma.payment.findUnique({
            where: { gatewayChargeId: charge.id }
          });

          if (existing) {
            skipped++;
            continue;
          }

          const tenant = await prisma.tenant.findFirst({
            where: {
              metadata: {
                path: ['asaasCustomerId'],
                equals: charge.customer
              }
            }
          });

          if (!tenant) {
            logger.warn(`Tenant não encontrado para customer ${charge.customer}, cobrança ${charge.id}`);
            errors++;
            continue;
          }

          await prisma.payment.create({
            data: {
              tenantId: tenant.id,
              amount: charge.value,
              paymentMethod: charge.billingType.toLowerCase(),
              gateway: 'asaas',
              gatewayChargeId: charge.id,
              status: this.mapAsaasStatus(charge.status),
              dueDate: new Date(charge.dueDate),
              pixQrCodeBase64: charge.pixQrCode?.encodedImage,
              pixQrCode: charge.pixQrCode?.payload,
              boletoUrl: charge.bankSlipUrl,
              metadata: {
                invoiceNumber: charge.invoiceNumber,
                paymentLink: charge.paymentLink,
                importedFromAsaas: true,
                importedAt: new Date().toISOString()
              },
            },
          });

          imported++;
        } catch (error) {
          logger.error(`Erro ao importar cobrança ${charge.id}:`, error);
          errors++;
        }
      }

      res.json({
        success: true,
        message: `Importação concluída: ${imported} importadas, ${skipped} já existiam, ${errors} erros`,
        data: { imported, skipped, errors, total: charges.length }
      });
    } catch (error) {
      logger.error('Error importing charges from Asaas:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao importar cobranças'
        });
      }
    }
  };

  syncAllCharges = async (req: Request, res: Response) => {
    try {
      const paymentService = new PaymentService(prisma);
      const result = await paymentService.syncAllCharges();

      res.json({
        success: true,
        message: `Sincronização concluída: ${result.synced} atualizadas, ${result.errors} erros`,
        data: result
      });
    } catch (error) {
      logger.error('Error syncing all charges:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao sincronizar cobranças'
        });
      }
    }
  };

  cancelCharge = async (req: Request, res: Response) => {
    try {
      const { chargeId } = req.params;
      const { reason } = req.body;

      const paymentService = new PaymentService(prisma);
      await paymentService.cancelCharge(chargeId);

      logger.info(`Charge ${chargeId} cancelled`, { reason });

      res.json({
        success: true,
        message: 'Cobrança cancelada com sucesso',
        data: {
          chargeId,
          status: 'cancelled'
        }
      });
    } catch (error) {
      logger.error('Error cancelling charge:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao cancelar cobrança'
        });
      }
    }
  };

  listBillingAccounts = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const [accounts, total] = await Promise.all([
        prisma.billingAccount.findMany({
          skip: offset,
          take: Number(limit),
          orderBy: { dueDate: 'desc' },
          include: {
            tenant: { select: { id: true, name: true } }
          }
        }),
        prisma.billingAccount.count()
      ]);

      res.json({
        accounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing billing accounts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private mapAsaasStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'confirmed';
      case 'OVERDUE':
        return 'overdue';
      case 'CANCELLED':
        return 'cancelled';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}