import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../lib/prisma.js';
import { LimitsService } from '../services/limits.service.js';
import { AppError } from '../utils/errors.js';

const limitsService = new LimitsService(prismaMaster);

export class UsageController {
  static async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant não identificado', 400);

      const dashboard = await limitsService.getUsageDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (err) {
      next(err);
    }
  }
}
