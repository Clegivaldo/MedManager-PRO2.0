import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { decryptBackupFile } from '../utils/encryption.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import zlib from 'zlib';

/**
 * Serviço de Backup e Restore
 * Gerencia criação, encriptação, download e restauração de backups
 */
export class BackupService {
  /**
   * Restaurar banco de dados a partir de um backup encriptado
   */
  async restoreFromBackup(tenantId: string, backupFilePath: string, deleteAfter: boolean = true): Promise<{
    success: boolean;
    message: string;
    linesRestored?: number;
  }> {
    try {
      logger.info('Starting backup restoration', { tenantId, backupFilePath });

      // Validar tenant
      const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Validar arquivo exists
      if (!fsSync.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFilePath}`);
      }

      // Determinar se arquivo está encriptado
      const isEncrypted = backupFilePath.endsWith('.enc');
      let workingFile = backupFilePath;

      // Descriptografar se necessário
      if (isEncrypted) {
        logger.info('Decrypting backup file', { backupFilePath });
        const decryptedPath = backupFilePath.replace(/\.enc$/, '');
        try {
          decryptBackupFile(backupFilePath, decryptedPath);
          workingFile = decryptedPath;
          logger.info('Backup decrypted successfully', { decryptedPath });
        } catch (err) {
          throw new Error(`Failed to decrypt backup: ${(err as Error).message}`);
        }
      }

      // Descomprimir se for .gz
      const isCompressed = workingFile.endsWith('.gz');
      let sqlFilePath = workingFile;

      if (isCompressed) {
        logger.info('Decompressing backup file', { workingFile });
        sqlFilePath = workingFile.replace(/\.gz$/, '');
        await this.decompressFile(workingFile, sqlFilePath);
        logger.info('Backup decompressed successfully', { sqlFilePath });
      }

      // Restaurar com psql
      logger.info('Restoring database from SQL file', { tenantId, sqlFilePath });
      const dbUser = (tenant as any).databaseUser;
      const dbPass = (tenant as any).databasePassword;
      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const dbPort = process.env.DATABASE_PORT || '5432';
      const dbName = (tenant as any).databaseName;

      if (!dbUser || !dbPass || !dbName) {
        throw new Error('Tenant database credentials not configured');
      }

      const env = { ...process.env, PGPASSWORD: dbPass };
      
      // Usar psql para restaurar
      const restore = spawn('psql', [
        '-h', dbHost,
        '-p', dbPort,
        '-U', dbUser,
        '-d', dbName
      ], { env, stdio: ['pipe', 'pipe', 'pipe'] });

      let output = '';
      let errorOutput = '';
      let lineCount = 0;

      const sqlStream = fsSync.createReadStream(sqlFilePath);
      sqlStream.on('data', () => { lineCount++; }); // Contar linhas
      sqlStream.pipe(restore.stdin);

      restore.stdout.on('data', (data) => { output += data.toString(); });
      restore.stderr.on('data', (data) => { errorOutput += data.toString(); });

      return new Promise((resolve, reject) => {
        restore.on('close', async (code) => {
          // Cleanup
          try {
            if (isCompressed && fsSync.existsSync(sqlFilePath) && deleteAfter) {
              await fs.unlink(sqlFilePath);
            }
            if (isEncrypted && workingFile !== backupFilePath && fsSync.existsSync(workingFile) && deleteAfter) {
              await fs.unlink(workingFile);
            }
          } catch (err) {
            logger.warn('Cleanup error', { err: (err as Error).message });
          }

          if (code === 0) {
            logger.info('Database restored successfully', { tenantId, linesRestored: lineCount });
            resolve({
              success: true,
              message: `Database restored successfully (${lineCount} lines)`,
              linesRestored: lineCount
            });
          } else {
            logger.error('Database restore failed', { tenantId, code, stderr: errorOutput });
            reject(new Error(`Restore failed with code ${code}: ${errorOutput}`));
          }
        });

        restore.on('error', (err) => {
          logger.error('Restore process error', { tenantId, error: err.message });
          reject(err);
        });
      });

    } catch (error) {
      logger.error('Restore operation failed', { tenantId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Descomprimir arquivo GZIP
   */
  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const source = fsSync.createReadStream(inputPath);
      const destination = fsSync.createWriteStream(outputPath);
      const gunzip = zlib.createGunzip();

      source
        .pipe(gunzip)
        .pipe(destination)
        .on('finish', () => resolve())
        .on('error', (err) => {
          logger.error('Decompression error', { inputPath, outputPath, error: err.message });
          reject(err);
        });
    });
  }

  /**
   * Validar integridade do arquivo de backup
   * Verifica se é um SQL válido ou arquivo encriptado válido
   */
  async validateBackupFile(filePath: string): Promise<{
    valid: boolean;
    isEncrypted: boolean;
    isCompressed: boolean;
    sizeBytes: number;
    message: string;
  }> {
    try {
      if (!fsSync.existsSync(filePath)) {
        return {
          valid: false,
          isEncrypted: false,
          isCompressed: false,
          sizeBytes: 0,
          message: 'File not found'
        };
      }

      const stat = fsSync.statSync(filePath);
      const isEncrypted = filePath.endsWith('.enc');
      const isCompressed = filePath.endsWith('.gz') || filePath.endsWith('.gz.enc');

      // Verificar assinatura de arquivo encriptado
      if (isEncrypted) {
        const header = Buffer.alloc(100);
        const fd = fsSync.openSync(filePath, 'r');
        fsSync.readSync(fd, header, 0, 100, 0);
        fsSync.closeSync(fd);

        const headerStr = header.toString('utf8', 0, 10);
        const isValidHeader = headerStr.startsWith('v1:');

        if (!isValidHeader) {
          return {
            valid: false,
            isEncrypted: true,
            isCompressed,
            sizeBytes: stat.size,
            message: 'Invalid encrypted backup header (expected v1:)'
          };
        }
      }

      return {
        valid: true,
        isEncrypted,
        isCompressed,
        sizeBytes: stat.size,
        message: isEncrypted
          ? `Encrypted backup: ${(stat.size / 1024 / 1024).toFixed(2)} MB`
          : `Unencrypted backup: ${(stat.size / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      return {
        valid: false,
        isEncrypted: false,
        isCompressed: false,
        sizeBytes: 0,
        message: `Validation error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Obter informações de backup (metadata)
   */
  async getBackupInfo(tenantId: string, backupFileName: string): Promise<any> {
    try {
      const backupPath = path.join(process.cwd(), 'backups', tenantId, backupFileName);
      const stat = fsSync.statSync(backupPath);
      const validation = await this.validateBackupFile(backupPath);

      return {
        fileName: backupFileName,
        filePath: backupPath,
        sizeBytes: stat.size,
        sizeMB: (stat.size / 1024 / 1024).toFixed(2),
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
        ...validation
      };
    } catch (error) {
      throw new Error(`Failed to get backup info: ${(error as Error).message}`);
    }
  }
}

export const backupService = new BackupService();
