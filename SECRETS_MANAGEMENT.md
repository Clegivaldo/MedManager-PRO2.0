# 🔐 Secrets Management - MedManager PRO

Este guia descreve como gerenciar secrets (senhas, tokens, chaves) de forma segura no MedManager PRO, desde desenvolvimento até produção.

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Desenvolvimento Local](#desenvolvimento-local)
3. [Docker Secrets](#docker-secrets)
4. [AWS Secrets Manager](#aws-secrets-manager)
5. [HashiCorp Vault](#hashicorp-vault)
6. [Rotação de Secrets](#rotação-de-secrets)
7. [Best Practices](#best-practices)

---

## 1. Visão Geral

### Hierarquia de Secrets por Ambiente

| Ambiente | Método Recomendado | Segurança |
|----------|-------------------|-----------|
| **Desenvolvimento** | `.env` local (gitignored) | ⚠️ Baixa |
| **Staging/Homologação** | Docker Secrets | 🟡 Média |
| **Produção** | AWS Secrets Manager / Vault | ✅ Alta |

### Tipos de Secrets

- **Database**: Senhas PostgreSQL, connection strings
- **JWT**: Secrets para tokens de acesso e refresh
- **SMTP**: Credenciais de email
- **API Keys**: Chaves de serviços externos (SEFAZ, payment gateways)
- **Certificates**: Certificados digitais A1/A3 (NF-e)
- **Encryption**: Chaves de criptografia AES

---

## 2. Desenvolvimento Local

### Setup com `.env`

```bash
# Copiar template
cp .env.example .env

# Editar com valores de desenvolvimento
nano .env
```

**Exemplo `.env`** (NUNCA commitar):
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_123
POSTGRES_DB=medmanager_master
DATABASE_URL=postgresql://postgres:dev_password_123@localhost:5432/medmanager_master

# JWT
JWT_SECRET=dev_jwt_secret_muito_longo_e_seguro
JWT_REFRESH_SECRET=dev_refresh_secret_muito_longo_e_seguro

# SMTP
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=mailtrap_user
SMTP_PASSWORD=mailtrap_password

# NF-e (Homologação)
ALLOW_NFE_SIMULATION=true
NFE_CERTIFICATE_PATH=
NFE_CERTIFICATE_PASSWORD=

# Redis
REDIS_URL=redis://localhost:6379
```

### Variáveis Mock para Testes

Criar `.env.test`:
```bash
DATABASE_URL=postgresql://postgres:test@localhost:5432/medmanager_test
JWT_SECRET=test_secret
JWT_REFRESH_SECRET=test_refresh_secret
ALLOW_NFE_SIMULATION=true
SMTP_HOST=localhost
```

Usar em testes:
```bash
NODE_ENV=test npm test
```

---

## 3. Docker Secrets

### Para Staging/Homologação

Docker Secrets armazena valores criptografados no Swarm.

#### Setup

1. **Inicializar Swarm**:
```bash
docker swarm init
```

2. **Criar secrets**:
```bash
# Database password
echo "senha_segura_staging" | docker secret create postgres_password -

# JWT secrets
echo "jwt_secret_muito_longo_staging" | docker secret create jwt_secret -
echo "jwt_refresh_secret_muito_longo_staging" | docker secret create jwt_refresh_secret -

# SMTP
echo "smtp_user_staging" | docker secret create smtp_user -
echo "smtp_password_staging" | docker secret create smtp_password -
```

3. **Atualizar docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: medmanager-backend
    secrets:
      - postgres_password
      - jwt_secret
      - jwt_refresh_secret
    environment:
      # Usar secrets files
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      JWT_REFRESH_SECRET_FILE: /run/secrets/jwt_refresh_secret

secrets:
  postgres_password:
    external: true
  jwt_secret:
    external: true
  jwt_refresh_secret:
    external: true
```

4. **Ler secrets no código** (`api/src/config/secrets.ts`):
```typescript
import { readFileSync } from 'fs';

function getSecret(name: string, fallback?: string): string {
  const secretFile = process.env[`${name}_FILE`];
  
  if (secretFile) {
    try {
      return readFileSync(secretFile, 'utf8').trim();
    } catch (error) {
      console.warn(`Failed to read secret from ${secretFile}:`, error);
    }
  }
  
  return process.env[name] || fallback || '';
}

export const secrets = {
  database: {
    password: getSecret('POSTGRES_PASSWORD'),
  },
  jwt: {
    secret: getSecret('JWT_SECRET'),
    refreshSecret: getSecret('JWT_REFRESH_SECRET'),
  },
  smtp: {
    user: getSecret('SMTP_USER'),
    password: getSecret('SMTP_PASSWORD'),
  },
};
```

#### Deploy

```bash
docker stack deploy -c docker-compose.yml medmanager
```

---

## 4. AWS Secrets Manager

### Para Produção (Recomendado)

AWS Secrets Manager oferece:
- ✅ Criptografia automática (KMS)
- ✅ Rotação automática de secrets
- ✅ Auditoria completa (CloudTrail)
- ✅ Replicação multi-região
- 💰 Custo: ~$0.40/secret/mês + $0.05/10k requests

### Setup

#### 1. Instalar AWS CLI

```bash
# Linux/Mac
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download: https://awscli.amazonaws.com/AWSCLIV2.msi

# Configurar
aws configure
```

#### 2. Criar Secrets na AWS

```bash
# Database credentials
aws secretsmanager create-secret \
  --name medmanager/prod/database \
  --description "PostgreSQL credentials" \
  --secret-string '{
    "username": "postgres",
    "password": "senha_super_segura_prod_123",
    "host": "db.medmanager.com.br",
    "port": "5432",
    "database": "medmanager_master"
  }'

# JWT secrets
aws secretsmanager create-secret \
  --name medmanager/prod/jwt \
  --secret-string '{
    "secret": "jwt_secret_extremamente_longo_e_aleatorio_prod",
    "refreshSecret": "refresh_secret_extremamente_longo_e_aleatorio_prod"
  }'

# SMTP credentials
aws secretsmanager create-secret \
  --name medmanager/prod/smtp \
  --secret-string '{
    "host": "smtp.sendgrid.net",
    "port": "587",
    "user": "apikey",
    "password": "SG.xxxxxxxxxxxxxxxxxxxxxxxxx"
  }'

# API Keys (SEFAZ, Payment Gateways)
aws secretsmanager create-secret \
  --name medmanager/prod/api-keys \
  --secret-string '{
    "sefaz_certificate_password": "cert_password_123",
    "stripe_secret_key": "sk_live_xxxxxxxxxxxxx",
    "pagseguro_token": "token_xxxxxxxxxxxxx"
  }'
```

#### 3. Configurar IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:medmanager/prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

Anexar policy ao EC2 Instance Profile ou ECS Task Role.

#### 4. Buscar Secrets no Startup

Criar script `api/src/config/aws-secrets.ts`:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function getAWSSecret(secretName: string): Promise<Record<string, any>> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    
    throw new Error('Secret not found');
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

export async function loadSecretsFromAWS(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping AWS Secrets Manager (not production)');
    return;
  }
  
  console.log('Loading secrets from AWS Secrets Manager...');
  
  try {
    // Database
    const dbSecrets = await getAWSSecret('medmanager/prod/database');
    process.env.POSTGRES_USER = dbSecrets.username;
    process.env.POSTGRES_PASSWORD = dbSecrets.password;
    process.env.POSTGRES_HOST = dbSecrets.host;
    process.env.POSTGRES_DB = dbSecrets.database;
    process.env.DATABASE_URL = `postgresql://${dbSecrets.username}:${dbSecrets.password}@${dbSecrets.host}:${dbSecrets.port}/${dbSecrets.database}`;
    
    // JWT
    const jwtSecrets = await getAWSSecret('medmanager/prod/jwt');
    process.env.JWT_SECRET = jwtSecrets.secret;
    process.env.JWT_REFRESH_SECRET = jwtSecrets.refreshSecret;
    
    // SMTP
    const smtpSecrets = await getAWSSecret('medmanager/prod/smtp');
    process.env.SMTP_HOST = smtpSecrets.host;
    process.env.SMTP_PORT = smtpSecrets.port;
    process.env.SMTP_USER = smtpSecrets.user;
    process.env.SMTP_PASSWORD = smtpSecrets.password;
    
    // API Keys
    const apiKeys = await getAWSSecret('medmanager/prod/api-keys');
    process.env.NFE_CERTIFICATE_PASSWORD = apiKeys.sefaz_certificate_password;
    process.env.STRIPE_SECRET_KEY = apiKeys.stripe_secret_key;
    
    console.log('✅ Secrets loaded successfully from AWS');
  } catch (error) {
    console.error('❌ Failed to load secrets from AWS:', error);
    process.exit(1);
  }
}
```

Atualizar `api/src/server.ts`:

```typescript
import { loadSecretsFromAWS } from './config/aws-secrets.js';

async function startServer() {
  // Carregar secrets ANTES de inicializar qualquer coisa
  if (process.env.USE_AWS_SECRETS === 'true') {
    await loadSecretsFromAWS();
  }
  
  // Resto da inicialização...
  const app = express();
  // ...
}

startServer();
```

#### 5. Deploy

Dockerfile com AWS SDK:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar AWS SDK
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Expor porta
EXPOSE 3333

# Iniciar app (carrega secrets no startup)
CMD ["node", "src/server.js"]
```

Docker Compose:

```yaml
services:
  backend:
    environment:
      USE_AWS_SECRETS: "true"
      AWS_REGION: "us-east-1"
      # Credenciais AWS via Instance Profile (EC2) ou Task Role (ECS)
```

---

## 5. HashiCorp Vault

### Alternativa ao AWS (Auto-hospedado)

Vault oferece gerenciamento avançado de secrets on-premise ou cloud.

#### Setup Rápido (Docker)

```bash
# Iniciar Vault em modo dev (NÃO USAR EM PRODUÇÃO)
docker run -d --name=vault \
  --cap-add=IPC_LOCK \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -p 8200:8200 \
  vault

# Configurar cliente
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='myroot'

# Adicionar secrets
vault kv put secret/medmanager/database \
  username=postgres \
  password=senha_segura

vault kv put secret/medmanager/jwt \
  secret=jwt_secret_longo \
  refreshSecret=refresh_secret_longo
```

#### Integração no Backend

```bash
cd api
pnpm add node-vault
```

```typescript
import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
  token: process.env.VAULT_TOKEN,
});

async function loadSecretsFromVault(): Promise<void> {
  const { data } = await vaultClient.read('secret/data/medmanager/database');
  const dbSecrets = data.data;
  
  process.env.POSTGRES_PASSWORD = dbSecrets.password;
  // ...
}
```

**⚠️ Produção**: Configurar Vault com TLS, autenticação AppRole, e alta disponibilidade.

---

## 6. Rotação de Secrets

### Rotação Automática (AWS)

```bash
# Habilitar rotação automática (a cada 30 dias)
aws secretsmanager rotate-secret \
  --secret-id medmanager/prod/database \
  --rotation-lambda-arn arn:aws:lambda:REGION:ACCOUNT:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30
```

### Rotação Manual

1. **Criar novo secret**:
```bash
aws secretsmanager update-secret \
  --secret-id medmanager/prod/jwt \
  --secret-string '{"secret": "novo_jwt_secret", "refreshSecret": "novo_refresh_secret"}'
```

2. **Reiniciar aplicação** para carregar novo secret:
```bash
docker compose restart backend
```

3. **Validar** que aplicação está funcionando

4. **Revogar tokens antigos** (opcional, para JWT)

### Checklist de Rotação

- [ ] Database passwords: a cada 90 dias
- [ ] JWT secrets: a cada 6 meses
- [ ] API keys: quando expirar ou suspeita de vazamento
- [ ] Certificates (NF-e): antes do vencimento
- [ ] SMTP passwords: a cada 6 meses

---

## 7. Best Practices

### ✅ DO

- ✅ Usar secrets managers em produção (AWS, Vault)
- ✅ Nunca commitar `.env` no git
- ✅ Rotacionar secrets regularmente
- ✅ Usar senhas fortes (32+ caracteres aleatórios)
- ✅ Limitar acesso por IAM/RBAC
- ✅ Auditar acesso a secrets (CloudTrail, Vault Audit)
- ✅ Criptografar secrets em repouso e em trânsito
- ✅ Usar diferentes secrets por ambiente

### ❌ DON'T

- ❌ Hardcodar secrets no código
- ❌ Commitar secrets no git (mesmo em repos privados)
- ❌ Compartilhar secrets via email/Slack
- ❌ Usar mesma senha em dev e prod
- ❌ Logar secrets em plaintext
- ❌ Expor secrets em variáveis de ambiente públicas
- ❌ Reutilizar senhas entre serviços

### Gerar Senhas Seguras

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Detectar Secrets Vazados

**git-secrets** (instalar localmente):
```bash
git clone https://github.com/awslabs/git-secrets
cd git-secrets
make install

# Configurar no projeto
cd /path/to/MedManager-PRO2.0
git secrets --install
git secrets --register-aws
```

Bloqueia commits com secrets AWS.

**TruffleHog** (scan histórico):
```bash
docker run --rm -v $(pwd):/proj dxa4481/trufflesog --regex --entropy=False /proj
```

---

## 📋 Checklist de Migração para Produção

- [ ] Remover todos os secrets hardcoded do código
- [ ] Criar secrets no AWS Secrets Manager
- [ ] Configurar IAM roles com permissões mínimas
- [ ] Implementar `loadSecretsFromAWS()` no backend
- [ ] Testar em staging com Docker Secrets
- [ ] Configurar rotação automática de database password
- [ ] Documentar processo de rotação manual
- [ ] Configurar alertas de acesso suspeito (CloudWatch)
- [ ] Fazer backup dos secrets em local seguro offline
- [ ] Treinar equipe no processo de acesso a secrets

---

## 🆘 Troubleshooting

### Erro: "Cannot connect to AWS Secrets Manager"

```bash
# Verificar credenciais
aws sts get-caller-identity

# Testar acesso ao secret
aws secretsmanager get-secret-value --secret-id medmanager/prod/database

# Ver logs IAM
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue
```

### Erro: "Unauthorized" no Vault

```bash
# Verificar token
vault token lookup

# Renovar token
vault token renew

# Gerar novo token
vault token create -policy=medmanager-read
```

### Secret não atualiza após rotação

```bash
# Forçar restart
docker compose restart backend

# Verificar se está carregando do cache (TTL)
# Implementar refresh automático ou reiniciar container
```

---

## 📞 Suporte

- **AWS Secrets Manager**: https://docs.aws.amazon.com/secretsmanager/
- **HashiCorp Vault**: https://www.vaultproject.io/docs
- **Docker Secrets**: https://docs.docker.com/engine/swarm/secrets/
