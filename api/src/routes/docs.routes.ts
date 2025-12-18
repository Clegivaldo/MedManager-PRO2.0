import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { AppError } from '../middleware/errorHandler.js';
import { PERMISSIONS, requirePermissions } from '../middleware/permissions.js';
import { validatePlanLimit } from '../middleware/subscription.middleware.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Armazenamento por tenant: uploads/docs/{tenantId}/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as any).tenant?.id || 'unknown';
    const dest = path.join(process.cwd(), 'uploads', 'docs', tenantId);
    try {
      fsSync.mkdirSync(dest, { recursive: true });
    } catch { }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Upload de documento regulatório
router.post('/upload', requirePermissions([PERMISSIONS.FILE_UPLOAD]), validatePlanLimit('storage'), upload.single('file'), async (req, res, next) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new AppError('Tenant not identified', 400);
    if (!req.file) throw new AppError('File is required', 400);

    const publicUrl = `/static/docs/${tenantId}/${req.file.filename}`;
    logger.info('Document uploaded', { tenantId, filename: req.file.filename, url: publicUrl });

    res.status(201).json({ success: true, url: publicUrl, file: { name: req.file.originalname, size: req.file.size } });
  } catch (error) {
    next(error);
  }
});

// Listar documentos do tenant
router.get('/list', requirePermissions([PERMISSIONS.FILE_DOWNLOAD]), async (req, res, next) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new AppError('Tenant not identified', 400);

    const dir = path.join(process.cwd(), 'uploads', 'docs', tenantId);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      files = [];
    }

    const items = files.map(f => ({ name: f, url: `/static/docs/${tenantId}/${f}` }));
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

// Remover documento
router.delete('/delete/:filename', requirePermissions([PERMISSIONS.FILE_DELETE, PERMISSIONS.FILE_MANAGE]), async (req, res, next) => {
  try {
    const tenantId = (req as any).tenant?.id;
    const { filename } = req.params;
    if (!tenantId) throw new AppError('Tenant not identified', 400);
    if (!filename) throw new AppError('Filename is required', 400);

    const filePath = path.join(process.cwd(), 'uploads', 'docs', tenantId, filename);
    await fs.unlink(filePath);
    logger.info('Document deleted', { tenantId, filename });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
