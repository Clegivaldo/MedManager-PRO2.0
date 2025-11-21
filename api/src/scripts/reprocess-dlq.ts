#!/usr/bin/env tsx
/**
 * Script para reprocessar Dead Letter Queue (DLQ)
 * 
 * Este script deve ser executado via cron job para tentar reprocessar
 * webhooks que falharam após todas as tentativas de retry.
 * 
 * Recomendação: Executar a cada 6 horas
 * Crontab: 0 */6 * * * cd /app && npx tsx src/scripts/reprocess-dlq.ts
 * 
 * Comportamento:
 * - Processa até 50 itens por execução (configurável)
 * - Marca itens como 'processed' ou 'failed' após tentativa
 * - Log estruturado para monitoramento
 * - Notifica falhas críticas (opcional)
 */

import { webhookRetryService } from '../services/webhook-retry.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ReprocessResult {
  total: number;
  processed: number;
  failed: number;
  duration: number;
}

interface DLQStats {
  totalPending: number;
  byType: Record<string, number>;
  oldestEntry: Date | null;
}

/**
 * Obter estatísticas da DLQ antes do processamento
 */
async function getDLQStats(): Promise<DLQStats> {
  const pending = await prisma.deadLetterQueue.findMany({
    where: {
      status: 'pending',
    },
    select: {
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const byType: Record<string, number> = {};
  pending.forEach((item) => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });

  return {
    totalPending: pending.length,
    byType,
    oldestEntry: pending.length > 0 ? pending[0].createdAt : null,
  };
}

/**
 * Enviar notificação se houver muitos itens na DLQ
 */
async function checkAndNotifyHighDLQCount(stats: DLQStats): Promise<void> {
  const THRESHOLD = parseInt(process.env.DLQ_ALERT_THRESHOLD || '100', 10);

  if (stats.totalPending > THRESHOLD) {
    console.warn('⚠️  [DLQ ALERT] High number of items in Dead Letter Queue:', {
      total: stats.totalPending,
      threshold: THRESHOLD,
      byType: stats.byType,
      oldestEntry: stats.oldestEntry,
    });

    // TODO: Integrar com sistema de alertas (email, Slack, PagerDuty, etc.)
    // await sendAlert({
    //   severity: 'warning',
    //   title: 'High DLQ Count',
    //   message: `${stats.totalPending} items pending in DLQ`,
    //   metadata: stats,
    // });
  }
}

/**
 * Limpar itens antigos já processados da DLQ
 */
async function cleanupOldProcessedItems(): Promise<number> {
  const RETENTION_DAYS = parseInt(process.env.DLQ_RETENTION_DAYS || '30', 10);

  const result = await prisma.deadLetterQueue.deleteMany({
    where: {
      status: 'processed',
      processedAt: {
        lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000),
      },
    },
  });

  if (result.count > 0) {
    console.log(`🧹 Cleaned up ${result.count} old processed DLQ items (older than ${RETENTION_DAYS} days)`);
  }

  return result.count;
}

/**
 * Executar reprocessamento da DLQ
 */
async function main(): Promise<void> {
  console.log('🔄 Starting DLQ Reprocessing Script...');
  console.log('Timestamp:', new Date().toISOString());
  console.log('---');

  const startTime = Date.now();
  const BATCH_SIZE = parseInt(process.env.DLQ_BATCH_SIZE || '50', 10);

  try {
    // 1. Obter estatísticas antes do processamento
    const statsBefore = await getDLQStats();
    console.log('📊 DLQ Statistics (Before):');
    console.log(`  Total Pending: ${statsBefore.totalPending}`);
    console.log('  By Type:', statsBefore.byType);
    if (statsBefore.oldestEntry) {
      const ageHours = Math.round((Date.now() - statsBefore.oldestEntry.getTime()) / (1000 * 60 * 60));
      console.log(`  Oldest Entry: ${statsBefore.oldestEntry.toISOString()} (${ageHours}h ago)`);
    }
    console.log('---');

    // 2. Verificar se precisa alertar sobre quantidade alta
    await checkAndNotifyHighDLQCount(statsBefore);

    // 3. Reprocessar itens
    if (statsBefore.totalPending === 0) {
      console.log('✅ No items to reprocess in DLQ');
    } else {
      console.log(`🔄 Reprocessing up to ${BATCH_SIZE} items from DLQ...`);
      const result = await webhookRetryService.reprocessDeadLetterQueue(BATCH_SIZE);

      console.log('---');
      console.log('📈 Reprocessing Results:');
      console.log(`  Total Attempted: ${result.total}`);
      console.log(`  Successfully Processed: ${result.processed} (${Math.round((result.processed / result.total) * 100)}%)`);
      console.log(`  Failed: ${result.failed} (${Math.round((result.failed / result.total) * 100)}%)`);
      console.log('  Items:', result.items.map((item) => ({
        id: item.id,
        type: item.type,
        success: item.success,
        error: item.error || 'N/A',
      })));
    }

    // 4. Limpar itens antigos processados
    console.log('---');
    await cleanupOldProcessedItems();

    // 5. Estatísticas finais
    const statsAfter = await getDLQStats();
    console.log('---');
    console.log('📊 DLQ Statistics (After):');
    console.log(`  Total Pending: ${statsAfter.totalPending}`);
    console.log('  By Type:', statsAfter.byType);

    const duration = Date.now() - startTime;
    console.log('---');
    console.log(`✅ DLQ Reprocessing completed in ${duration}ms`);

    // 6. Exit code baseado nos resultados
    if (statsAfter.totalPending > statsBefore.totalPending) {
      console.warn('⚠️  Warning: DLQ size increased during reprocessing');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during DLQ reprocessing:');
    console.error(error);

    // Log para auditoria
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: null, // Sistema
          userId: null,
          operation: 'ERROR',
          tableName: 'dead_letter_queue',
          recordId: null,
          oldData: null,
          newData: {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError) {
      console.error('Failed to log error to audit:', auditError);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
main();
