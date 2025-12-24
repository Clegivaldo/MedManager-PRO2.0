import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import { paymentSyncJob } from '../jobs/paymentSync.job.js';
import { backupCleanupJob } from '../jobs/backupCleanup.job.js';

const systemRouter: Router = Router();

// Todas as rotas exigem SUPERADMIN
systemRouter.use(authenticateToken, requireSuperAdmin);

systemRouter.get('/cron/payments/status', (req, res) => {
  res.json({ success: true, job: paymentSyncJob.getStatus() });
});

systemRouter.get('/cron/backups/status', (req, res) => {
  res.json({ success: true, job: backupCleanupJob.getStatus() });
});

systemRouter.get('/cron/payments/logs', (req, res) => {
  const limit = Number((req.query.limit as string) || '100');
  const levelFilter = (req.query.level as string) || '';
  let logs = paymentSyncJob.getLogs(limit);
  if (levelFilter) {
    logs = logs.filter(l => l.level === levelFilter);
  }
  res.json({ success: true, logs });
});

systemRouter.get('/cron/payments/logs/file', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().substring(0, 10);
  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(process.cwd(), 'logs', `payment-sync-${date}.log`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Log file not found for date', date });
  }
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=payment-sync-${date}.log`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

export default systemRouter;
