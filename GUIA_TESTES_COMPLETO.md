# 🧪 GUIA DE TESTES - MedManager PRO 2.0

## 📋 Índice

1. [Setup Inicial](#setup-inicial)
2. [Testes de API](#testes-de-api)
3. [Testes E2E (Frontend)](#testes-e2e-frontend)
4. [Testes de Cada Tela](#testes-de-cada-tela)
5. [Critérios de Sucesso](#critérios-de-sucesso)

---

## 🚀 Setup Inicial

### Pré-requisitos

```bash
# Node.js 20+
node --version

# Docker e Docker Compose
docker --version
docker-compose --version

# PowerShell 7+ (Windows)
pwsh --version
```

### 1. Instalar Dependências

```bash
# Root (frontend)
npm install

# Backend
cd api
npm install

# Testes E2E
cd ..
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Configurar Ambiente

```bash
# Copiar .env.example para .env
cp .env.example .env
cp api/.env.example api/.env

# Editar .env e configurar:
# - DATABASE_URL
# - JWT_SECRET (mínimo 32 chars)
# - ENCRYPTION_KEY (32 bytes)
```

### 3. Subir Banco de Dados

```bash
# Iniciar PostgreSQL e Redis
docker-compose up -d db redis

# Rodar migrations
cd api
npx prisma migrate deploy
npx prisma generate

# Criar usuário admin
npx tsx src/scripts/create-master-admin.ts
```

### 4. Iniciar Aplicação

```bash
# Terminal 1: Backend
cd api
npm run dev

# Terminal 2: Frontend
npm run dev
```

Aguardar:
- Backend: http://localhost:3333
- Frontend: http://localhost:5173

---

## 🔧 Testes de API

### Teste Completo (PowerShell)

```powershell
# Rodar todos os testes de API
.\test-all-api.ps1
```

**O que é testado:**
- ✅ Health check
- ✅ Login SuperAdmin
- ✅ Listar Tenants
- ✅ Criar Tenant
- ✅ Detalhes do Tenant
- ✅ Listar Planos
- ✅ Gestão de Módulos
- ✅ Criar Backup
- ✅ Listar Backups
- ✅ Dashboard Metrics
- ✅ Deletar Tenant

**Resultado Esperado:**
```
Total de Testes: 13
Passou: 13
Falhou: 0
Taxa de Sucesso: 100%
```

### Testes Manuais (curl/Postman)

#### 1. Health Check
```bash
curl http://localhost:3333/health
```

#### 2. Login SuperAdmin
```bash
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@medmanager.com",
    "password": "admin123"
  }'
```

#### 3. Listar Tenants
```bash
curl http://localhost:3333/api/v1/superadmin/tenants \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### 4. Criar Backup
```bash
curl -X POST "http://localhost:3333/api/v1/backup/db/TENANT_ID" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🎭 Testes E2E (Frontend)

### Setup Playwright

```bash
# Instalar dependências
npm install --save-dev @playwright/test
npx playwright install
```

### Rodar Todos os Testes

```bash
# Todos os testes
npx playwright test

# Com interface visual
npx playwright test --ui

# Modo headed (ver navegador)
npx playwright test --headed

# Apenas um arquivo
npx playwright test e2e/auth.spec.ts
```

### Testes Implementados

#### 1. Autenticação (`e2e/auth.spec.ts`)
```bash
npx playwright test e2e/auth.spec.ts
```

**Casos de teste:**
- ✅ Redirecionar para login quando não autenticado
- ✅ Login com credenciais válidas
- ✅ Erro com credenciais inválidas
- ✅ Logout com sucesso
- ✅ Validação de campos obrigatórios
- ✅ Persistência de sessão após refresh

#### 2. Gestão de Tenants (`e2e/superadmin/tenants.spec.ts`)
```bash
npx playwright test e2e/superadmin/tenants.spec.ts
```

**Casos de teste:**
- ✅ Navegar para tela de tenants
- ✅ Listar tenants existentes
- ✅ Criar novo tenant
- ✅ Buscar tenant por nome
- ✅ Filtrar por status
- ✅ Visualizar detalhes
- ✅ Editar tenant
- ✅ Ativar/desativar tenant
- ✅ Extender assinatura
- ✅ Validar CNPJ

#### 3. Gestão de Produtos (`e2e/tenant/products.spec.ts`)
```bash
npx playwright test e2e/tenant/products.spec.ts
```

**Casos de teste:**
- ✅ Navegar para tela de produtos
- ✅ Listar produtos
- ✅ Criar novo produto
- ✅ Buscar produto
- ✅ Filtrar por tipo
- ✅ Editar produto
- ✅ Deletar produto
- ✅ Validação de campos
- ✅ Importar CSV
- ✅ Visualizar detalhes
- ✅ Validar GTIN

### Relatório de Testes

```bash
# Ver relatório HTML
npx playwright show-report
```

---

## 📊 Testes de Cada Tela

### TENANT - Checklist de Testes

#### ✅ Dashboard
- [ ] Métricas carregam corretamente
- [ ] Gráficos são exibidos
- [ ] Alertas de estoque aparecem
- [ ] Produtos próximos ao vencimento são listados
- [ ] Navegação para outras telas funciona

#### ✅ Produtos
- [ ] CRUD completo funciona
- [ ] Importação CSV funciona
- [ ] Validação de GTIN funciona
- [ ] Filtros funcionam (tipo, status)
- [ ] Busca funciona
- [ ] Paginação funciona

#### ✅ Estoque
- [ ] Listar itens em estoque
- [ ] Movimentações são registradas
- [ ] Lotes são exibidos corretamente
- [ ] Filtros funcionam
- [ ] Exportação funciona

#### ✅ Pedidos
- [ ] Criar pedido funciona
- [ ] Adicionar itens funciona
- [ ] Calcular totais funciona
- [ ] Gerar NFe funciona
- [ ] Status workflow funciona

#### ✅ Clientes
- [ ] CRUD completo funciona
- [ ] Validação de CNPJ/CPF funciona
- [ ] Busca funciona
- [ ] Histórico de pedidos é exibido

#### ✅ NFe
- [ ] Emitir NFe funciona
- [ ] Consultar status funciona
- [ ] Download XML funciona
- [ ] Download DANFE funciona
- [ ] Cancelar NFe funciona
- [ ] Inutilizar numeração funciona
- [ ] Carta de Correção funciona

#### ✅ Compliance
- [ ] Dashboard SNGPC carrega
- [ ] Registrar movimentação funciona
- [ ] Gerar relatório Guia 33 funciona
- [ ] Consultar histórico funciona
- [ ] Validação de prescrição funciona

#### ✅ Financeiro
- [ ] Listar contas a pagar/receber
- [ ] Criar conta funciona
- [ ] Marcar como pago funciona
- [ ] Filtros funcionam
- [ ] Relatórios são gerados

#### ✅ Auditoria
- [ ] Logs são exibidos
- [ ] Filtros funcionam (data, usuário, ação)
- [ ] Exportação funciona
- [ ] Detalhes do log são exibidos

#### ✅ Usuários
- [ ] CRUD completo funciona
- [ ] Definir permissões funciona
- [ ] Ativar/desativar funciona
- [ ] Reset de senha funciona

#### ✅ Perfil Fiscal
- [ ] Upload de certificado funciona
- [ ] Validação de senha funciona
- [ ] Configuração de séries funciona
- [ ] Dados fiscais são salvos

#### ✅ Gateway Pagamento
- [ ] Configurar Asaas funciona
- [ ] Configurar InfinityPay funciona
- [ ] Testar conexão funciona

#### ✅ Meu Perfil
- [ ] Alterar dados funciona
- [ ] Alterar senha funciona
- [ ] Upload de avatar funciona

#### ✅ PDV
- [ ] Adicionar produtos funciona
- [ ] Calcular totais funciona
- [ ] Processar venda funciona
- [ ] Emitir NFCe funciona

### SUPERADMIN - Checklist de Testes

#### ✅ Dashboard
- [ ] Métricas do sistema carregam
- [ ] Gráficos são exibidos
- [ ] Status de serviços é exibido

#### ✅ Tenants
- [ ] CRUD completo funciona
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Extender assinatura funciona
- [ ] Criar cobrança funciona

#### ✅ Planos
- [ ] CRUD completo funciona
- [ ] Definir limites funciona
- [ ] Preços são salvos corretamente

#### ✅ Módulos
- [ ] Listar módulos funciona
- [ ] Habilitar/desabilitar funciona
- [ ] Mudanças são aplicadas imediatamente

#### ✅ Assinaturas
- [ ] Listar assinaturas funciona
- [ ] Filtros funcionam
- [ ] Renovação automática funciona

#### ✅ Cobranças
- [ ] Listar cobranças funciona
- [ ] Criar cobrança funciona
- [ ] Sincronizar status funciona
- [ ] Cancelar cobrança funciona

#### ✅ Backups
- [ ] Listar backups funciona
- [ ] Criar backup funciona
- [ ] Download de backup funciona
- [ ] Restore funciona

#### ✅ System Health
- [ ] Jobs são listados
- [ ] Status dos serviços é exibido
- [ ] Logs são exibidos

---

## ✅ Critérios de Sucesso

### 1. Testes de API
- ✅ Taxa de sucesso: 100%
- ✅ Todos os endpoints críticos testados
- ✅ Tempo de resposta < 500ms (p95)

### 2. Testes E2E
- ✅ Taxa de sucesso: >= 90%
- ✅ Todas as telas críticas testadas
- ✅ Flows principais funcionando

### 3. Performance
- ✅ Frontend load time < 3s
- ✅ API response time < 500ms (p95)
- ✅ Database queries otimizadas

### 4. Segurança
- ✅ Zero vulnerabilidades críticas
- ✅ Autenticação funcionando
- ✅ Permissões validadas
- ✅ CSRF protection ativo
- ✅ Rate limiting ativo

### 5. Funcionalidades
- ✅ Backup automático funcionando
- ✅ SNGPC sincronizando
- ✅ NFe emitindo
- ✅ Pagamentos funcionando

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Reiniciar banco
docker-compose restart db

# Verificar logs
docker-compose logs db
```

### Erro: "JWT Secret not configured"
```bash
# Gerar chave JWT
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicionar no .env
JWT_SECRET=<sua_chave_gerada>
```

### Erro: "Playwright tests failing"
```bash
# Reinstalar navegadores
npx playwright install --force

# Limpar cache
rm -rf node_modules/.cache

# Rodar em modo debug
npx playwright test --debug
```

### Erro: "Port 3333 already in use"
```bash
# Windows
netstat -ano | findstr :3333
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3333 | xargs kill -9
```

---

## 📝 Logs e Debugging

### Ver logs do backend
```bash
tail -f api/logs/app.log
```

### Ver logs do Docker
```bash
docker-compose logs -f backend
```

### Debug do frontend
```
F12 -> Console -> Verificar erros
```

---

## 🎯 Próximos Passos

1. ✅ Rodar `test-all-api.ps1`
2. ✅ Rodar `npx playwright test`
3. ✅ Verificar cada tela manualmente
4. ✅ Corrigir bugs encontrados
5. ✅ Re-testar funcionalidades corrigidas
6. ✅ Documentar problemas conhecidos
7. ✅ Preparar para homologação

---

**Elaborado por:** Equipe de QA  
**Data:** 30/12/2025  
**Versão:** 1.0
