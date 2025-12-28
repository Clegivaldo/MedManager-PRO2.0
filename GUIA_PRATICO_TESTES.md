# 🧪 GUIA PRÁTICO DE TESTES - MedManager-PRO 2.0

**Objetivo:** Validar todas as funcionalidades do sistema de forma manual e automatizada.

---

## PARTE 1: SETUP PARA TESTES

### 1.1 Pré-requisitos
```bash
# Verificar versões
node --version     # v18+
pnpm --version     # 8+
docker --version   # 20+
psql --version     # 13+
```

### 1.2 Iniciar Infraestrutura

```bash
# Terminal 1: Database + Cache
cd c:\Users\Clegivaldo\Desktop\MedManager-PRO2.0

docker compose down -v  # Limpar dados antigos
docker compose up -d postgres redis

# Verificar saúde
docker compose ps
# postgres: healthy ✅
# redis: healthy ✅
```

### 1.3 Compilar Backend

```bash
# Terminal 2: Backend
cd api

pnpm install  # Se necessário
pnpm build    # Gera dist/

# Verificar build
ls -la dist/  # Deve ter arquivos .js
```

### 1.4 Popular Banco de Dados

```bash
# Terminal 2: Backend (continuação)
pnpm seed  # Cria tenant master e dados demo

# Verificar
docker compose exec postgres psql -U postgres -l
# medmanager_master    ✅
# tenant_xxxxx         ✅
```

### 1.5 Iniciar Servidores

```bash
# Terminal 2: Backend API
pnpm dev  # Ou: node dist/server.js
# 🚀 MedManager API running on port 3333

# Terminal 3: Frontend (em outra aba)
cd ..  # Voltar para root
pnpm dev  # Vite
# ➜  Local:   http://localhost:5173/
```

### 1.6 Validar Health Check

```bash
# Terminal 4: Teste
curl http://localhost:3333/health

# Esperado:
# {
#   "status": "ok",
#   "timestamp": "2024-12-28T...",
#   "environment": "development",
#   "version": "1.0.0"
# }
```

---

## PARTE 2: TESTES FUNCIONAIS

### 2.1 Login & Autenticação

#### 2.1.1 Login Superadmin (Terminal)

```bash
# Dados padrão
EMAIL="admin@medmanager.com.br"
PASSWORD="admin123"
API="http://localhost:3333/api/v1"

# Login
RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "✅ Token: $TOKEN"

# Salvar para próximos testes
echo "TOKEN=$TOKEN" > /tmp/test.env
source /tmp/test.env
```

#### 2.1.2 Login UI Frontend

1. Abrir navegador: `http://localhost:5173`
2. Email: `admin@medmanager.com.br`
3. Senha: `admin123`
4. ✅ Deve redirecionar para `/superadmin/tenants`

#### 2.1.3 Testar Password Reset

```bash
API="http://localhost:3333/api/v1"

# 1. Solicitar reset
curl -X POST $API/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@medmanager.com.br"}'

# Esperado: { "success": true, "message": "..." }

# 2. Verificar email (em dev, logs mostram link)
# 3. Usar token do link para resetar
curl -X POST $API/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"xyz","newPassword":"newpass123"}'
```

---

### 2.2 Gerenciamento de Tenants

#### 2.2.1 Criar Tenant (API)

```bash
source /tmp/test.env

API="http://localhost:3333/api/v1"

# Criar novo tenant
RESPONSE=$(curl -s -X POST $API/superadmin/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Farmácia TestE2E",
    "cnpj": "99.888.777/0001-99",
    "plan": "professional",
    "email": "admin@farmaciate2e.com.br",
    "phone": "(11) 98765-4321",
    "address": {"street": "Rua Teste", "city": "São Paulo", "state": "SP"}
  }')

TENANT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

echo "✅ Tenant criado: $TENANT_ID"
echo "TENANT_ID=$TENANT_ID" >> /tmp/test.env
```

#### 2.2.2 Criar Tenant (UI)

1. Ir para `/superadmin/tenants`
2. Botão "+ Novo Tenant"
3. Preencher:
   - Nome: "Farmácia Test UI"
   - CNPJ: "11.222.333/0001-44"
   - Plano: "starter"
4. Salvar
5. ✅ Deve aparecer na lista

#### 2.2.3 Listar Tenants

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"

curl -s -X GET "$API/superadmin/tenants?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.tenants | length'

# Esperado: 3+ (master + testes anteriores)
```

#### 2.2.4 Atualizar Status Tenant

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"
TENANT_ID="xxxxx"  # Usar ID anterior

# Suspender tenant
curl -X PUT $API/superadmin/tenants/$TENANT_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended","reason":"Testing suspension"}'

# Esperado: {"message":"Tenant status updated successfully",...}
```

---

### 2.3 Backup & Restore

#### 2.3.1 Criar Backup

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"
TENANT_ID="xxxxx"

# Criar backup
RESPONSE=$(curl -s -X POST $API/backup/db/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BACKUP_FILE=$(echo $RESPONSE | grep -o '"file":"[^"]*' | cut -d'"' -f4)

echo "✅ Backup criado: $BACKUP_FILE"
echo "BACKUP_FILE=$BACKUP_FILE" >> /tmp/test.env
```

#### 2.3.2 Listar Backups

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"

curl -s -X GET $API/backup/list/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.items'

# Esperado:
# [
#   {
#     "name": "xxxxx-tenant_xxxxx-2024-12-28T...",
#     "size": 1024,
#     "modifiedAt": "2024-12-28T..."
#   }
# ]
```

#### 2.3.3 Download Backup

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"

BACKUP_FILENAME=$(curl -s -X GET $API/backup/list/$TENANT_ID \
  -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].name')

# Download
curl -X GET $API/backup/download/$TENANT_ID/$BACKUP_FILENAME \
  -H "Authorization: Bearer $TOKEN" \
  -o ./backup-test.sql.gz

# Verificar
ls -lh backup-test.sql.gz
file backup-test.sql.gz

# Esperado: gzip compressed data
```

#### 2.3.4 Testar Restore (Opcional - Destruti)

```bash
# ⚠️ CUIDADO: Isto sobrescreve dados!

# 1. Criar banco temporário
docker compose exec postgres psql -U postgres -c "CREATE DATABASE test_restore;"

# 2. Descomprimir backup
gunzip -c backup-test.sql.gz > backup-test.sql

# 3. Restaurar
docker compose exec postgres psql -U postgres -d test_restore < backup-test.sql

# 4. Validar
docker compose exec postgres psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM products;"

# 5. Limpar
docker compose exec postgres psql -U postgres -c "DROP DATABASE test_restore;"
```

---

### 2.4 Planos & Módulos

#### 2.4.1 Criar Plano

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"

curl -X POST $API/superadmin/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-plan-123",
    "displayName": "Plano Teste",
    "description": "Plano para testes",
    "priceMonthly": 99.99,
    "priceAnnual": 999.99,
    "maxUsers": 5,
    "maxProducts": 100,
    "maxStorage": 10,
    "maxMonthlyTransactions": 1000
  }'
```

#### 2.4.2 Gerenciar Módulos (UI)

1. Ir para `/superadmin/modules`
2. Selecionar tenant no dropdown
3. ✅ Listar módulos disponíveis
4. Marcar: DASHBOARD, PRODUCTS, INVENTORY, COMPLIANCE
5. Desmarcar: INVOICES
6. Salvar
7. ✅ Deve mostrar "Módulos atualizados"

#### 2.4.3 Validar Acesso a Módulo

1. Login como usuário do tenant
2. Ir para `/inventory` 
3. ✅ Deve aparecer (foi marcado)
4. Tentar `/invoices`
5. ⚠️ Deve mostrar "Módulo não disponível no seu plano"

---

### 2.5 Conformidade & Compliance

#### 2.5.1 Testar RDC 430 (UI)

1. Login como tenant
2. Ir para `/compliance`
3. Verificar cards:
   - ✅ RDC 430 - Temperatura
   - ✅ Portaria 344/98 - Controlados
   - ✅ Guia 33 - Transporte
   - ✅ Qualidade - QC

4. Clicar em "Temperatura"
5. ✅ Deve listar sensores com status

#### 2.5.2 Testar Guia 33

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"
TENANT_CNPJ="12.345.678/0001-55"

# Login como tenant
TENANT_TOKEN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@tenant.com","password":"pass123"}' | jq -r '.data.tokens.accessToken')

# Gerar relatório Guia 33
curl -X POST $API/regulatory/guia33/generate \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "x-tenant-cnpj: $TENANT_CNPJ" \
  -H "Content-Type: application/json" \
  -d '{
    "period": {
      "startDate": "2024-12-01",
      "endDate": "2024-12-31"
    },
    "substanceId": "xxxxx"
  }'

# Esperado:
# {
#   "message": "Guia 33 generated successfully",
#   "guia33": {
#     "period": {...},
#     "movementsCount": 5,
#     "generatedAt": "..."
#   }
# }
```

---

### 2.6 Auditoria & Segurança

#### 2.6.1 Validar Audit Logs

```bash
source /tmp/test.env
API="http://localhost:3333/api/v1"

curl -s -X GET $API/audit/logs \
  -H "Authorization: Bearer $TOKEN" | jq '.logs[0] | {operation, userId, ipAddress, createdAt}'

# Esperado:
# {
#   "operation": "CREATE",
#   "userId": "xxxxx",
#   "ipAddress": "127.0.0.1",
#   "createdAt": "2024-12-28T..."
# }
```

#### 2.6.2 Testar Rate Limiting

```bash
# 1º request
curl -s http://localhost:3333/health
# ✅ 200 OK

# Fazer 1000+ requests rapidamente
for i in {1..1010}; do curl -s http://localhost:3333/health > /dev/null; done

# Próximo request
curl -s http://localhost:3333/health
# ⚠️ 429 Too Many Requests
# X-RateLimit-Remaining: 0
```

#### 2.6.3 Testar CSRF Protection

```bash
# 1. GET token CSRF
TOKEN=$(curl -s http://localhost:3333/api/csrf-token | jq -r '.token')

# 2. POST sem token
curl -X POST http://localhost:3333/api/v1/backup/db/xxx \
  -H "Content-Type: application/json"

# ❌ Esperado: 403 Forbidden (CSRF token missing)

# 3. POST com token
curl -X POST http://localhost:3333/api/v1/backup/db/xxx \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN"

# ✅ Deve proceder (ou falhar por outro motivo, não CSRF)
```

---

## PARTE 3: TESTES AUTOMATIZADOS

### 3.1 Rodar Testes Unitários

```bash
cd api

# Todos os testes
pnpm test

# Com watch mode
pnpm test:watch

# Esperado:
# ✅ Pass:   10
# ❌ Fail:   0
# ⏭️  Skipped: 2
```

### 3.2 Criar & Rodar Teste E2E

Criar arquivo: `api/src/tests/backup.e2e.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API = 'http://localhost:3333/api/v1';
let token: string;
let tenantId: string;
let backupFile: string;

describe('Backup E2E Tests', () => {
  beforeAll(async () => {
    // Login
    const res = await axios.post(`${API}/auth/login`, {
      email: 'admin@medmanager.com.br',
      password: 'admin123'
    });
    token = res.data.data.tokens.accessToken;

    // Get first tenant
    const tenants = await axios.get(`${API}/superadmin/tenants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    tenantId = tenants.data.tenants[0].id;
  });

  it('should create a backup', async () => {
    const res = await axios.post(
      `${API}/backup/db/${tenantId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.file).toBeDefined();
    
    backupFile = res.data.file;
  });

  it('should list backups', async () => {
    const res = await axios.get(
      `${API}/backup/list/${tenantId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it('should download backup', async () => {
    const filename = backupFile.split('/').pop();
    
    const res = await axios.get(
      `${API}/backup/download/${tenantId}/${filename}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      }
    );

    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThan(0);
  });

  afterAll(() => {
    // Cleanup
  });
});
```

Rodar:

```bash
pnpm test backup.e2e.test.ts
```

---

## PARTE 4: CHECKLIST DE VALIDAÇÃO

### ✅ Autenticação
- [ ] Login com email/senha válido
- [ ] Erro ao logar com credenciais inválidas
- [ ] Token JWT válido após login
- [ ] Refresh token funciona
- [ ] Logout limpa tokens

### ✅ Multi-Tenancy
- [ ] Dados de tenant A não visíveis em tenant B
- [ ] Headers x-tenant-cnpj obrigatório
- [ ] Usuário de um tenant não acessa outro

### ✅ Backup
- [ ] Criar backup com sucesso
- [ ] Arquivo criado no disco
- [ ] Lista backups retorna itens
- [ ] Download retorna arquivo válido
- [ ] Cleanup remove arquivos antigos

### ✅ Tenants (Superadmin)
- [ ] Criar novo tenant
- [ ] Listar tenants com paginação
- [ ] Atualizar dados do tenant
- [ ] Ativar/desativar tenant
- [ ] Estender assinatura

### ✅ Planos & Módulos
- [ ] Criar plano
- [ ] Listar módulos para tenant
- [ ] Ativar módulo
- [ ] Desativar módulo
- [ ] Acesso bloqueado a módulo inativo

### ✅ Conformidade
- [ ] Página /compliance carrega
- [ ] Temperatura readings visíveis
- [ ] Guia 33 pode ser gerada
- [ ] RDC 430 validações ativas

### ✅ Segurança
- [ ] Rate limit funciona
- [ ] CSRF token requerido
- [ ] Audit logs registram operações
- [ ] Senhas criptografadas
- [ ] Headers de segurança presentes

---

## PARTE 5: TROUBLESHOOTING

### Erro: "Connection refused" na API

```bash
# 1. Verificar se backend está rodando
ps aux | grep node

# 2. Verificar porta 3333
lsof -i :3333

# 3. Reinicar backend
cd api && pnpm dev
```

### Erro: "Database does not exist"

```bash
# 1. Verificar databases
docker compose exec postgres psql -U postgres -l

# 2. Rodar seed
cd api && pnpm seed

# 3. Verificar arquivo .env
cat .env | grep DATABASE_URL
```

### Erro: "Module not found"

```bash
# 1. Reinstalar dependências
cd api && rm -rf node_modules && pnpm install

# 2. Limpar cache
pnpm store prune

# 3. Rebuild
pnpm build
```

### Erro: "Token expired"

```bash
# Token dura 1 hora por padrão
# Para testes, aumentar em .env:
JWT_EXPIRY=24h
```

---

## RESUMO DOS TESTES

| Teste | Tipo | Tempo | Status |
|-------|------|-------|--------|
| Login | Manual | 2min | ✅ |
| Backup | API/Manual | 5min | ✅ |
| Tenants | API/UI | 5min | ✅ |
| Módulos | UI | 5min | ✅ |
| Compliance | UI | 3min | ✅ |
| Segurança | Terminal | 5min | ✅ |
| E2E Automático | Vitest | 2min | ⏳ |
| **TOTAL** | | **27min** | |

---

**Próximos Passos:**
1. Executar testes manualmente nesta sequência
2. Documentar resultados em `TEST_RESULTS.md`
3. Se todos passarem ✅ → Pronto para staging
4. Se algum falhar ❌ → Investigar e corrigir

**Sucesso!** 🚀
