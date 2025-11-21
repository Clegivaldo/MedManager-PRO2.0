import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Sistema de Retry com Exponential Backoff para Webhooks
 * 
 * Funcionalidades:
 * - Retry automático com backoff exponencial
 * - Dead Letter Queue (DLQ) para webhooks falhados
 * - Limite configurável de tentativas
 * - Logging detalhado de falhas
 * 
 * Estratégia de retry:
 * - 1ª tentativa: imediato
 * - 2ª tentativa: 1 minuto
 * - 3ª tentativa: 5 minutos
 * - 4ª tentativa: 15 minutos
 * - 5ª tentativa: 1 hora
 * - Após 5 tentativas: move para DLQ
 */

export interface WebhookPayload {
  event: string;
  data: any;
  metadata?: {
    tenantId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number; // em milissegundos
  maxDelay?: number;
  multiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 5,
  baseDelay: 60000, // 1 minuto
  maxDelay: 3600000, // 1 hora
  multiplier: 5,
};

export class WebhookRetryService {
  private config: Required<RetryConfig>;

  constructor(config?: RetryConfig) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Calcula o delay para próxima tentativa usando exponential backoff
   */
  private calculateDelay(attemptNumber: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.multiplier, attemptNumber - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Envia webhook com retry automático
   */
  async sendWithRetry(
    url: string,
    payload: WebhookPayload,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<boolean> {
    const webhookId = await this.createWebhookLog(url, payload);

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        logger.info(`Webhook attempt ${attempt}/${this.config.maxAttempts}`, {
          webhookId,
          url,
          event: payload.event,
        });

        const success = await this.sendWebhook(url, payload, options);

        if (success) {
          await this.markWebhookSuccess(webhookId, attempt);
          logger.info(`Webhook delivered successfully on attempt ${attempt}`, {
            webhookId,
          });
          return true;
        }

        // Se falhou mas ainda temos tentativas, aguardar antes de retry
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`Webhook failed, retrying in ${delay}ms`, {
            webhookId,
            attempt,
            nextAttempt: attempt + 1,
          });

          await this.updateWebhookAttempt(webhookId, attempt, 'retry', delay);
          await this.sleep(delay);
        }

      } catch (error) {
        logger.error(`Webhook attempt ${attempt} error:`, {
          webhookId,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
        });

        await this.updateWebhookAttempt(
          webhookId,
          attempt,
          'error',
          attempt < this.config.maxAttempts ? this.calculateDelay(attempt) : 0,
          error instanceof Error ? error.message : 'Unknown error'
        );

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // Todas as tentativas falharam - mover para DLQ
    await this.moveToDeadLetterQueue(webhookId, payload);
    return false;
  }

  /**
   * Envia o webhook HTTP
   */
  private async sendWebhook(
    url: string,
    payload: WebhookPayload,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeout || 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MedManager-Webhook/1.0',
          ...options?.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Considerar sucesso apenas se status 2xx
      return response.ok;

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Cria log do webhook no banco
   */
  private async createWebhookLog(url: string, payload: WebhookPayload): Promise<string> {
    const log = await prismaMaster.webhookLog.create({
      data: {
        url,
        event: payload.event,
        payload: payload as any,
        status: 'pending',
        attempts: 0,
        tenantId: payload.metadata?.tenantId,
      },
    });

    return log.id;
  }

  /**
   * Atualiza tentativa do webhook
   */
  private async updateWebhookAttempt(
    webhookId: string,
    attemptNumber: number,
    status: 'retry' | 'error',
    nextRetryDelay: number,
    errorMessage?: string
  ): Promise<void> {
    const nextRetryAt = nextRetryDelay > 0
      ? new Date(Date.now() + nextRetryDelay)
      : null;

    await prismaMaster.webhookLog.update({
      where: { id: webhookId },
      data: {
        attempts: attemptNumber,
        status: status === 'error' ? 'failed' : 'retrying',
        lastError: errorMessage,
        nextRetryAt,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Marca webhook como sucesso
   */
  private async markWebhookSuccess(webhookId: string, attempts: number): Promise<void> {
    await prismaMaster.webhookLog.update({
      where: { id: webhookId },
      data: {
        status: 'delivered',
        attempts,
        deliveredAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Move webhook para Dead Letter Queue
   */
  private async moveToDeadLetterQueue(
    webhookId: string,
    payload: WebhookPayload
  ): Promise<void> {
    logger.error('Webhook moved to DLQ after all retry attempts failed', {
      webhookId,
      event: payload.event,
    });

    await prismaMaster.webhookLog.update({
      where: { id: webhookId },
      data: {
        status: 'dead_letter',
        updatedAt: new Date(),
      },
    });

    // Criar entrada na DLQ para análise manual
    await prismaMaster.deadLetterQueue.create({
      data: {
        type: 'webhook',
        referenceId: webhookId,
        payload: payload as any,
        reason: 'Max retry attempts exceeded',
        tenantId: payload.metadata?.tenantId,
      },
    });
  }

  /**
   * Processa webhooks na DLQ (para reprocessamento manual)
   */
  async reprocessDeadLetterQueue(limit: number = 10): Promise<number> {
    logger.info('Reprocessing Dead Letter Queue...');

    const dlqItems = await prismaMaster.deadLetterQueue.findMany({
      where: {
        type: 'webhook',
        processedAt: null,
      },
      take: limit,
      orderBy: {
        createdAt: 'asc',
      },
    });

    let successCount = 0;

    for (const item of dlqItems) {
      try {
        const webhook = await prismaMaster.webhookLog.findUnique({
          where: { id: item.referenceId },
        });

        if (!webhook) {
          logger.warn(`Webhook not found for DLQ item ${item.id}`);
          continue;
        }

        // Tentar reenviar
        const success = await this.sendWithRetry(
          webhook.url,
          webhook.payload as unknown as WebhookPayload
        );

        if (success) {
          // Marcar item da DLQ como processado
          await prismaMaster.deadLetterQueue.update({
            where: { id: item.id },
            data: {
              processedAt: new Date(),
              status: 'reprocessed',
            },
          });
          successCount++;
        }

      } catch (error) {
        logger.error(`Error reprocessing DLQ item ${item.id}:`, error);
      }
    }

    logger.info(`DLQ reprocessing complete: ${successCount}/${dlqItems.length} successful`);
    return successCount;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Exportar instância singleton
export const webhookRetryService = new WebhookRetryService();
