import cron from 'node-cron';
import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { encryptBackupFile } from '../utils/encryption.js';

/**
 * Job de Backup Automático para Todos os Tenants
 * Executa diariamente às 02:00
 * 
 * Funcionalidades:
 * - Backup de todos os tenants ativos
 * - Compressão GZIP
 * - Criptografia AES-256-GCM
 * - Registro no banco (TenantBackup)
 * - Notificação em caso de falha
 */
class TenantBackupJob {
  private task: any = null;
  private cronExpression = '0 2 * * *'; // 02:00 diariamente
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private lastStats = {
    total: 0,
    success: 0,
    failed: 0,
    duration: 0
  };

  start() {
    logger.info('[TenantBackupJob] Iniciando job de backup automático');
    
    this.task = cron.schedule(this.cronExpression, async () => {
      await this.execute();
    });
    
    logger.info('[TenantBackupJob] Job agendado com sucesso', {
      cron: this.cronExpression
    });
  }

  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('[TenantBackupJob] Job interrompido');
    }
  }

  async execute() {
    if (this.isRunning) {
      logger.warn('[TenantBackupJob] Job já está em execução, ignorando');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    logger.info('[TenantBackupJob] Iniciando backup automático de todos os tenants');

    try {
      // Buscar todos os tenants ativos
      const tenants = await prismaMaster.tenant.findMany({
        where: { status: 'active' }
      });

      logger.info(`[TenantBackupJob] ${tenants.length} tenants ativos encontrados`);

      let success = 0;
      let failed = 0;

      for (const tenant of tenants) {
        try {
          await this.backupTenant(tenant);
          success++;
          logger.info(`[TenantBackupJob] ✅ Backup concluído: ${tenant.name}`, {
            tenantId: tenant.id
          });
        } catch (error) {
          failed++;
          logger.error(`[TenantBackupJob] ❌ Falha no backup: ${tenant.name}`, {
            tenantId: tenant.id,
            error: (error as Error).message
          });

          // Criar notificação de falha
          await this.notifyBackupFailure(tenant.id, (error as Error).message);
        }
      }

      const duration = Date.now() - startTime;
      
      this.lastRunAt = new Date();
      this.lastStats = {
        total: tenants.length,
        success,
        failed,
        duration
      };

      logger.info('[TenantBackupJob] Backup automático concluído', {
        total: tenants.length,
        success,
        failed,
        durationMs: duration,
        durationMin: Math.round(duration / 60000)
      });

    } catch (error) {
      logger.error('[TenantBackupJob] Erro crítico no job de backup', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async backupTenant(tenant: any): Promise<void> {
    const dbUser = tenant.databaseUser;
    const dbPass = tenant.databasePassword; // Já vem descriptografado do service
    const dbHost = process.env.DATABASE_HOST || 'localhost';
    const dbPort = process.env.DATABASE_PORT || '5432';
    const dbName = tenant.databaseName;

    if (!dbUser || !dbPass || !dbName) {
      throw new Error('Credenciais do banco não configuradas');
    }

    const outputDir = path.join(process.cwd(), 'backups', tenant.id);
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sqlFile = path.join(outputDir, `auto-backup-${timestamp}.sql`);
    const gzipFile = `${sqlFile}.gz`;
    const encryptedFile = `${gzipFile}.enc`;

    // Executar pg_dump
    await new Promise<void>((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: dbPass };
      const args = ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-F', 'p'];
      const pg = spawn('pg_dump', args, { env });

      const writeStream = fsSync.createWriteStream(sqlFile);
      pg.stdout.pipe(writeStream);

      let stderr = '';
      pg.stderr.on('data', (d) => { stderr += d.toString(); });

      pg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump falhou: ${stderr}`));
        } else {
          resolve();
        }
      });

      pg.on('error', (err) => reject(err));
    });

    // Comprimir com GZIP
    await new Promise<void>((resolve, reject) => {
      const zlib = require('zlib');
      const source = fsSync.createReadStream(sqlFile);
      const destination = fsSync.createWriteStream(gzipFile);
      const gzip = zlib.createGzip();

      source.pipe(gzip).pipe(destination)
        .on('finish', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Remover SQL não comprimido
    await fs.unlink(sqlFile);

    // Criptografar
    encryptBackupFile(gzipFile, encryptedFile);
    await fs.unlink(gzipFile);

    // Obter tamanho do arquivo
    const stat = await fs.stat(encryptedFile);

    // Registrar no banco
    await prismaMaster.tenantBackup.create({
      data: {
        tenantId: tenant.id,
        type: 'auto',
        status: 'completed',
        path: encryptedFile,
        sizeBytes: stat.size
      }
    });

    // Criar notificação de sucesso
    await this.notifyBackupSuccess(tenant.id, stat.size);

    logger.info('[TenantBackupJob] Backup criado e criptografado', {
      tenantId: tenant.id,
      file: encryptedFile,
      sizeBytes: stat.size,
      sizeMB: Math.round(stat.size / 1024 / 1024 * 100) / 100
    });
  }

  private async notifyBackupSuccess(tenantId: string, sizeBytes: number) {
    try {
      await prismaMaster.notification.create({
        data: {
          tenantId,
          type: 'BACKUP_SUCCESS',
          severity: 'info',
          message: `Backup automático realizado com sucesso (${Math.round(sizeBytes / 1024 / 1024)}MB)`,
          read: false
        }
      });
    } catch (error) {
      logger.error('[TenantBackupJob] Erro ao criar notificação de sucesso', {
        error: (error as Error).message
      });
    }
  }

  private async notifyBackupFailure(tenantId: string, errorMessage: string) {
    try {
      await prismaMaster.notification.create({
        data: {
          tenantId,
          type: 'BACKUP_FAILURE',
          severity: 'error',
          message: `Falha no backup automático: ${errorMessage}`,
          read: false
        }
      });
    } catch (error) {
      logger.error('[TenantBackupJob] Erro ao criar notificação de falha', {
        error: (error as Error).message
      });
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.task !== null,
      cronExpression: this.cronExpression,
      lastRunAt: this.lastRunAt,
      lastStats: this.lastStats
    };
  }

  setCronExpression(expression: string) {
    this.cronExpression = expression;
    if (this.task) {
      this.stop();
      this.start();
      logger.info(`[TenantBackupJob] Expressão cron atualizada: ${expression}`);
    }
  }

  /**
   * Executar backup manualmente (para testes)
   */
  async runNow(): Promise<void> {
    logger.info('[TenantBackupJob] Executando backup manual');
    await this.execute();
  }
}

export const tenantBackupJob = new TenantBackupJob();

export function initTenantBackupJob() {
  const enabled = process.env.TENANT_BACKUP_JOB_ENABLED !== 'false';
  
  if (!enabled) {
    logger.info('[TenantBackupJob] Job desabilitado via variável de ambiente');
    return;
  }

  const customCron = process.env.TENANT_BACKUP_CRON_EXPRESSION;
  if (customCron) {
    tenantBackupJob.setCronExpression(customCron);
  }

  tenantBackupJob.start();
}

export default tenantBackupJob;
