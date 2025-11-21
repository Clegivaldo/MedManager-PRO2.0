# 📊 Setup de Monitoramento - MedManager PRO

Este guia descreve como configurar o stack completo de monitoramento com **Prometheus** + **Grafana** para o MedManager PRO.

## 📑 Stack de Monitoramento

- **Prometheus**: Coleta e armazenamento de métricas
- **Grafana**: Visualização de métricas e dashboards
- **Alertmanager**: Gerenciamento e envio de alertas
- **Node Exporter**: Métricas do sistema operacional
- **PostgreSQL Exporter**: Métricas do banco de dados
- **Redis Exporter**: Métricas do cache

---

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

Crie arquivo `.env.monitoring` na raiz do projeto:

```bash
# SMTP para envio de alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=alerts@medmanager.com.br
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# Destinatários dos alertas
ALERT_EMAIL_DEFAULT=equipe@medmanager.com.br
ALERT_EMAIL_CRITICAL=oncall@medmanager.com.br
ALERT_EMAIL_INFRA=infra@medmanager.com.br
ALERT_EMAIL_DBA=dba@medmanager.com.br
ALERT_EMAIL_BUSINESS=comercial@medmanager.com.br

# Slack (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty (opcional)
PAGERDUTY_SERVICE_KEY=your-service-key
```

### 2. Iniciar Stack de Monitoramento

```bash
# Iniciar todos os serviços juntos
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Ou apenas monitoramento (se backend já está rodando)
docker compose -f docker-compose.monitoring.yml up -d
```

### 3. Acessar Interfaces

- **Grafana**: http://localhost:3001
  - Usuário: `admin`
  - Senha: `admin` (trocar no primeiro login)

- **Prometheus**: http://localhost:9090
  
- **Alertmanager**: http://localhost:9093

---

## 📈 Configurar Dashboards no Grafana

### Importar Dashboards da Comunidade

1. **Node Exporter Full (ID: 1860)**
   ```
   Grafana UI → Dashboards → Import → ID: 1860
   ```
   Métricas: CPU, RAM, Disco, Rede, Processos

2. **PostgreSQL Database (ID: 9628)**
   ```
   Grafana UI → Dashboards → Import → ID: 9628
   ```
   Métricas: Conexões, Queries, Cache Hit Rate, Locks

3. **Redis Dashboard (ID: 11835)**
   ```
   Grafana UI → Dashboards → Import → ID: 11835
   ```
   Métricas: Memória, Hit Rate, Comandos, Conexões

### Dashboards Customizados

Os dashboards customizados ficam em `docker/grafana/dashboards/`. Para criar novos:

1. Criar dashboard via Grafana UI
2. Exportar JSON
3. Salvar em `docker/grafana/dashboards/`
4. Recarregar: `docker compose restart grafana`

---

## 🔔 Configurar Alertas

### SMTP (Gmail)

Para usar Gmail como servidor SMTP:

1. Ativar **Verificação em 2 etapas** na conta Google
2. Gerar **Senha de App**: https://myaccount.google.com/apppasswords
3. Usar a senha gerada em `SMTP_PASSWORD`

### Slack

1. Criar Incoming Webhook: https://api.slack.com/messaging/webhooks
2. Adicionar URL em `.env.monitoring` → `SLACK_WEBHOOK_URL`
3. Descomentar seção `slack_configs` em `docker/alertmanager/config.yml`
4. Reiniciar: `docker compose restart alertmanager`

### PagerDuty

1. Criar Integration no PagerDuty com tipo "Prometheus"
2. Copiar Integration Key
3. Adicionar em `.env.monitoring` → `PAGERDUTY_SERVICE_KEY`
4. Descomentar seção `pagerduty_configs` em `docker/alertmanager/config.yml`
5. Reiniciar: `docker compose restart alertmanager`

### Testar Alertas

```bash
# Forçar alerta de teste
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "category": "test"
    },
    "annotations": {
      "summary": "Este é um alerta de teste",
      "description": "Testando configuração de alertas do Alertmanager"
    }
  }
]'
```

Verifique se o email foi recebido em `ALERT_EMAIL_DEFAULT`.

---

## 📊 Métricas Customizadas no Backend

### Adicionar Endpoint de Métricas

Instalar biblioteca de métricas:

```bash
cd api
pnpm add prom-client
```

Criar endpoint `/metrics` no backend (`api/src/routes/metrics.ts`):

```typescript
import express from 'express';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const router = express.Router();

// Criar registry
const register = new Registry();

// Métricas HTTP
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Métricas de negócio
const subscriptionsExpiringSoon = new Gauge({
  name: 'subscriptions_expiring_soon',
  help: 'Number of subscriptions expiring in next 24h',
  registers: [register],
});

const webhookFailuresTotal = new Counter({
  name: 'webhook_failures_total',
  help: 'Total number of webhook delivery failures',
  labelNames: ['event_type'],
  registers: [register],
});

const deadLetterQueueSize = new Gauge({
  name: 'dead_letter_queue_size',
  help: 'Number of items in dead letter queue',
  labelNames: ['type'],
  registers: [register],
});

// Middleware para coletar métricas HTTP
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  
  next();
}

// Endpoint de métricas
router.get('/metrics', async (req, res) => {
  try {
    // Atualizar métricas de negócio antes de retornar
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Assinaturas expirando
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const expiringCount = await prisma.subscription.count({
      where: {
        status: 'active',
        endDate: {
          lte: tomorrow,
        },
      },
    });
    subscriptionsExpiringSoon.set(expiringCount);
    
    // Tamanho da DLQ
    const dlqCount = await prisma.deadLetterQueue.count({
      where: { status: 'pending' },
    });
    deadLetterQueueSize.set({ type: 'all' }, dlqCount);
    
    await prisma.$disconnect();
    
    // Retornar métricas
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

export { router as metricsRouter, webhookFailuresTotal };
```

Registrar no `server.ts`:

```typescript
import { metricsRouter, metricsMiddleware } from './routes/metrics.js';

// Adicionar middleware global
app.use(metricsMiddleware);

// Adicionar rota
app.use('/', metricsRouter);
```

### Reiniciar Backend

```bash
docker compose restart backend
```

Verificar métricas:
```bash
curl http://localhost:3333/metrics
```

---

## 🎯 Queries Úteis no Prometheus

### Performance

```promql
# Taxa de requisições por segundo
rate(http_requests_total[5m])

# Latência P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Taxa de erro (5xx)
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

### Sistema

```promql
# Uso de CPU
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Uso de memória
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Uso de disco
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```

### Banco de Dados

```promql
# Conexões ativas
pg_stat_activity_count

# Cache hit rate
rate(pg_stat_database_blks_hit[5m]) / (rate(pg_stat_database_blks_hit[5m]) + rate(pg_stat_database_blks_read[5m])) * 100

# Tamanho do banco
pg_database_size_bytes
```

### Negócio

```promql
# Assinaturas expirando
subscriptions_expiring_soon

# Itens na DLQ
dead_letter_queue_size

# Taxa de falha de webhooks
rate(webhook_failures_total[10m])
```

---

## 🔧 Troubleshooting

### Prometheus não coleta métricas

```bash
# Ver targets no Prometheus
http://localhost:9090/targets

# Ver logs
docker compose logs prometheus

# Testar endpoint manualmente
curl http://backend:3333/metrics
curl http://node-exporter:9100/metrics
```

### Alertas não chegam

```bash
# Ver status dos alertas
http://localhost:9093/#/alerts

# Testar SMTP
docker compose exec alertmanager amtool check-config /etc/alertmanager/config.yml

# Ver logs
docker compose logs alertmanager
```

### Grafana não conecta no Prometheus

```bash
# Testar conexão
docker compose exec grafana curl http://prometheus:9090/api/v1/status/config

# Recriar datasource
Grafana UI → Configuration → Data Sources → Delete → Add new
```

### Dashboards não aparecem

```bash
# Verificar permissões
ls -la docker/grafana/dashboards/

# Recarregar provisioning
docker compose restart grafana

# Ver logs
docker compose logs grafana | grep -i dashboard
```

---

## 📋 Manutenção

### Rotação de Dados

Prometheus retém dados por **30 dias** (configurável em `docker-compose.monitoring.yml`).

Para alterar:
```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=90d'  # 90 dias
```

### Backup de Dashboards

```bash
# Exportar todos os dashboards
docker compose exec grafana grafana-cli admin export-dashboard > dashboards-backup.json

# Ou via UI: Dashboard → Share → Export → Save to file
```

### Limpeza de Volumes

```bash
# Parar serviços
docker compose -f docker-compose.monitoring.yml down

# Remover dados antigos
docker volume rm medmanager-pro20_prometheus_data
docker volume rm medmanager-pro20_grafana_data

# Reiniciar (vai criar volumes limpos)
docker compose -f docker-compose.monitoring.yml up -d
```

---

## 🌐 Produção

### Expor via Caddy

Adicionar ao `Caddyfile`:

```caddyfile
# Grafana
grafana.seu-dominio.com {
    reverse_proxy grafana:3000
    
    # Autenticação básica (opcional)
    basicauth {
        admin $2a$14$hashed_password
    }
}

# Prometheus (apenas interno, não expor publicamente)
prometheus.interno.seu-dominio.com {
    reverse_proxy prometheus:9090
    
    # Restringir por IP
    @internal {
        remote_ip 10.0.0.0/8 172.16.0.0/12
    }
    handle @internal {
        reverse_proxy prometheus:9090
    }
    respond 403
}
```

### Segurança

1. **Trocar senha do Grafana**: `admin` → senha forte
2. **Não expor Prometheus publicamente**: apenas rede interna
3. **Usar HTTPS**: Caddy cuida automaticamente
4. **Autenticação**: Configurar OAuth2 no Grafana (Google, GitHub, etc.)

---

## 📞 Suporte

- **Documentação Prometheus**: https://prometheus.io/docs/
- **Documentação Grafana**: https://grafana.com/docs/
- **Issues**: GitHub Issues do projeto
