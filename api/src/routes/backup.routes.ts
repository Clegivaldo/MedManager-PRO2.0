import { Router } from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { prismaMaster } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import { encryptBackupFile } from '../utils/encryption.js';
import { backupService } from '../services/backup.service.js';
import multer from 'multer';

const router: Router = Router();

// Configure multer for backup upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB max
});

// Endpoint: acionar backup do banco por tenant
router.post('/db/:tenantId', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_CREATE]), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) throw new AppError('TenantId is required', 400);

    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    // Assume campo databaseUrl no registro do tenant
    // Montar connection string a partir dos campos do tenant
    const dbUser = (tenant as any).databaseUser;
    const dbPass = (tenant as any).databasePassword;
    const dbHost = process.env.DATABASE_HOST || 'localhost';
    const dbPort = process.env.DATABASE_PORT || '5432';
    const dbName   = (tenant as any).databaseName;
    if (!dbUser || !dbPass || !dbName) throw new AppError('Tenant database credentials not configured', 400);
    const connectionString = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
    if (!connectionString) throw new AppError('Tenant connection string not configured', 400);

    const outputDir = path.join(process.cwd(), 'backups', tenantId);
    fsSync.mkdirSync(outputDir, { recursive: true });

    // Parse connection string
    const uri = new URL(connectionString);
    const pgUser = decodeURIComponent(uri.username);
    const pgPass = decodeURIComponent(uri.password);
    const pgHost = uri.hostname;
    const pgPort = uri.port || '5432';
    const pgDb = uri.pathname.replace('/', '');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sqlFile = path.join(outputDir, `${tenantId}-${pgDb}-${timestamp}.sql`);
    const zipFile = `${sqlFile}.zip`;

    logger.info('Starting tenant DB backup (pg_dump)', { tenantId, db: pgDb, host: pgHost, port: pgPort, outputDir });

    // Run pg_dump directly (server-side), no PowerShell required
    const env = { ...process.env, PGPASSWORD: pgPass };
    const args = ['-h', pgHost, '-p', pgPort, '-U', pgUser, '-d', pgDb, '-F', 'p'];
    const pg = spawn('pg_dump', args, { env });

    const writeStream = fsSync.createWriteStream(sqlFile);
    pg.stdout.pipe(writeStream);

    let stderr = '';
    pg.stderr.on('data', (d) => { stderr += d.toString(); });

    pg.on('close', async (code) => {
      if (code !== 0) {
        logger.error('pg_dump failed', { tenantId, code, stderr });
        try { fsSync.unlinkSync(sqlFile); } catch {}
        return res.status(500).json({ success: false, code, error: stderr });
      }
      // Compress
      // Optional compress using native gzip
      try {
        const zlib = await import('zlib');
        const gzip = (zlib as any).createGzip();
        const source = fsSync.createReadStream(sqlFile);
        const destination = fsSync.createWriteStream(zipFile);
        await new Promise<void>((resolve, reject) => {
          source.pipe(gzip).pipe(destination).on('finish', resolve).on('error', reject);
        });
        try { fsSync.unlinkSync(sqlFile); } catch {}

        // Encrypt compressed backup with AES-256-GCM
        const encryptedFile = `${zipFile}.enc`;
        try {
          encryptBackupFile(zipFile, encryptedFile);
          try { fsSync.unlinkSync(zipFile); } catch {} // Remove unencrypted copy
          logger.info('Backup encrypted successfully', { tenantId, file: encryptedFile });
          return res.json({ success: true, message: 'Backup created and encrypted', file: encryptedFile });
        } catch (encErr) {
          logger.warn('Encryption failed, keeping unencrypted backup', { err: (encErr as Error).message });
          return res.json({ success: true, message: 'Backup created (encryption skipped)', file: zipFile });
        }
      } catch (err) {
        logger.warn('Compression failed, keeping .sql', { err: (err as Error).message });
        // Try to encrypt the uncompressed SQL
        const encryptedFile = `${sqlFile}.enc`;
        try {
          encryptBackupFile(sqlFile, encryptedFile);
          try { fsSync.unlinkSync(sqlFile); } catch {}
          return res.json({ success: true, message: 'Backup created and encrypted (no compression)', file: encryptedFile });
        } catch (encErr) {
          logger.warn('Encryption failed for .sql backup', { err: (encErr as Error).message });
          return res.json({ success: true, message: 'Backup created', file: sqlFile });
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// List backups for tenant
router.get('/list/:tenantId', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_VIEW]), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) throw new AppError('TenantId is required', 400);
    const dir = path.join(process.cwd(), 'backups', tenantId);
    const files = await fs.readdir(dir).catch(() => []);
    const items = await Promise.all(files.map(async (name) => {
      const fp = path.join(dir, name);
      const stat = await fs.stat(fp).catch(() => null);
      return stat ? { name, size: stat.size, modifiedAt: stat.mtime.toISOString(), path: fp } : null;
    }));
    res.json({ success: true, items: items.filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

// Cleanup old backups by BACKUP_RETENTION_DAYS
router.post('/cleanup/:tenantId?', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_MANAGE]), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || '30');
    const baseDir = path.join(process.cwd(), 'backups');
    const now = Date.now();

    const targets: string[] = [];
    if (tenantId) {
      targets.push(path.join(baseDir, tenantId));
    } else {
      const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => [] as any);
      for (const e of entries) if (e.isDirectory()) targets.push(path.join(baseDir, e.name));
    }

    let deleted = 0;
    for (const dir of targets) {
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

    logger.info('Backup cleanup completed', { retentionDays, deleted });
    res.json({ success: true, deleted, retentionDays });
  } catch (error) {
    next(error);
  }
});

// Download backup file
router.get('/download/:tenantId/:backupFileName', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_DOWNLOAD]), async (req, res, next) => {
  try {
    const { tenantId, backupFileName } = req.params;
    if (!tenantId || !backupFileName) throw new AppError('TenantId and backupFileName required', 400);

    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    // Security: Prevent path traversal attacks
    const backupPath = path.join(process.cwd(), 'backups', tenantId, backupFileName);
    const realPath = path.resolve(backupPath);
    const allowedDir = path.resolve(path.join(process.cwd(), 'backups', tenantId));
    
    if (!realPath.startsWith(allowedDir)) {
      throw new AppError('Invalid backup file path', 400);
    }

    // Check file exists
    if (!fsSync.existsSync(backupPath)) {
      throw new AppError('Backup file not found', 404);
    }

    // Get file stats for logging
    const stat = fsSync.statSync(backupPath);
    logger.info('Backup download started', { tenantId, backupFileName, sizeBytes: stat.size });

    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    res.setHeader('Content-Length', stat.size);
    
    // Stream file to client
    const stream = fsSync.createReadStream(backupPath);
    
    stream.on('error', (error) => {
      logger.error('Stream error during backup download', { tenantId, backupFileName, error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error downloading backup' });
      }
    });

    stream.on('end', () => {
      logger.info('Backup download completed', { tenantId, backupFileName });
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Restore backup (upload encrypted/compressed backup file)
router.post('/restore/:tenantId', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_RESTORE]), upload.single('file'), async (req, res, next) => {
  let tempFilePath: string | null = null;
  try {
    const { tenantId } = req.params;
    if (!tenantId) throw new AppError('TenantId is required', 400);
    if (!req.file) throw new AppError('Backup file required', 400);

    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    // Save uploaded file temporarily
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uploadDir = path.join(process.cwd(), 'backups', tenantId);
    fsSync.mkdirSync(uploadDir, { recursive: true });
    
    tempFilePath = path.join(uploadDir, `restore-${timestamp}-${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);
    logger.info('Backup file uploaded for restore', { tenantId, fileName: req.file.originalname, sizeBytes: req.file.size });

    // Validate backup file
    const validation = await backupService.validateBackupFile(tempFilePath);
    if (!validation.valid) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw new AppError(`Invalid backup file: ${validation.message}`, 400);
    }

    logger.info('Backup validation passed', { tenantId, ...validation });

    // Restore from backup
    const result = await backupService.restoreFromBackup(tenantId, tempFilePath);
    
    // Archive successful restore
    const archivedPath = path.join(uploadDir, `restore-success-${timestamp}-${req.file.originalname}`);
    await fs.rename(tempFilePath, archivedPath).catch(() => {});
    tempFilePath = null;

    logger.info('Backup restoration completed successfully', { tenantId, ...result });
    res.json({ success: true, ...result, archivedAt: archivedPath });

  } catch (error) {
    // Cleanup temp file
    if (tempFilePath && fsSync.existsSync(tempFilePath)) {
      try { fsSync.unlinkSync(tempFilePath); } catch {}
    }
    next(error);
  }
});

// Get backup info/validation
router.get('/info/:tenantId/:backupFileName', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_VIEW]), async (req, res, next) => {
  try {
    const { tenantId, backupFileName } = req.params;
    if (!tenantId || !backupFileName) throw new AppError('TenantId and backupFileName required', 400);

    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    // Security: Prevent path traversal
    const backupPath = path.join(process.cwd(), 'backups', tenantId, backupFileName);
    const realPath = path.resolve(backupPath);
    const allowedDir = path.resolve(path.join(process.cwd(), 'backups', tenantId));
    if (!realPath.startsWith(allowedDir)) throw new AppError('Invalid backup file path', 400);

    const info = await backupService.getBackupInfo(tenantId, backupFileName);
    res.json({ success: true, backup: info });
  } catch (error) {
    next(error);
  }
});

export default router;