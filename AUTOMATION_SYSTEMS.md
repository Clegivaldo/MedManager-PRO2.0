# 📚 Sistemas de Automação e Resiliência - MedManager PRO

Este documento descreve todos os sistemas automáticos implementados para garantir confiabilidade, observabilidade e manutenção do MedManager PRO.

## 📑 Índice

1. [Sistema de Backups](#sistema-de-backups)
2. [Cron Job de Renovação](#cron-job-de-renovação)
3. [Webhook Retry + DLQ](#webhook-retry--dlq)
4. [Monitoramento](#monitoramento)
5. [Secrets Management](#secrets-management)

---

## 1. Sistema de Backups

### 📦 Backup Automático

**Localização**: `docker/backup/backup.sh`

**Funcionalidades**:
- Backup completo de todos os bancos PostgreSQL (pg_dumpall)
- Compressão automática (gzip)
- Retenção configurável de backups antigos
- Verificação de integridade
- Notificações por email (opcional)

**Configuração**:
```bash
# Variáveis de ambiente
BACKUP_DIR=/backups                # Diretório de destino
RETENTION_DAYS=30                  # Dias de retenção
POSTGRES_HOST=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha

# Notificações (opcional)
ENABLE_EMAIL=true
EMAIL_TO=admin@example.com
```

**Execução Manual**:
```bash
# No host
docker compose exec backend bash /docker/backup/backup.sh

# Ou via crontab
0 2 * * * docker compose exec -T backend bash /docker/backup/backup.sh
```

**Crontab Recomendado**:
```cron
# Backup diário às 2h AM
0 2 * * * cd /opt/MedManager-PRO2.0 && docker compose exec -T backend bash /docker/backup/backup.sh >> /var/log/medmanager-backup.log 2>&1
```

### 🔄 Restore

**Localização**: `docker/backup/restore.sh`

**Uso**:
```bash
# Restore completo (ATENÇÃO: sobrescreve TUDO)
./restore.sh /backups/medmanager_backup_20251120_020000.sql.gz

# Restore de banco específico
./restore.sh /backups/tenant_12345678000195_20251120.sql.gz nome_banco_destino
```

**Testes de Restore** (recomendado mensalmente):
```bash
# 1. Fazer backup de teste
docker compose exec backend bash /docker/backup/backup.sh

# 2. Criar banco temporário para teste
docker compose exec db psql -U postgres -c "CREATE DATABASE test_restore;"

# 3. Restaurar neste banco
docker compose exec backend bash /docker/backup/restore.sh /backups/latest.sql.gz test_restore

# 4. Validar dados
docker compose exec db psql -U postgres test_restore -c "SELECT COUNT(*) FROM tenants;"

# 5. Limpar
docker compose exec db psql -U postgres -c "DROP DATABASE test_restore;"
```

---

## 2. Cron Job de Renovação

### 📅 Verificação de Assinaturas

**Localização**: `api/src/scripts/check-subscriptions-cron.ts`

**Funcionalidades**:
- Verifica assinaturas expirando nos próximos 7 dias
- Envia notificações por email (7, 3 e 1 dia antes)
- Atualiza status de assinaturas expiradas automaticamente
- Gera relatório de assinaturas críticas
- Registra auditoria de notificações enviadas

**Níveis de Urgência**:
- 🔴 **Crítico**: ≤ 1 dia (email urgente)
- 🟡 **Alto**: ≤ 3 dias (email de aviso)
- 🟢 **Médio**: ≤ 7 dias (lembrete)

**Execução Manual**:
```bash
cd api
npx tsx src/scripts/check-subscriptions-cron.ts
```

**Crontab Recomendado**:
```cron
# Executar diariamente às 9h AM
0 9 * * * cd /opt/MedManager-PRO2.0/api && npx tsx src/scripts/check-subscriptions-cron.ts >> /var/log/medmanager-subscriptions.log 2>&1
```

**Personalização de Emails**:
Os templates de email estão no próprio script. Para customizar:
1. Editar função `getEmailBody()` em `check-subscriptions-cron.ts`
2. Ajustar cores, textos e CTAs conforme identidade visual
3. Testar envio antes de colocar em produção

**Monitoramento**:
```sql
-- Ver notificações enviadas nos últimos 7 dias
SELECT 
  al.created_at,
  t.name as tenant,
  al.new_data->>'daysUntilExpiration' as dias,
  al.new_data->>'urgency' as urgencia
FROM audit_logs al
JOIN tenants t ON t.id = al.tenant_id
WHERE al.operation = 'NOTIFICATION'
  AND al.created_at > NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;
```

---

## 3. Webhook Retry + DLQ

### 🔄 Sistema de Retry Inteligente

**Localização**: `api/src/services/webhook-retry.service.ts`

**Arquitetura**:
```
Webhook Inicial
    ↓
┌─────────────────┐
│ Tentativa 1     │ (imediato)
└────────┬────────┘
         ↓ falha
┌─────────────────┐
│ Tentativa 2     │ (após 1 min)
└────────┬────────┘
         ↓ falha
┌─────────────────┐
│ Tentativa 3     │ (após 5 min)
└────────┬────────┘
         ↓ falha
┌─────────────────┐
│ Tentativa 4     │ (após 15 min)
└────────┬────────┘
         ↓ falha
┌─────────────────┐
│ Tentativa 5     │ (após 1 hora)
└────────┬────────┘
         ↓ falha
┌─────────────────┐
│ Dead Letter     │
│ Queue (DLQ)     │
└─────────────────┘
```

**Estratégia de Backoff**:
- Exponential backoff com multiplicador 5x
- Delay máximo: 1 hora
- Total de tentativas: 5
- Após falhas: move para DLQ

**Uso no Código**:
```typescript
import { webhookRetryService } from './services/webhook-retry.service.js';

// Enviar webhook com retry automático
const payload = {
  event: 'payment.received',
  data: {
    subscriptionId: 'sub_123',
    amount: 99.90,
  },
  metadata: {
    tenantId: 'tenant_abc',
  },
};

const success = await webhookRetryService.sendWithRetry(
  'https://api.cliente.com/webhooks/medmanager',
  payload,
  {
    headers: {
      'X-Webhook-Secret': 'secret_token_123',
    },
    timeout: 30000, // 30s
  }
);

if (!success) {
  console.log('Webhook moved to DLQ after retries');
}
```

**Reprocessamento da DLQ**:
```bash
# Manual via script
cd api
npx tsx -e "import {webhookRetryService} from './src/services/webhook-retry.service.js'; webhookRetryService.reprocessDeadLetterQueue(50).then(console.log)"

# Ou criar cron job
0 */6 * * * cd /app && npx tsx src/scripts/reprocess-dlq.ts
```

**Monitoramento**:
```sql
-- Webhooks falhando
SELECT 
  event,
  COUNT(*) as total,
  AVG(attempts) as avg_attempts
FROM webhook_logs
WHERE status IN ('failed', 'dead_letter')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event
ORDER BY total DESC;

-- Itens na DLQ por tipo
SELECT 
  type,
  status,
  COUNT(*) as count
FROM dead_letter_queue
GROUP BY type, status;
```

**Limpeza da DLQ** (após análise):
```sql
-- Deletar itens processados há mais de 30 dias
DELETE FROM dead_letter_queue
WHERE processed_at < NOW() - INTERVAL '30 days';
```

---

## 4. Monitoramento

### 📊 Métricas Disponíveis

**Health Check**:
```bash
# Endpoint de saúde
curl https://seu-dominio.com/health

# Via Caddy
curl https://seu-dominio.com/api/health
```

**Logs Estruturados**:
```bash
# Logs do backend
docker compose logs -f backend

# Logs do Caddy (acesso)
docker compose logs caddy | grep -i error

# Filtrar por tenant
docker compose logs backend | grep "tenantId.*tenant_abc"
```

### 🔔 Alertas Recomendados

**Configurar no seu sistema de monitoring**:

1. **Alta Taxa de Erro**:
   - Condição: Taxa de erro > 5% em 5 minutos
   - Ação: Email/SMS para equipe técnica

2. **Webhooks Falhando**:
   - Condição: > 10 webhooks na DLQ
   - Ação: Notificar equipe de integrações

3. **Assinaturas Críticas**:
   - Condição: > 5 assinaturas expirando em 24h
   - Ação: Notificar equipe comercial

4. **Espaço em Disco**:
   - Condição: Uso > 80%
   - Ação: Escalar volume ou limpar backups antigos

5. **CPU/RAM Alta**:
   - Condição: > 90% por 10 minutos
   - Ação: Investigar e considerar escalar

### 📈 Prometheus + Grafana (Opcional)

Para implementar:
```bash
# 1. Criar docker-compose.monitoring.yml
# 2. Adicionar exporters (node-exporter, postgres-exporter)
# 3. Configurar dashboards no Grafana
# 4. Configurar alertas
```

Dashboards recomendados:
- Node Exporter Full (ID: 1860)
- PostgreSQL Database (ID: 9628)
- Caddy Logs (custom)

---

## 5. Secrets Management

### 🔐 Boas Práticas

**Ambiente de Desenvolvimento**:
- Usar `.env` local (não commitado)
- Variáveis mock para testes
- Certificados de homologação

**Ambiente de Produção**:
- **AWS Secrets Manager** (recomendado)
- **HashiCorp Vault**
- **Docker Secrets**

### Migração para AWS Secrets Manager

**1. Criar secrets no AWS**:
```bash
aws secretsmanager create-secret \
  --name medmanager/prod/database \
  --secret-string '{"password":"sua_senha_segura"}'

aws secretsmanager create-secret \
  --name medmanager/prod/jwt \
  --secret-string '{"secret":"seu_jwt_secret","refresh":"seu_refresh_secret"}'
```

**2. Atualizar docker-compose.prod.yml**:
```yaml
services:
  backend:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    external: true
    name: medmanager_db_password
  jwt_secret:
    external: true
    name: medmanager_jwt_secret
```

**3. Script de inicialização** para buscar secrets:
```bash
#!/bin/bash
# Buscar secrets do AWS e popular .env
aws secretsmanager get-secret-value \
  --secret-id medmanager/prod/database \
  --query SecretString --output text | \
  jq -r '.password' > /tmp/db_password

export POSTGRES_PASSWORD=$(cat /tmp/db_password)
# ... repetir para outros secrets

docker compose up -d
```

---

## 📋 Checklist de Manutenção

### Diário
- [ ] Verificar health checks
- [ ] Revisar logs de erro
- [ ] Verificar DLQ (itens pendentes)

### Semanal
- [ ] Analisar métricas de performance
- [ ] Revisar assinaturas expirando
- [ ] Limpar logs antigos

### Mensal
- [ ] Teste de restore de backup
- [ ] Rotação de logs
- [ ] Atualizar dependências
- [ ] Revisar e arquivar DLQ processada

### Trimestral
- [ ] Auditoria de segurança
- [ ] Revisar e ajustar alertas
- [ ] Capacidade planning
- [ ] Disaster recovery drill

---

## 🆘 Troubleshooting

### Backups falhando
```bash
# Verificar espaço em disco
df -h /backups

# Verificar permissões
ls -la /backups

# Testar conexão com PostgreSQL
docker compose exec db psql -U postgres -c "SELECT version();"
```

### Webhooks não sendo entregues
```bash
# Ver logs de webhooks
docker compose exec backend npx prisma studio
# Abrir tabela webhook_logs

# Testar manualmente
curl -X POST https://webhook-destino.com/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Cron jobs não executando
```bash
# Verificar crontab
crontab -l

# Testar execução manual
cd /opt/MedManager-PRO2.0/api
npx tsx src/scripts/check-subscriptions-cron.ts

# Ver logs
tail -f /var/log/medmanager-subscriptions.log
```

---

## 📞 Suporte

- **Documentação**: Este arquivo
- **Issues**: GitHub Issues
- **Email**: suporte@medmanager.com.br
