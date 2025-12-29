import { Request, Response, NextFunction } from 'express';
import { sngpcSncmService } from '../services/sngpc-sncm.service.js';
import { logger } from '../utils/logger.js';

/**
 * Auto-sync Middleware para SNGPC/SNCM
 * 
 * Após registrar uma movimentação de substância controlada,
 * se auto-sync estiver habilitado, envia automaticamente para SNGPC
 * 
 * Uso:
 * app.post('/controlled-dispensation/dispense', 
 *   authenticateToken,
 *   tenantMiddleware,
 *   validateSubscription,
 *   autoSyncSngpc  // Adicionar aqui
 * )
 */

export async function autoSyncSngpc(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Armazenar a função res.json original
    const originalJson = res.json.bind(res);

    // Interceptar res.json para sincronizar após resposta bem-sucedida
    res.json = function (data: any) {
      // Se a resposta foi bem-sucedida (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Sincronizar em background (não aguardar resposta)
        handleSyncInBackground(req, data).catch((error) => {
          logger.error(`[SNGPC Auto-Sync] Erro em background sync`, {
            tenantId: req.tenant?.id,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }

      return originalJson(data);
    };

    next();

  } catch (error) {
    logger.error(`[SNGPC Auto-Sync] Erro no middleware`, {
      tenantId: req.tenant?.id,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
}

/**
 * Sincronizar em background após uma operação bem-sucedida
 */
async function handleSyncInBackground(req: Request, responseData: any): Promise<void> {
  try {
    const tenantId = req.tenant?.id as string;
    if (!tenantId) return;

    // Verificar se auto-sync está habilitado
    const config = await sngpcSncmService.getConfig(tenantId);
    if (!config.autoSyncEnabled) {
      return;
    }

    // Extrair movimento ID da resposta (se disponível)
    const movementId = responseData?.dispensation?.movementId ||
                      responseData?.movement?.id ||
                      responseData?.id;

    // Se há movimento ID, sincronizar apenas esse
    if (movementId) {
      logger.debug(`[SNGPC Auto-Sync] Iniciando sync automático`, {
        tenantId,
        movementId
      });

      const syncResult = await sngpcSncmService.syncMovementData(tenantId, [movementId]);

      if (syncResult.success) {
        logger.info(`[SNGPC Auto-Sync] Movimento sincronizado com sucesso`, {
          tenantId,
          movementId,
          syncId: syncResult.syncId
        });
      } else {
        logger.warn(`[SNGPC Auto-Sync] Erro ao sincronizar movimento`, {
          tenantId,
          movementId,
          syncId: syncResult.syncId,
          failed: syncResult.itemsFailed,
          error: syncResult.errorMessage
        });
      }
    }

  } catch (error) {
    logger.error(`[SNGPC Auto-Sync] Erro ao sincronizar em background`, {
      tenantId: req.tenant?.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Middleware para verificar status de sync antes de operações críticas
 */
export async function checkSyncStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.tenant?.id as string;
    if (!tenantId) return next();

    const status = await sngpcSncmService.getStatus(tenantId);

    // Adicionar status ao request para usar na rota
    req.sngpcStatus = status;

    next();

  } catch (error) {
    logger.error(`[SNGPC] Erro ao verificar status`, {
      tenantId: req.tenant?.id,
      error: error instanceof Error ? error.message : String(error)
    });
    next();
  }
}

/**
 * Declaração de tipos para TypeScript
 */
declare global {
  namespace Express {
    interface Request {
      sngpcStatus?: any;
    }
  }
}
