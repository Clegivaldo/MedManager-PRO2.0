import api from './api';

export interface PaymentCronStatus {
  isRunning: boolean;
  isScheduled: boolean;
  cronExpression: string;
  lastRunAt?: string;
  lastResult?: { total: number; synced: number; errors: number };
  lastErrorRate?: number;
}

export interface BackupCronStatus {
  isScheduled: boolean;
  cronExpression: string;
  lastRunAt?: string;
  lastDeleted?: number;
  lastRetentionDays?: number;
}

export async function getPaymentCronStatus() {
  const { data } = await api.get('/system/cron/payments/status');
  return data.job as PaymentCronStatus;
}

export async function getBackupCronStatus() {
  const { data } = await api.get('/system/cron/backups/status');
  return data.job as BackupCronStatus;
}

export async function cleanupBackups(tenantId?: string) {
  const url = `/backup/cleanup/${tenantId || ''}`.replace(/\/$/, '');
  const { data } = await api.post(url);
  return data;
}

export async function getPaymentCronLogs(limit = 100, level?: 'info' | 'warn' | 'error') {
  const params: any = { limit };
  if (level) params.level = level;
  const { data } = await api.get('/system/cron/payments/logs', { params });
  return data.logs as Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; context?: any }>;
}
