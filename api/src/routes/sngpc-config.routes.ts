import { Router, Request, Response, NextFunction } from 'express';
import { sngpcSncmService } from '../services/sngpc-sncm.service.js';
import { requirePermissions } from '../middleware/permissions.js';
import { PERMISSIONS } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';

/**
 * SNGPC Configuration Routes
 * 
 * Endpoints para gerenciar envio automático para SNGPC/SNCM
 * - POST   /api/v1/sngpc/enable        → Ativar envio automático
 * - POST   /api/v1/sngpc/disable       → Desativar envio automático
 * - GET    /api/v1/sngpc/config        → Obter configuração atual
 * - GET    /api/v1/sngpc/status        → Obter status de sincronização
 * - POST   /api/v1/sngpc/sync          → Sincronizar manualmente
 * - GET    /api/v1/sngpc/history       → Obter histórico de sincronizações
 */

const router = Router();

// ================================================================
// ENDPOINTS
// ================================================================

/**
 * POST /api/v1/sngpc/enable
 * 
 * Ativar envio automático de movimentações para SNGPC/SNCM
 * 
 * Permissão: REGULATORY_MANAGE
 * 
 * Response:
 * {
 *   "success": true,
 *   "config": {
 *     "tenantId": "TENANT-UUID",
 *     "autoSyncEnabled": true,
 *     "syncInterval": 60,
 *     "apiUrl": "https://sngpc.anvisa.gov.br/api/v1",
 *     "nextSyncAt": "2025-12-28T21:00:00Z"
 *   },
 *   "message": "Envio automático habilitado com sucesso"
 * }
 */
router.post(
  '/enable',
  requirePermissions([PERMISSIONS.REGULATORY_MANAGE_SNGPC]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;
      const userId = req.user?.userId as string;

      const config = await sngpcSncmService.enableAutoSync(tenantId);

      logger.info(`[SNGPC] Envio automático habilitado`, {
        tenantId,
        userId
      });

      return res.json({
        success: true,
        config,
        message: 'Envio automático habilitado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/sngpc/disable
 * 
 * Desativar envio automático de movimentações para SNGPC/SNCM
 * 
 * Permissão: REGULATORY_MANAGE
 * 
 * Response:
 * {
 *   "success": true,
 *   "config": {
 *     "tenantId": "TENANT-UUID",
 *     "autoSyncEnabled": false,
 *     "syncInterval": 60,
 *     "apiUrl": "https://sngpc.anvisa.gov.br/api/v1"
 *   },
 *   "message": "Envio automático desabilitado com sucesso"
 * }
 */
router.post(
  '/disable',
  requirePermissions([PERMISSIONS.REGULATORY_MANAGE_SNGPC]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;
      const userId = req.user?.userId as string;

      const config = await sngpcSncmService.disableAutoSync(tenantId);

      logger.info(`[SNGPC] Envio automático desabilitado`, {
        tenantId,
        userId
      });

      return res.json({
        success: true,
        config,
        message: 'Envio automático desabilitado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/sngpc/config
 * 
 * Obter configuração atual de sincronização
 * 
 * Permissão: REGULATORY_VIEW
 * 
 * Response:
 * {
 *   "success": true,
 *   "config": {
 *     "tenantId": "TENANT-UUID",
 *     "autoSyncEnabled": true,
 *     "syncInterval": 60,
 *     "apiUrl": "https://sngpc.anvisa.gov.br/api/v1",
 *     "lastSyncAt": "2025-12-28T20:00:00Z",
 *     "nextSyncAt": "2025-12-28T21:00:00Z"
 *   }
 * }
 */
router.get(
  '/config',
  requirePermissions([PERMISSIONS.REGULATORY_VIEW]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;

      const config = await sngpcSncmService.getConfig(tenantId);

      return res.json({
        success: true,
        config
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/sngpc/status
 * 
 * Obter status completo de sincronização
 * 
 * Permissão: REGULATORY_VIEW
 * 
 * Response:
 * {
 *   "success": true,
 *   "status": {
 *     "config": { ... },
 *     "syncInProgress": false,
 *     "pendingMovements": 15,
 *     "lastSync": {
 *       "id": "SYNC-ID",
 *       "success": true,
 *       "itemsSynced": 45,
 *       "itemsFailed": 0,
 *       "completedAt": "2025-12-28T20:00:00Z"
 *     },
 *     "nextSync": "2025-12-28T21:00:00Z"
 *   }
 * }
 */
router.get(
  '/status',
  requirePermissions([PERMISSIONS.REGULATORY_VIEW]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;

      const status = await sngpcSncmService.getStatus(tenantId);

      return res.json({
        success: true,
        status
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/sngpc/sync
 * 
 * Sincronizar manualmente movimentações pendentes
 * 
 * Permissão: REGULATORY_MANAGE
 * 
 * Body (opcional):
 * {
 *   "movementIds": ["ID1", "ID2"]  // IDs específicos (opcional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "result": {
 *     "syncId": "SYNC-UUID",
 *     "itemsSynced": 45,
 *     "itemsFailed": 0,
 *     "startedAt": "2025-12-28T20:00:00Z",
 *     "completedAt": "2025-12-28T20:05:00Z",
 *     "duration": 300000
 *   }
 * }
 */
router.post(
  '/sync',
  requirePermissions([PERMISSIONS.REGULATORY_MANAGE_SNGPC]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;
      const userId = req.user?.userId as string;
      const { movementIds } = req.body;

      const result = await sngpcSncmService.syncMovementData(tenantId, movementIds);

      logger.info(`[SNGPC] Sincronização manual executada`, {
        tenantId,
        userId,
        syncId: result.syncId,
        synced: result.itemsSynced,
        failed: result.itemsFailed
      });

      return res.json({
        success: true,
        result
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('em progresso')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/sngpc/history
 * 
 * Obter histórico de sincronizações
 * 
 * Permissão: REGULATORY_VIEW
 * 
 * Query Params:
 * - limit: number (padrão: 50, máx: 500)
 * - offset: number (padrão: 0)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * 
 * Response:
 * {
 *   "success": true,
 *   "history": {
 *     "items": [
 *       {
 *         "id": "HISTORY-ID",
 *         "syncId": "SYNC-ID",
 *         "success": true,
 *         "itemsSynced": 45,
 *         "itemsFailed": 0,
 *         "startedAt": "2025-12-28T20:00:00Z",
 *         "completedAt": "2025-12-28T20:05:00Z",
 *         "errorMessage": null
 *       }
 *     ],
 *     "total": 127,
 *     "limit": 50,
 *     "offset": 0
 *   }
 * }
 */
router.get(
  '/history',
  requirePermissions([PERMISSIONS.REGULATORY_VIEW]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const { items, total } = await sngpcSncmService.getSyncHistory(tenantId, {
        limit,
        offset,
        startDate,
        endDate
      });

      return res.json({
        success: true,
        history: {
          items,
          total,
          limit,
          offset
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
