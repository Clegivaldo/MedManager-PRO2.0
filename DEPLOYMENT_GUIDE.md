# 🚀 Guia de Deployment em Produção

## 1. Variáveis de Ambiente

Criar arquivo `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:password@db-host:5432/medmanager_prod

# API
NODE_ENV=production
PORT=3333
API_VERSION=v1

# JWT
JWT_SECRET=<gere-com-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<gere-com-openssl-rand-base64-32>
JWT_EXPIRATION=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Asaas Payment Gateway
ASAAS_ENVIRONMENT=production  # ou sandbox para testes
ASAAS_API_KEY=<sua-chave-api-asaas>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<seu-email>
SMTP_PASSWORD=<sua-senha>

# Frontend
VITE_API_URL=https://api.medmanager.com
VITE_APP_URL=https://medmanager.com

# Redis
REDIS_URL=redis://redis-host:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 2. Configuração do Banco de Dados

### Migrations
```bash
# Em produção, aplicar migrations com segurança
npx prisma migrate deploy
```

### Seed de Dados (Planos)
```bash
# Executar apenas na primeira vez
npx prisma db seed
```

## 3. Certificado SSL/TLS

```bash
# Obter certificado via Let's Encrypt
certbot certonly --standalone -d medmanager.com -d api.medmanager.com

# Renovação automática
certbot renew --quiet
```

## 4. Docker Compose em Produção

Usar arquivo `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  backend:
    image: medmanager-backend:latest
    restart: always
    ports:
      - "3333:3333"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      ASAAS_ENVIRONMENT: production
      ASAAS_API_KEY: ${ASAAS_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - db
      - redis

  frontend:
    image: medmanager-frontend:latest
    restart: always
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: https://api.medmanager.com
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: medmanager_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db_data:
  redis_data:
```

## 5. Nginx/Reverse Proxy

```nginx
upstream backend {
  server localhost:3333;
}

upstream frontend {
  server localhost:5173;
}

server {
  listen 443 ssl http2;
  server_name api.medmanager.com;

  ssl_certificate /etc/letsencrypt/live/medmanager.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/medmanager.com/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}

server {
  listen 443 ssl http2;
  server_name medmanager.com;

  ssl_certificate /etc/letsencrypt/live/medmanager.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/medmanager.com/privkey.pem;

  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
  }
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name api.medmanager.com medmanager.com;
  return 301 https://$server_name$request_uri;
}
```

## 6. Monitoramento & Alertas

### Prometheus
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'medmanager'
    static_configs:
      - targets: ['localhost:3333']
```

### Health Checks
```bash
# Verificar saúde da API
curl https://api.medmanager.com/health

# Esperado:
# {
#   "status": "ok",
#   "timestamp": "2025-11-20T20:00:00.000Z",
#   "environment": "production",
#   "version": "1.0.0"
# }
```

## 7. Backup & Disaster Recovery

### Backup Diário
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/medmanager_$DATE.sql"

docker exec medmanager-db pg_dump -U postgres medmanager_prod > $BACKUP_FILE

# Upload para S3
aws s3 cp $BACKUP_FILE s3://backups/medmanager/$BACKUP_FILE

# Manter últimos 30 dias
find /backups -name "medmanager_*.sql" -mtime +30 -delete
```

### Restauração
```bash
docker exec medmanager-db psql -U postgres medmanager_prod < /backups/medmanager_20251120_200000.sql
```

## 8. Webhook Configuration (Asaas)

### URL do Webhook
```
https://api.medmanager.com/api/v1/webhooks/asaas
```

### Eventos Monitorados
- PAYMENT_RECEIVED
- PAYMENT_CONFIRMED
- PAYMENT_OVERDUE
- PAYMENT_DELETED
- PAYMENT_REFUNDED

### Teste do Webhook
```bash
curl -X POST https://api.medmanager.com/api/v1/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test",
    "event": "PAYMENT_CONFIRMED",
    "data": {
      "id": "pay_test",
      "externalReference": "tenant_id",
      "status": "RECEIVED",
      "netValue": 29900,
      "billingType": "PIX"
    }
  }'
```

## 9. Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] Seed de planos executado
- [ ] SSL/TLS certificado obtido
- [ ] Docker images construidas
- [ ] Health checks passando
- [ ] Monitoramento configurado
- [ ] Backups automatizados
- [ ] Logs centralizados
- [ ] CDN configurado (opcional)
- [ ] Rate limiting testado
- [ ] Webhook Asaas registrado
- [ ] Testes de carga executados
- [ ] Plano de rollback documentado

## 10. Após o Deploy

### Verificações Críticas
```bash
# 1. API respondendo
curl https://api.medmanager.com/health

# 2. Database conectado
curl -H "Authorization: Bearer {token}" \
  https://api.medmanager.com/api/v1/dashboard/metrics

# 3. Webhook funcionando
curl -X POST https://api.medmanager.com/api/v1/webhooks/asaas \
  -H "Content-Type: application/json" -d '{...}'

# 4. Limites funcionando
curl -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {tenant_id}" \
  https://api.medmanager.com/api/v1/dashboard/usage
```

### Monitoramento Contínuo
- Taxa de erro < 0.1%
- Tempo de resposta p95 < 200ms
- Webhook success rate > 99.5%
- Uptime > 99.9%
- Database CPU < 70%
- Memory < 80%

## 11. Contato de Suporte

Em caso de falhas em produção:
- [Seu email/telefone]
- [Slack channel]
- [Status page]
