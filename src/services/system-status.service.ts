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

export async function getPaymentCronStatus(apiBase = '/api/v1') {
  const res = await fetch(`${apiBase}/system/cron/payments/status`, { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao obter status do cron de pagamentos');
  const data = await res.json();
  return data.job as PaymentCronStatus;
}

export async function getBackupCronStatus(apiBase = '/api/v1') {
  const res = await fetch(`${apiBase}/system/cron/backups/status`, { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao obter status do cron de backups');
  const data = await res.json();
  return data.job as BackupCronStatus;
}

export async function cleanupBackups(tenantId?: string, apiBase = '/api/v1') {
  const url = `${apiBase}/backup/cleanup/${tenantId || ''}`.replace(/\/$/, '');
  const res = await fetch(url, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao executar limpeza de backups');
  return res.json();
}

export async function getPaymentCronLogs(limit = 100, level?: 'info' | 'warn' | 'error', apiBase = '/api/v1') {
  const url = new URL(window.location.origin + `${apiBase}/system/cron/payments/logs`);
  url.searchParams.set('limit', String(limit));
  if (level) url.searchParams.set('level', level);
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao obter logs do cron de pagamentos');
  const data = await res.json();
  return data.logs as Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; context?: any }>;
}
