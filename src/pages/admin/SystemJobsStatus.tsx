import React, { useEffect, useState } from 'react';
import { getPaymentCronStatus, getBackupCronStatus, cleanupBackups, getPaymentCronLogs, PaymentCronStatus, BackupCronStatus } from '../../services/system-status.service';

export default function SystemJobsStatus() {
  const [payment, setPayment] = useState<PaymentCronStatus | null>(null);
  const [backup, setBackup] = useState<BackupCronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; context?: any }> | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([getPaymentCronStatus(), getBackupCronStatus()]);
      setPayment(p);
      setBackup(b);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleCleanup(tenantId?: string) {
    setCleanupLoading(true);
    setMessage(null);
    try {
      const res = await cleanupBackups(tenantId);
      setMessage(`Limpeza concluída: ${res.deleted} arquivos (retenção ${res.retentionDays} dias)`);
      await refresh();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setCleanupLoading(false);
    }
  }

  async function openLogs(level?: 'info' | 'warn' | 'error') {
    setLogsOpen(true);
    try {
      const data = await getPaymentCronLogs(100, level);
      setLogs(data);
    } catch (e: any) {
      setMessage(e.message);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Jobs do Sistema</h2>
      {message && <div style={{ marginBottom: 12, color: '#444' }}>{message}</div>}
      {loading && <div>Carregando status...</div>}

      {!loading && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
          <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <h3>Cron: Pagamentos</h3>
            {payment ? (
              <ul>
                <li>Agendado: {payment.isScheduled ? 'Sim' : 'Não'}</li>
                <li>Executando: {payment.isRunning ? 'Sim' : 'Não'}</li>
                <li>Cron: {payment.cronExpression}</li>
                <li>Última execução: {payment.lastRunAt ? new Date(payment.lastRunAt).toLocaleString('pt-BR') : '-'}</li>
                <li>
                  Último resultado: {payment.lastResult ? `${payment.lastResult.synced}/${payment.lastResult.total} (erros ${payment.lastResult.errors})` : '-'}
                </li>
                <li>
                  Taxa de erro: {payment.lastErrorRate != null ? (
                    <span style={{
                      color: (payment.lastErrorRate || 0) > 0.5 ? '#b00020' : '#0f766e',
                      fontWeight: (payment.lastErrorRate || 0) > 0.5 ? 700 : 500,
                    }}>
                      {(payment.lastErrorRate * 100).toFixed(2)}%
                    </span>
                  ) : '-'}
                </li>
                {(payment.lastErrorRate || 0) > 0.5 && (
                  <li style={{ marginTop: 8, color: '#b00020' }}>
                    Alerta: taxa de erro alta. Verifique credenciais/limites do gateway e logs recentes.
                  </li>
                )}
              </ul>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => openLogs()}>Logs (todos)</button>
                <button onClick={() => openLogs('error')}>Erros</button>
                <button onClick={() => openLogs('warn')}>Alertas</button>
                <button onClick={() => openLogs('info')}>Info</button>
              </div>
            ) : (
              <div>Sem dados</div>
            )}
          </section>

          <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <h3>Cron: Backups</h3>
            {backup ? (
              <ul>
                <li>Agendado: {backup.isScheduled ? 'Sim' : 'Não'}</li>
                <li>Cron: {backup.cronExpression}</li>
                <li>Última execução: {backup.lastRunAt ? new Date(backup.lastRunAt).toLocaleString('pt-BR') : '-'}</li>
                <li>Últimos deletados: {backup.lastDeleted ?? '-'}</li>
                <li>Retenção: {backup.lastRetentionDays ?? '-'}</li>
              </ul>
            ) : (
              <div>Sem dados</div>
            )}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => handleCleanup()} disabled={cleanupLoading}>
                {cleanupLoading ? 'Limpando...' : 'Limpar backups (todos)'}
              </button>
              <input id="tenantInput" placeholder="TenantId opcional" style={{ marginLeft: 8 }} />
              <button onClick={() => {
                const el = document.getElementById('tenantInput') as HTMLInputElement | null;
                handleCleanup(el?.value || undefined);
              }} disabled={cleanupLoading} style={{ marginLeft: 8 }}>
                {cleanupLoading ? 'Limpando...' : 'Limpar backups por tenant'}
              </button>
            </div>
          </section>
        </div>
      )}

      {logsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setLogsOpen(false)}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, width: '80%', margin: '5% auto' }} onClick={e => e.stopPropagation()}>
            <h3>Logs do Cron de Pagamentos</h3>
            <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 12 }}>
              {(logs || []).map((l, idx) => (
                <div key={idx} style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 6 }}>
                  <span>[{new Date(l.ts).toLocaleString('pt-BR')}]</span>
                  <span style={{ marginLeft: 8, color: l.level === 'error' ? '#b00020' : l.level === 'warn' ? '#b45309' : '#0f766e' }}>{l.level.toUpperCase()}</span>
                  <span style={{ marginLeft: 8 }}>{l.message}</span>
                  {l.context && <pre style={{ marginTop: 4, background: '#f6f6f6', padding: 8 }}>{JSON.stringify(l.context, null, 2)}</pre>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => setLogsOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
