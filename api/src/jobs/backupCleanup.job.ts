import cron from 'node-cron';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

class BackupCleanupJob {
  private task: any = null;
  private cronExpression = '0 3 * * *'; // diariamente às 03:00
  private lastRunAt: Date | null = null;
  private lastDeleted: number | null = null;
  private lastRetentionDays: number | null = null;

  start() {
    logger.info('[BackupCleanupJob] Iniciando job de limpeza de backups');
    this.task = cron.schedule(this.cronExpression, async () => {
      await this.execute();
    });
    logger.info('[BackupCleanupJob] Job agendado com sucesso');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('[BackupCleanupJob] Job interrompido');
    }
  }

  async execute() {
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || '30');
    const baseDir = path.join(process.cwd(), 'backups');
    const now = Date.now();
    let deleted = 0;

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => [] as any);
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const dir = path.join(baseDir, e.name);
        const files = await fs.readdir(dir).catch(() => []);
        for (const f of files) {
          const fp = path.join(dir, f);
          const stat = await fs.stat(fp).catch(() => null);
          if (!stat) continue;
          const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
          if (ageDays > retentionDays) {
            await fs.unlink(fp).catch(() => {});
            deleted++;
          }
        }
      }
      this.lastRunAt = new Date();
      this.lastDeleted = deleted;
      this.lastRetentionDays = retentionDays;
      logger.info('[BackupCleanupJob] Limpeza automática concluída', { retentionDays, deleted });
    } catch (error) {
      logger.error('[BackupCleanupJob] Erro na limpeza automática:', error);
    }
  }

  getStatus() {
    return {
      isScheduled: this.task !== null,
      cronExpression: this.cronExpression,
      lastRunAt: this.lastRunAt,
      lastDeleted: this.lastDeleted,
      lastRetentionDays: this.lastRetentionDays,
    };
  }

  setCronExpression(expression: string) {
    this.cronExpression = expression;
    if (this.task) {
      this.stop();
      this.start();
      logger.info(`[BackupCleanupJob] Expressão cron atualizada para: ${expression}`);
    }
  }
}

export const backupCleanupJob = new BackupCleanupJob();

export function initBackupCleanupJob() {
  const enabled = process.env.BACKUP_CLEANUP_JOB_ENABLED !== 'false';
  if (!enabled) {
    logger.info('[BackupCleanupJob] Job desabilitado via variável de ambiente');
    return;
  }
  const customCron = process.env.BACKUP_CLEANUP_CRON_EXPRESSION;
  if (customCron) {
    backupCleanupJob.setCronExpression(customCron);
  }
  backupCleanupJob.start();
}

export default backupCleanupJob;
