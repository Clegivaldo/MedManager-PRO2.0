import { Request, Response } from 'express';
import { tenantService, TenantCreationData } from '../services/tenant.service.js';
import { logger } from '../utils/logger.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';

// Schemas de validação
const createTenantSchema = z.object({
  name: z.string().min(3).max(255),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ must be 14 digits'),
  plan: z.enum(['starter', 'professional', 'enterprise']),
  metadata: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
  metadata: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

/**
 * Controller de gerenciamento de tenants
 */
export class TenantController {
  /**
   * Criar novo tenant
   */
  createTenant = [
    validateRequest(createTenantSchema),
    async (req: Request, res: Response) => {
      try {
        const data = req.body as TenantCreationData;
        
        logger.info(`Creating tenant: ${data.name} (${data.cnpj})`);
        
        const result = await tenantService.createTenant(data);
        
        res.status(201).json({
          success: true,
          message: 'Tenant created successfully',
          data: {
            tenant: result.tenant,
            databaseName: result.databaseName,
            folderStructure: result.folderStructure,
          }
        });
      } catch (error) {
        logger.error('Error creating tenant:', error);
        
        if (error instanceof Error && error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            message: 'Tenant with this CNPJ already exists'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error creating tenant',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  ];

  /**
   * Listar todos os tenants
   */
  listTenants = async (req: Request, res: Response) => {
    try {
      const { status, plan, search } = req.query;
      
      const filters = {
        status: status as string,
        plan: plan as string,
        search: search as string,
      };
      
      const tenants = await tenantService.listTenants(filters);
      
      res.json({
        success: true,
        data: tenants,
        count: tenants.length
      });
    } catch (error) {
      logger.error('Error listing tenants:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing tenants',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Obter tenant por ID
   */
  getTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const tenant = await tenantService.getTenant(id);
      
      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      logger.error(`Error getting tenant ${req.params.id}:`, error);
      
      if (error instanceof Error && error.message === 'Tenant not found') {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error getting tenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };

  /**
   * Atualizar tenant
   */
  updateTenant = [
    validateRequest(updateTenantSchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const data = req.body;
        
        const tenant = await tenantService.updateTenant(id, data);
        
        res.json({
          success: true,
          message: 'Tenant updated successfully',
          data: tenant
        });
      } catch (error) {
        logger.error(`Error updating tenant ${req.params.id}:`, error);
        
        if (error instanceof Error && error.message === 'Tenant not found') {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error updating tenant',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  ];

  /**
   * Desativar tenant
   */
  deactivateTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const tenant = await tenantService.deactivateTenant(id);
      
      res.json({
        success: true,
        message: 'Tenant deactivated successfully',
        data: tenant
      });
    } catch (error) {
      logger.error(`Error deactivating tenant ${req.params.id}:`, error);
      
      if (error instanceof Error && error.message === 'Tenant not found') {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error deactivating tenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };

  /**
   * Ativar tenant
   */
  activateTenant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const tenant = await tenantService.activateTenant(id);
      
      res.json({
        success: true,
        message: 'Tenant activated successfully',
        data: tenant
      });
    } catch (error) {
      logger.error(`Error activating tenant ${req.params.id}:`, error);
      
      if (error instanceof Error && error.message === 'Tenant not found') {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error activating tenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };

  /**
   * Obter estatísticas dos tenants
   */
  getTenantStats = async (req: Request, res: Response) => {
    try {
      const stats = await prismaMaster.tenant.groupBy({
        by: ['status', 'plan'],
        _count: {
          id: true
        }
      });

      const totalTenants = await prismaMaster.tenant.count();
      const activeTenants = await prismaMaster.tenant.count({ where: { status: 'active' } });
      const inactiveTenants = await prismaMaster.tenant.count({ where: { status: 'inactive' } });

      res.json({
        success: true,
        data: {
          total: totalTenants,
          active: activeTenants,
          inactive: inactiveTenants,
          byStatus: stats.filter(s => s.status !== null),
          byPlan: stats.filter(s => s.plan !== null)
        }
      });
    } catch (error) {
      logger.error('Error getting tenant stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting tenant statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export const tenantController = new TenantController();