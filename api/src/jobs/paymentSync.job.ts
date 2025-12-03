import cron from 'node-cron';
import { prismaMaster } from '../lib/prisma.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { logger } from '../utils/logger.js';

/**
 * Job de Sincronização de Cobranças
 * 
 * Sincroniza automaticamente o status de todas as cobranças pendentes/atrasadas
 * com os gateways de pagamento (Asaas/InfinityPay)
 * 
 * Execução: A cada 5 minutos
 */
class PaymentSyncJob {
    private isRunning = false;
    private cronExpression = '*/5 * * * *'; // A cada 5 minutos
    private task: any = null;
    private lastRunAt: Date | null = null;
    private lastResult: { total: number; synced: number; errors: number } | null = null;
    private lastErrorRate: number | null = null;
    private lastLogs: Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; context?: any }> = [];
    private lastRetentionCleanup: string | null = null;

    /**
     * Inicia o job de sincronização
     */
    start() {
        logger.info('[PaymentSyncJob] Iniciando job de sincronização de cobranças');
        logger.info(`[PaymentSyncJob] Agendamento: ${this.cronExpression} (a cada 5 minutos)`);

        this.task = cron.schedule(this.cronExpression, async () => {
            await this.execute();
        });

        logger.info('[PaymentSyncJob] Job agendado com sucesso');
    }

    /**
     * Para o job de sincronização
     */
    stop() {
        if (this.task) {
            this.task.stop();
            logger.info('[PaymentSyncJob] Job interrompido');
        }
    }

    /**
     * Executa a sincronização manualmente
     */
    async execute() {
        if (this.isRunning) {
            logger.warn('[PaymentSyncJob] Job já está em execução, aguardando conclusão');
            return;
        }

        try {
            this.isRunning = true;
            const startTime = Date.now();

            this.pushLog('info', 'Iniciando sincronização de cobranças');

            const paymentService = new PaymentService(prismaMaster);
            const result = await paymentService.syncAllCharges();

            this.lastRunAt = new Date();
            this.lastResult = result;
            this.lastErrorRate = result.total > 0 ? result.errors / result.total : 0;

            const duration = Date.now() - startTime;

            this.pushLog('info', 'Sincronização concluída', {
                duration: `${duration}ms`,
                total: result.total,
                synced: result.synced,
                errors: result.errors,
            });

            // Alerta se houver muitos erros
            if (result.errors > 0 && result.errors / result.total > 0.5) {
                this.pushLog('error', 'Taxa de erro alta na sincronização', {
                    errorRate: `${((result.errors / result.total) * 100).toFixed(2)}%`,
                    errors: result.errors,
                    total: result.total,
                });
            }

        } catch (error) {
            this.pushLog('error', 'Erro ao executar sincronização', { error: error instanceof Error ? error.message : String(error) });
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Retorna o status do job
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isScheduled: this.task !== null,
            cronExpression: this.cronExpression,
            lastRunAt: this.lastRunAt,
            lastResult: this.lastResult,
            lastErrorRate: this.lastErrorRate,
        };
    }

    getLogs(limit = 100) {
        return this.lastLogs.slice(-limit);
    }

    /**
     * Atualiza a expressão cron (requer restart do job)
     */
    setCronExpression(expression: string) {
        this.cronExpression = expression;
        if (this.task) {
            this.stop();
            this.start();
            logger.info(`[PaymentSyncJob] Expressão cron atualizada para: ${expression}`);
        }
    }

    private pushLog(level: 'info' | 'warn' | 'error', message: string, context?: any) {
        const entry = { ts: new Date().toISOString(), level, message, context };
        this.lastLogs.push(entry);
        if (this.lastLogs.length > 1000) {
            this.lastLogs.splice(0, this.lastLogs.length - 1000);
        }
        // Also emit to global logger
        if (level === 'info') logger.info('[PaymentSyncJob] ' + message, context);
        else if (level === 'warn') logger.warn('[PaymentSyncJob] ' + message, context);
        else logger.error('[PaymentSyncJob] ' + message, context);

        // Persist to file (daily rotation)
        try {
            const fs = require('fs');
            const path = require('path');
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            const date = new Date();
            const fileName = `payment-sync-${date.toISOString().substring(0, 10)}.log`; // YYYY-MM-DD
            const filePath = path.join(logsDir, fileName);
            const line = JSON.stringify(entry) + '\n';
            fs.appendFile(filePath, line, (err: any) => { if (err) logger.warn('Falha ao gravar log de payment-sync', { err: err.message }); });

            // Retention cleanup (once per day)
            const today = date.toISOString().substring(0, 10);
            if (this.lastRetentionCleanup !== today) {
                this.lastRetentionCleanup = today;
                const retentionDays = Number(process.env.PAYMENT_SYNC_LOG_RETENTION_DAYS || '7');
                try {
                    const files = fs.readdirSync(logsDir);
                    const nowMs = Date.now();
                        files.filter((f: string) => f.startsWith('payment-sync-') && f.endsWith('.log')).forEach((f: string) => {
                            const fp = path.join(logsDir, f);
                            const stat = fs.statSync(fp);
                            const ageDays = (nowMs - stat.mtimeMs) / (1000 * 60 * 60 * 24);
                            if (ageDays > retentionDays) {
                                try { fs.unlinkSync(fp); } catch {}
                            }
                        });
                } catch (e: any) {
                    logger.warn('Falha na limpeza de retenção de logs payment-sync', { error: e.message });
                }
            }

            // Compress if threshold exceeded and compression enabled
            const compressionEnabled = (process.env.PAYMENT_SYNC_LOG_COMPRESSION_ENABLED || 'false') === 'true';
            if (compressionEnabled) {
                const thresholdKb = Number(process.env.PAYMENT_SYNC_LOG_COMPRESSION_THRESHOLD_KB || '512');
                try {
                    const stat = fs.statSync(filePath);
                    const sizeKb = stat.size / 1024;
                    const gzPath = filePath + '.gz';
                    if (sizeKb > thresholdKb && !fs.existsSync(gzPath)) {
                        const zlib = require('zlib');
                        const inp = fs.createReadStream(filePath);
                        const out = fs.createWriteStream(gzPath);
                        inp.pipe(zlib.createGzip()).pipe(out).on('finish', () => {
                            // Keep original or remove? Remove to save space.
                            fs.unlink(filePath, () => {});
                            logger.info('[PaymentSyncJob] Log diário comprimido', { file: gzPath, originalSizeKb: sizeKb.toFixed(2) });
                        });
                    }
                } catch {}
            }
        } catch {}
    }
}

// Singleton instance
export const paymentSyncJob = new PaymentSyncJob();

/**
 * Inicializa o job de sincronização de pagamentos
 * Deve ser chamado no startup da aplicação
 */
export function initPaymentSyncJob() {
    try {
        // Verificar se o job está habilitado via env
        const isEnabled = process.env.PAYMENT_SYNC_JOB_ENABLED !== 'false';

        if (!isEnabled) {
            logger.info('[PaymentSyncJob] Job desabilitado via variável de ambiente');
            return;
        }

        // Configurar expressão cron personalizada se fornecida
        const customCron = process.env.PAYMENT_SYNC_CRON_EXPRESSION;
        if (customCron) {
            paymentSyncJob.setCronExpression(customCron);
        }

        paymentSyncJob.start();

    } catch (error) {
        logger.error('[PaymentSyncJob] Falha ao inicializar job de sincronização:', error);
    }
}

export default paymentSyncJob;
