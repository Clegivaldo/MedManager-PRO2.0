import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class SuperAdminController {
  // Tenant Management
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
          include: {
            _count: {
              select: {
                users: true,
                products: true,
                customers: true
              }
            }
          }
        }),
        prisma.tenant.count({ where })
      ]);

      res.json({
        tenants,
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
      const {
        name,
        cnpj,
        email,
        phone,
        address,
        plan,
        adminName,
        adminEmail,
        adminPassword
      } = req.body;

      // Check if CNPJ already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { cnpj }
      });

      if (existingTenant) {
        throw new AppError('Tenant with this CNPJ already exists', 400);
      }

      // Generate database credentials
      const databaseName = `tenant_${cnpj.replace(/[^a-zA-Z0-9]/g, '')}`;
      const databaseUser = `user_${cnpj.replace(/[^a-zA-Z0-9]/g, '')}`;
      const databasePassword = uuidv4().replace(/-/g, '');

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name,
          cnpj,
          email,
          phone,
          address,
          plan,
          databaseName,
          databaseUser,
          databasePassword,
          status: 'active',
          maxUsers: this.getPlanLimit(plan, 'users'),
          maxStorageGB: this.getPlanLimit(plan, 'storage')
        }
      });

      // Create admin user for the tenant
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await this.createTenantUser(tenant.id, {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });

      res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          cnpj: tenant.cnpj,
          email: tenant.email,
          plan: tenant.plan,
          status: tenant.status,
          createdAt: tenant.createdAt
        }
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
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              customers: true,
              suppliers: true,
              invoices: true
            }
          }
        }
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

      const updatedTenant = await prisma.tenant.update({
        where: { id },
        data: updates
      });

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

      // Delete tenant record
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

  // Helper methods
  private getPlanLimit(plan: string, type: 'users' | 'storage'): number {
    const limits = {
      starter: { users: 5, storage: 10 },
      professional: { users: 20, storage: 50 },
      enterprise: { users: 100, storage: 200 }
    };
    return limits[plan as keyof typeof limits]?.[type] || 10;
  }

  private async createTenantUser(tenantId: string, userData: any) {
    // This would create a user in the tenant's database
    // For now, we'll create it in the master database
    return prisma.user.create({
      data: {
        ...userData,
        tenantId
      }
    });
  }
}