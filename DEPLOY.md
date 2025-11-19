# Guia de Deploy - MedManager-PRO 2.0

## Pré-requisitos

### Ambiente de Desenvolvimento
- Node.js 20.x LTS
- pnpm 9.x
- Docker Desktop (Compose v2)
- PostgreSQL 15 (via Docker)
- Git

### Ambiente de Produção
- Servidor Linux (Ubuntu 22.04 LTS recomendado)
- Docker 24.x + Docker Compose v2
- PostgreSQL 15 (RDS ou container dedicado)
- Redis 7 (ElastiCache ou container)
- Mínimo: 2 vCPUs, 4GB RAM, 20GB SSD
- Recomendado: 4 vCPUs, 8GB RAM, 50GB SSD

## Variáveis de Ambiente

### Backend (`api/.env`)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medmanager_master"

# JWT
JWT_SECRET="sua-chave-secreta-256-bits"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="sua-refresh-secret-256-bits"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
NODE_ENV="production"
PORT=3333
API_VERSION="v1"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# Sefaz (produção)
SEFAZ_NFE_ENDPOINT="https://nfe.fazenda.sp.gov.br"
SEFAZ_CERT_PATH="/app/certificates"
SEFAZ_CERT_PASSWORD=""  # Melhor usar AWS Secrets Manager

# Redis (cache)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Logs
LOG_LEVEL="info"  # debug, info, warn, error
```

### Frontend (`web/.env`)

```bash
VITE_API_URL="https://api.medmanager.com/api/v1"
VITE_APP_NAME="MedManager PRO"
VITE_APP_VERSION="2.0.0"
```

## Deploy Local (Desenvolvimento)

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/MedManager-PRO2.0.git
cd MedManager-PRO2.0

# 2. Subir containers
docker compose up -d --build

# 3. Aguardar health check
Start-Sleep -Seconds 15

# 4. Aplicar migrations (se necessário)
docker exec -it medmanager-prisma-migrate npx prisma migrate deploy

# 5. Seed de dados
cd api
pnpm -s seed

# 6. Criar master admin
pnpm -s create-admin

# 7. Acessar aplicação
# API: http://localhost:3333
# Web: http://localhost:5173
# Health: http://localhost:3333/health
```

## Deploy Produção (AWS)

### 1. Infraestrutura

#### RDS PostgreSQL 15
```bash
aws rds create-db-instance \
  --db-instance-identifier medmanager-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password <senha-forte> \
  --allocated-storage 50 \
  --storage-type gp3 \
  --backup-retention-period 7 \
  --multi-az \
  --vpc-security-group-ids sg-xxxxx
```

#### ElastiCache Redis 7
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id medmanager-cache \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.small \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx
```

#### ECS Fargate
```yaml
# task-definition.json
{
  "family": "medmanager-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-api:latest",
      "portMappings": [
        {
          "containerPort": 3333,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:medmanager/db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:medmanager/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/medmanager-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3333/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 2. Build e Push de Imagens

```bash
# Configurar ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Build da API
cd api
docker build -t medmanager-api:latest -f Dockerfile .

# Tag e push
docker tag medmanager-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-api:latest

# Build do Frontend
cd ../web
docker build -t medmanager-web:latest .
docker tag medmanager-web:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-web:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-web:latest
```

### 3. Load Balancer (ALB)

```bash
# Criar Target Group
aws elbv2 create-target-group \
  --name medmanager-api-tg \
  --protocol HTTP \
  --port 3333 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Criar Application Load Balancer
aws elbv2 create-load-balancer \
  --name medmanager-alb \
  --subnets subnet-xxxx subnet-yyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application

# Criar Listener HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### 4. CloudFront (Frontend S3 + CDN)

```bash
# Criar bucket S3
aws s3 mb s3://medmanager-frontend-prod

# Build frontend
cd web
pnpm build

# Sync para S3
aws s3 sync dist/ s3://medmanager-frontend-prod --delete

# Configurar CloudFront
aws cloudfront create-distribution \
  --origin-domain-name medmanager-frontend-prod.s3.amazonaws.com \
  --default-root-object index.html
```

### 5. Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name medmanager/db-url \
  --secret-string "postgresql://postgres:senha@medmanager-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/medmanager_master"

# JWT Secret
aws secretsmanager create-secret \
  --name medmanager/jwt-secret \
  --secret-string "sua-chave-secreta-256-bits-gerada-com-openssl"

# Refresh Secret
aws secretsmanager create-secret \
  --name medmanager/jwt-refresh-secret \
  --secret-string "sua-refresh-secret-256-bits"
```

## Migrations em Produção

```bash
# Executar migrations via ECS Task
aws ecs run-task \
  --cluster medmanager-prod \
  --task-definition medmanager-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxx],securityGroups=[sg-xxxxx],assignPublicIp=DISABLED}"

# Ou via script local
export DATABASE_URL="postgresql://..."
cd api
npx prisma migrate deploy
```

## Backup e Restore

### Backup Automático (RDS)
- Backup diário automático (retention 7 dias)
- Snapshots manuais antes de deploys

### Backup Manual

```bash
# Backup via pg_dump
docker exec medmanager-postgres pg_dump -U postgres -d medmanager_master > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload para S3
aws s3 cp backup_*.sql s3://medmanager-backups/$(date +%Y-%m-%d)/
```

### Restore

```bash
# Download do S3
aws s3 cp s3://medmanager-backups/2025-11-18/backup_20251118_220000.sql .

# Restore
docker exec -i medmanager-postgres psql -U postgres -d medmanager_master < backup_20251118_220000.sql
```

## Monitoramento

### CloudWatch Alarms

```bash
# CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name medmanager-api-cpu-high \
  --alarm-description "API CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Erros 5xx
aws cloudwatch put-metric-alarm \
  --alarm-name medmanager-api-5xx-errors \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### Logs (CloudWatch Logs Insights)

```sql
-- Erros na API
fields @timestamp, @message
| filter @message like /error/
| sort @timestamp desc
| limit 100

-- Emissões de NF-e
fields @timestamp, @message
| filter @message like /NFe emission/
| stats count() by bin(5m)
```

## SSL/TLS

### Let's Encrypt (Certbot)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d api.medmanager.com -d www.medmanager.com

# Renovação automática
sudo systemctl enable certbot.timer
```

### AWS Certificate Manager

```bash
# Solicitar certificado
aws acm request-certificate \
  --domain-name medmanager.com \
  --subject-alternative-names www.medmanager.com api.medmanager.com \
  --validation-method DNS
```

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
      
      - name: Build and push API
        run: |
          cd api
          docker build -t medmanager-api:${{ github.sha }} .
          docker tag medmanager-api:${{ github.sha }} 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-api:latest
          docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/medmanager-api:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster medmanager-prod --service medmanager-api --force-new-deployment
```

## Troubleshooting

### API não responde
```bash
# Verificar logs
docker logs medmanager-api --tail 100

# Verificar saúde
curl http://localhost:3333/health

# Verificar conectividade com banco
docker exec medmanager-api npx prisma db execute --sql "SELECT 1"
```

### Erro de certificado NF-e
```bash
# Verificar validade
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/fiscal/certificate

# Logs de emissão
docker logs medmanager-api | grep "NFe emission"
```

### Performance lenta
```bash
# Checar índices do banco
docker exec -it medmanager-postgres psql -U postgres -d medmanager_master -c "\di"

# Analisar queries lentas
docker logs medmanager-api | grep "slow query"
```

## Rollback

```bash
# Voltar para versão anterior no ECS
aws ecs update-service \
  --cluster medmanager-prod \
  --service medmanager-api \
  --task-definition medmanager-api:PREVIOUS_VERSION

# Ou via Docker local
docker compose down
git checkout <commit-anterior>
docker compose up -d --build
```

## Contatos de Suporte

- **DevOps**: devops@medmanager.com
- **Backend**: backend@medmanager.com
- **Fiscal/NF-e**: fiscal@medmanager.com
- **Emergências**: +55 11 9xxxx-xxxx (plantão 24/7)

---

**Última atualização**: 2025-11-18
**Versão do guia**: 1.0.0
