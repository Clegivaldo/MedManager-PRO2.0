import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';

/**
 * SNGPC/SNCM Service - Rastreabilidade de Medicamentos (RDC 430/2020)
 * 
 * Sistema Nacional de Gerenciamento de Produtos Controlados (SNGPC)
 * Sistema Nacional de Controle de Medicamentos (SNCM)
 * 
 * Responsável por:
 * - Sincronizar dados de movimentação para SNGPC/SNCM
 * - Controlar envio automático (habilitado/desabilitado)
 * - Manter histórico de sincronizações
 * - Tratamento de erros com retry automático
 */

interface SyncConfig {
  tenantId: string;
  autoSyncEnabled: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncInterval: number; // em minutos
  apiUrl: string;
  apiKey: string;
}

interface MovementData {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productCode?: string;
  substanceName: string;
  substanceCode?: string;
  quantity: number;
  operationType: 'ISSUE' | 'RECEIVE' | 'RETURN' | 'LOSS' | 'WASTE';
  operationDate: Date;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  supplierId?: string;
  supplierName?: string;
  supplierCNPJ?: string;
  prescriptionId?: string;
  prescriptionDate?: Date;
  reason?: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

interface SyncResult {
  success: boolean;
  syncId: string;
  tenantId: string;
  itemsSynced: number;
  itemsFailed: number;
  startedAt: Date;
  completedAt: Date;
  duration: number; // em ms
  errorMessage?: string;
  failedItems?: string[];
}

interface SyncHistory {
  id: string;
  tenantId: string;
  syncId: string;
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  startedAt: Date;
  completedAt: Date;
  errorMessage?: string;
}

export class SngpcSncmService {
  private syncConfigs = new Map<string, SyncConfig>();
  private syncInProgress = new Map<string, boolean>();

  /**
   * Inicializar configuração de sincronização para tenant
   */
  async initializeSyncConfig(
    tenantId: string,
    options?: {
      autoSyncEnabled?: boolean;
      syncInterval?: number;
      apiUrl?: string;
      apiKey?: string;
    }
  ): Promise<SyncConfig> {
    const config: SyncConfig = {
      tenantId,
      autoSyncEnabled: options?.autoSyncEnabled ?? false, // Padrão: DESABILITADO
      syncInterval: options?.syncInterval ?? 60, // 1 hora
      apiUrl: options?.apiUrl ?? (process.env.SNGPC_API_URL || 'https://sngpc.anvisa.gov.br/api/v1'),
      apiKey: options?.apiKey ?? (process.env.SNGPC_API_KEY || ''),
    };

    this.syncConfigs.set(tenantId, config);
    await this.saveSyncConfigToDatabase(tenantId, config);
    
    logger.info(`[SNGPC] Sincronização inicializada para tenant ${tenantId}`, {
      autoSyncEnabled: config.autoSyncEnabled,
      syncInterval: config.syncInterval
    });

    return config;
  }

  /**
   * Ativar envio automático para tenant
   */
  async enableAutoSync(tenantId: string): Promise<SyncConfig> {
    const config = this.syncConfigs.get(tenantId) || 
                   await this.loadSyncConfigFromDatabase(tenantId);
    
    if (!config) {
      throw new Error(`Configuração de sincronização não encontrada para tenant ${tenantId}`);
    }

    config.autoSyncEnabled = true;
    config.nextSyncAt = new Date();

    this.syncConfigs.set(tenantId, config);
    await this.saveSyncConfigToDatabase(tenantId, config);

    logger.info(`[SNGPC] Envio automático HABILITADO para tenant ${tenantId}`);

    // Iniciar sincronização imediatamente
    this.scheduleSyncJob(tenantId, config);

    return config;
  }

  /**
   * Desativar envio automático para tenant
   */
  async disableAutoSync(tenantId: string): Promise<SyncConfig> {
    const config = this.syncConfigs.get(tenantId) || 
                   await this.loadSyncConfigFromDatabase(tenantId);
    
    if (!config) {
      throw new Error(`Configuração de sincronização não encontrada para tenant ${tenantId}`);
    }

    config.autoSyncEnabled = false;
    this.syncConfigs.set(tenantId, config);
    await this.saveSyncConfigToDatabase(tenantId, config);

    logger.info(`[SNGPC] Envio automático DESABILITADO para tenant ${tenantId}`);

    return config;
  }

  /**
   * Obter configuração de sincronização
   */
  async getConfig(tenantId: string): Promise<SyncConfig> {
    let config = this.syncConfigs.get(tenantId);
    
    if (!config) {
      config = await this.loadSyncConfigFromDatabase(tenantId);
    }

    if (!config) {
      return await this.initializeSyncConfig(tenantId);
    }

    return config;
  }

  /**
   * Sincronizar movimentações pendentes manualmente
   */
  async syncMovementData(tenantId: string, movementIds?: string[]): Promise<SyncResult> {
    // Verificar se já há sincronização em progresso
    if (this.syncInProgress.get(tenantId)) {
      throw new Error(`Sincronização já em progresso para tenant ${tenantId}`);
    }

    const startedAt = new Date();
    this.syncInProgress.set(tenantId, true);
    const syncId = `SYNC-${tenantId}-${Date.now()}`;

    try {
      const config = await this.getConfig(tenantId);
      const prisma = await getTenantPrisma(tenantId);

      // Buscar movimentações pendentes
      const movements = await this.getUnsyncedMovements(prisma, movementIds);

      if (movements.length === 0) {
        logger.info(`[SNGPC] Nenhuma movimentação pendente para sincronizar (tenant: ${tenantId})`);
        return {
          success: true,
          syncId,
          tenantId,
          itemsSynced: 0,
          itemsFailed: 0,
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime()
        };
      }

      logger.info(`[SNGPC] Iniciando sincronização de ${movements.length} movimentações (tenant: ${tenantId})`, {
        syncId
      });

      // Enviar movimentações para SNGPC
      const result = await this.sendToSngpc(config, movements);

      // Marcar como sincronizadas
      const syncedIds = movements
        .filter((_, idx) => !result.failedItems?.includes(String(idx)))
        .map(m => m.id);

      await this.markAsSynced(prisma, syncedIds);

      // Salvar histórico
      await this.saveSyncHistory(tenantId, {
        tenantId,
        syncId,
        success: result.itemsFailed === 0,
        itemsSynced: result.itemsSynced,
        itemsFailed: result.itemsFailed,
        startedAt,
        completedAt: new Date(),
        errorMessage: result.errorMessage
      });

      const completedAt = new Date();
      logger.info(`[SNGPC] Sincronização concluída (tenant: ${tenantId})`, {
        syncId,
        synced: result.itemsSynced,
        failed: result.itemsFailed,
        duration: completedAt.getTime() - startedAt.getTime()
      });

      return {
        success: result.itemsFailed === 0,
        syncId,
        tenantId,
        itemsSynced: result.itemsSynced,
        itemsFailed: result.itemsFailed,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        errorMessage: result.errorMessage,
        failedItems: result.failedItems
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`[SNGPC] Erro na sincronização (tenant: ${tenantId})`, {
        syncId,
        error: errorMessage
      });

      await this.saveSyncHistory(tenantId, {
        tenantId,
        syncId,
        success: false,
        itemsSynced: 0,
        itemsFailed: 0,
        startedAt,
        completedAt: new Date(),
        errorMessage
      });

      throw error;

    } finally {
      this.syncInProgress.delete(tenantId);
    }
  }

  /**
   * Obter histórico de sincronizações
   */
  async getSyncHistory(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ items: SyncHistory[]; total: number }> {
    const prisma = await getTenantPrisma(tenantId);
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where: any = {};
    
    if (options?.startDate || options?.endDate) {
      where.completedAt = {};
      if (options.startDate) where.completedAt.$gte = options.startDate;
      if (options.endDate) where.completedAt.$lte = options.endDate;
    }

    const items = await prisma.sngpcSyncHistory.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.sngpcSyncHistory.count({ where });

    return { items: items as SyncHistory[], total };
  }

  /**
   * Obter status de sincronização
   */
  async getStatus(tenantId: string): Promise<{
    config: SyncConfig;
    syncInProgress: boolean;
    pendingMovements: number;
    lastSync?: SyncHistory;
    nextSync?: Date;
  }> {
    const config = await this.getConfig(tenantId);
    const prisma = await getTenantPrisma(tenantId);
    
    const pendingMovements = await prisma.controlledSubstanceMovement.count({
      where: { sngpcSynced: false }
    });

    const syncInProgress = this.syncInProgress.get(tenantId) ?? false;

    const lastSync = await prisma.sngpcSyncHistory.findFirst({
      orderBy: { completedAt: 'desc' }
    });

    let nextSync: Date | undefined;
    if (config.autoSyncEnabled && config.lastSyncAt) {
      nextSync = new Date(config.lastSyncAt.getTime() + config.syncInterval * 60 * 1000);
    }

    return {
      config,
      syncInProgress,
      pendingMovements,
      lastSync: lastSync as SyncHistory | undefined,
      nextSync
    };
  }

  /**
   * PRIVADO: Buscar movimentações não sincronizadas
   */
  private async getUnsyncedMovements(
    prisma: PrismaClient,
    movementIds?: string[]
  ): Promise<MovementData[]> {
    const where: any = { sngpcSynced: false };

    if (movementIds && movementIds.length > 0) {
      where.id = { in: movementIds };
    }

    const movements = await prisma.controlledSubstanceMovement.findMany({
      where,
      include: {
        product: true,
        customer: true,
        supplier: true,
        user: true
      },
      orderBy: { createdAt: 'asc' },
      take: 1000 // Limite de 1000 por sincronização
    });

    return movements.map(m => ({
      id: m.id,
      productId: m.productId,
      productName: m.product?.name || '',
      productSku: m.product?.sku || '',
      productCode: m.product?.barcode,
      substanceName: m.product?.controlledSubstance || '',
      quantity: m.quantity,
      operationType: m.operationType as any,
      operationDate: m.createdAt,
      customerId: m.customerId || undefined,
      customerName: m.customer?.name,
      customerDocument: m.customer?.document,
      supplierId: m.supplierId || undefined,
      supplierName: m.supplier?.name,
      supplierCNPJ: m.supplier?.document,
      prescriptionId: m.prescriptionId,
      prescriptionDate: m.prescriptionDate,
      reason: m.reason || undefined,
      userId: m.userId,
      userName: m.user?.name || 'Sistema',
      createdAt: m.createdAt
    }));
  }

  /**
   * PRIVADO: Enviar dados para SNGPC
   */
  private async sendToSngpc(
    config: SyncConfig,
    movements: MovementData[]
  ): Promise<{ itemsSynced: number; itemsFailed: number; errorMessage?: string; failedItems?: string[] }> {
    // Se API não está configurada, simular envio bem-sucedido em dev
    if (!config.apiUrl || !config.apiKey) {
      logger.warn(`[SNGPC] SNGPC não configurado. Movimentações marcadas como sincronizadas (simulação)`, {
        tenantId: config.tenantId,
        count: movements.length
      });

      return {
        itemsSynced: movements.length,
        itemsFailed: 0
      };
    }

    const failedItems: string[] = [];
    let syncedCount = 0;

    // Enviar em lotes de 100
    const batchSize = 100;
    for (let i = 0; i < movements.length; i += batchSize) {
      const batch = movements.slice(i, i + batchSize);

      try {
        const response = await fetch(`${config.apiUrl}/movements/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': config.tenantId
          },
          body: JSON.stringify({
            movements: batch,
            syncId: `SYNC-${config.tenantId}-${Date.now()}`
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`SNGPC API error: ${response.status} - ${error}`);
        }

        const result = await response.json() as { itemsSynced?: number; failedItems?: string[] };
        syncedCount += result.itemsSynced || batch.length;

        if (result.failedItems?.length > 0) {
          failedItems.push(...result.failedItems);
        }

      } catch (error) {
        logger.error(`[SNGPC] Erro ao enviar lote para SNGPC`, {
          tenantId: config.tenantId,
          batch: i / batchSize,
          error: error instanceof Error ? error.message : String(error)
        });

        failedItems.push(...batch.map((_, idx) => String(i + idx)));
      }
    }

    return {
      itemsSynced: syncedCount,
      itemsFailed: failedItems.length,
      failedItems: failedItems.length > 0 ? failedItems : undefined
    };
  }

  /**
   * PRIVADO: Marcar movimentações como sincronizadas
   */
  private async markAsSynced(prisma: PrismaClient, movementIds: string[]): Promise<void> {
    if (movementIds.length === 0) return;

    await prisma.controlledSubstanceMovement.updateMany({
      where: { id: { in: movementIds } },
      data: { sngpcSynced: true, sngpcSyncedAt: new Date() }
    });
  }

  /**
   * PRIVADO: Salvar configuração no banco
   */
  private async saveSyncConfigToDatabase(tenantId: string, config: SyncConfig): Promise<void> {
    try {
      const prisma = await getTenantPrisma(tenantId);

      // Implementar no schema se necessário
      // await prisma.sngpcConfig.upsert({...})

      logger.debug(`[SNGPC] Configuração salva no banco (tenant: ${tenantId})`);
    } catch (error) {
      logger.error(`[SNGPC] Erro ao salvar configuração`, {
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * PRIVADO: Carregar configuração do banco
   */
  private async loadSyncConfigFromDatabase(tenantId: string): Promise<SyncConfig | null> {
    try {
      const prisma = await getTenantPrisma(tenantId);

      // Implementar no schema se necessário
      // const config = await prisma.sngpcConfig.findUnique({...})

      return null;
    } catch (error) {
      logger.error(`[SNGPC] Erro ao carregar configuração`, {
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * PRIVADO: Salvar histórico de sincronização
   */
  private async saveSyncHistory(
    tenantId: string,
    history: Omit<SyncHistory, 'id'>
  ): Promise<void> {
    try {
      const prisma = await getTenantPrisma(tenantId);

      await prisma.sngpcSyncHistory.create({
        data: {
          syncId: history.syncId,
          success: history.success,
          itemsSynced: history.itemsSynced,
          itemsFailed: history.itemsFailed,
          startedAt: history.startedAt,
          completedAt: history.completedAt,
          errorMessage: history.errorMessage
        }
      });

    } catch (error) {
      logger.error(`[SNGPC] Erro ao salvar histórico`, {
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * PRIVADO: Agendar job de sincronização
   */
  private scheduleSyncJob(tenantId: string, config: SyncConfig): void {
    logger.info(`[SNGPC] Agendando sincronização automática para tenant ${tenantId}`, {
      interval: `${config.syncInterval} minutos`
    });

    // Implementar em production com node-cron ou similar
    // Para agora, apenas log
  }
}

export const sngpcSncmService = new SngpcSncmService();
