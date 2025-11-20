# 📋 Plano de Desenvolvimento - MedManager-PRO 2.0
## Sistema Multi-tenant Completo com Planos, Pagamentos e NF-e

**Data de Criação:** 20/11/2025  
**Responsável:** Clegivaldo  
**Status Geral:** 🚧 EM DESENVOLVIMENTO - Fase 1 iniciada

---

## 📊 SITUAÇÃO ATUAL DO SISTEMA

### ✅ Funcionalidades Completamente Implementadas (90-100%)
- ✅ **Multi-tenancy Database-per-Tenant** (95%) - Isolamento completo por CNPJ
- ✅ **RBAC Granular** (100%) - 70+ permissões implementadas
- ✅ **Autenticação JWT + Refresh Token** (100%)
- ✅ **Recuperação de Senha** (100%) - Email com Nodemailer
- ✅ **Redirecionamento por Role** (100%) - SUPERADMIN vs TENANT
- ✅ **Isolamento de Pastas** (100%) - Certificados e uploads por tenant
- ✅ **Criptografia de Certificados** (100%) - AES-256-GCM com keymaster
- ✅ **Perfil Fiscal por Tenant** (100%) - CNP, IE, regime tributário
- ✅ **Séries Fiscais com Auto-incremento** (100%)
- ✅ **Geração de Chave de Acesso NF-e** (100%) - 44 dígitos válidos
- ✅ **XML NF-e Estruturado** (100%) - Conforme layout 4.0
- ✅ **Upload de Certificados A1** (100%) - Validação, criptografia, expiração

### ⚠️ Funcionalidades Parcialmente Implementadas (30-85%)
- ⚠️ **Schema de Assinaturas/Pagamentos** (100%) - Tabelas criadas, sem lógica de negócio
- ⚠️ **Emissão de NF-e** (85%) - Faltam: assinatura real, envio Sefaz, DANFE PDF
- ⚠️ **Enforcement de Limites** (20%) - Middleware não implementado
- ⚠️ **Validação de Licença** (30%) - Campos existem, middleware pendente
- ⚠️ **Gateways de Pagamento** (0%) - Schema criado, services não implementados

### ❌ Funcionalidades Não Iniciadas (0%)
- ❌ Asaas Service (API, webhooks)
- ❌ InfinityPay Service
- ❌ Middleware de Validação de Licença
- ❌ Middleware de Enforcement de Limites
- ❌ Dashboard de Uso (Frontend)
- ❌ Painel de Assinações (Superadmin)
- ❌ Assinatura Digital Real (node-forge)
- ❌ Envio para Sefaz (testes E2E)
- ❌ DANFE PDF (puppeteer/pdfkit)
- ❌ Carta de Correção Eletrônica
- ❌ CI/CD Pipeline
- ❌ Monitoramento (Prometheus/Grafana)
- ❌ Testes Unitários (cobertura baixa)
- ❌ Backup S3

---

## 🎯 ROADMAP DETALHADO E SEQUENCIAL

### 🔴 **FASE 1: CORE CRÍTICO DO NEGÓCIO** (Semanas 1-2)
**Objetivo:** Validar assinatura, bloquear acesso a não-pagos, aceitar pagamentos  
**Saída:** Sistema pronto para MVP com cobrança

#### ✅ **1.1 - Schema de Assinatura e Planos** (1 dia) [DONE]
**Status:** ✅ COMPLETO  
**Tabelas Criadas:** `plans`, `subscriptions`, `payments`, `billing_accounts`, `usage_metrics`  
**Arquivo:** `api/prisma/migrations/20251120155256_add_subscriptions_payments_billing`

**O que falta:** Apenas implementar Services de negócio

---

#### ⏳ **1.2 - SubscriptionService** (1.5 dias) [NÃO INICIADO]
**Arquivo:** `api/src/services/subscription.service.ts`

**Métodos a Implementar:**
```typescript
class SubscriptionService {
  // Criar assinatura para novo tenant
  async createSubscription(tenantId: string, planId: string, durationDays: number): Promise<Subscription>
  
  // Renovar assinatura (estender data final)
  async renewSubscription(tenantId: string, durationDays: number): Promise<Subscription>
  
  // Fazer upgrade para plano superior
  async upgradeSubscription(tenantId: string, newPlanId: string): Promise<Subscription>
  
  // Fazer downgrade para plano inferior
  async downgradeSubscription(tenantId: string, newPlanId: string): Promise<Subscription>
  
  // Verificar se assinatura está ativa
  async isActive(tenantId: string): Promise<boolean>
  
  // Obter dias restantes
  async getDaysRemaining(tenantId: string): Promise<number>
  
  // Suspender assinatura
  async suspendSubscription(tenantId: string, reason?: string): Promise<Subscription>
  
  // Reativar assinatura suspensa
  async reactivateSubscription(tenantId: string): Promise<Subscription>
  
  // Listar planos disponíveis
  async listPlans(): Promise<Plan[]>
  
  // Obter plano específico
  async getPlan(planId: string): Promise<Plan | null>
}
```

**Dependências:**
- PrismaClient master
- Logger

**Testes E2E:** Adicionar a `api/test/subscription.e2e.test.ts`

---

#### ⏳ **1.3 - Middleware validateSubscription** (1 dia) [NÃO INICIADO]
**Arquivo:** `api/src/middleware/subscription.middleware.ts`

**Comportamento:**
```typescript
// Se subscription_status !== ACTIVE ou subscription_end < agora():
// → Retornar erro 403 com code: 'LICENSE_EXPIRED'

// Validações:
// 1. Buscar subscription do tenant
// 2. Se vencido → 403 Forbidden
// 3. Se status !== 'active' → 403 Forbidden
// 4. Mensagem: "Sua assinatura expirou em {data}. Renove para continuar."
// 5. Exception: SUPERADMIN bypass automático

// Aplicar em:
// - Todas as rotas /api/v1 (exceto /auth e /license-expired)
// - SKIP para rutas públicas
```

**Aplicação em `api/src/server.ts`:**
```typescript
app.use('/api/v1', tenantMiddleware);
app.use('/api/v1', validateSubscriptionMiddleware); // ← Aqui
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/fiscal', fiscalRoutes);
// ... outras rotas
```

---

#### ⏳ **1.4 - Página Frontend de Licença Expirada** (1 dia) [NÃO INICIADO]
**Arquivo:** `src/pages/tenant/LicenseExpired.tsx`

**Elementos:**
- Card grande com ícone de ⚠️
- Título: "Assinatura Expirada"
- Informações:
  - Plano contratado (ex: "Professional")
  - Data de expiração (ex: "18/11/2025")
  - Valor da renovação mensal
  - Período de graça (se aplicável)
- Botões:
  - "Renovar Agora" → abre modal de pagamento
  - "Ver Planos" → `/pricing` (futuro)
- Background degradê suave

**Interceptor em `src/services/api.ts`:**
```typescript
// Se resposta status 403 e response.code === 'LICENSE_EXPIRED':
// → Redirecionar para '/license-expired'
// → Limpar tokens de session
```

**Adicionar rota em `src/App.tsx`:**
```tsx
<Route path="/license-expired" element={<LicenseExpired />} />
```

---

#### ⏳ **1.5 - Enforcement de Limites por Plano** (2 dias) [NÃO INICIADO]
**Arquivo:** `api/src/services/limits.service.ts`

**Funcionalidade:**
```typescript
class LimitsService {
  // Verificar se pode criar novo usuário
  async canCreateUser(tenantId: string): Promise<{allowed: boolean; reason?: string}>
  
  // Verificar se pode criar novo produto
  async canCreateProduct(tenantId: string): Promise<{allowed: boolean; reason?: string}>
  
  // Verificar se pode fazer transação
  async canCreateInvoice(tenantId: string): Promise<{allowed: boolean; reason?: string}>
  
  // Rastrear uso mensal
  async trackUsage(tenantId: string, metric: 'users'|'products'|'invoices'|'storage', delta: number)
  
  // Obter uso atual vs limite
  async getUsageStats(tenantId: string): Promise<{
    users: {current: number; limit: number; percentage: number};
    products: {current: number; limit: number; percentage: number};
    invoices: {current: number; limit: number; percentage: number};
    storage: {current: number; limit: number; percentage: number};
  }>
}
```

**Middleware `checkPlanLimits`:**
```typescript
// Aplicar em POST/PUT em:
// - /api/v1/users (max_users)
// - /api/v1/products (max_products)
// - /api/v1/invoices (max_monthly_transactions)

// Se limite atingido → retornar 402 Payment Required
// Response: {
//   code: 'LIMIT_EXCEEDED',
//   message: 'Limite de X atingido. Faça upgrade para continuar.',
//   current: 100,
//   limit: 100,
//   resource: 'users'
// }
```

---

#### ⏳ **1.6 - Seeds: Planos Padrão** (0.5 dia) [NÃO INICIADO]
**Arquivo:** Atualizar `api/src/seed/index.ts`

**Planos a Criar:**

| Plano | Preço | Usuários | Produtos | Trans/Mês | Armazenamento | Recursos |
|-------|-------|----------|----------|-----------|---------------|----------|
| **Starter** | R$ 99/mês | 1 | 100 | 100 | 5 GB | Básico |
| **Professional** | R$ 299/mês | 5 | 500 | 1.000 | 50 GB | +Relatórios |
| **Enterprise** | R$ 999/mês | Ilimitado | Ilimitado | Ilimitado | 500 GB | +API Premium |

```typescript
// Seed de exemplo
const plans = [
  {
    id: 'plan-starter',
    name: 'starter',
    displayName: 'Starter',
    description: 'Para pequenas farmácias',
    priceMonthly: 99,
    priceAnnual: 990,
    maxUsers: 1,
    maxProducts: 100,
    maxMonthlyTransactions: 100,
    maxStorageGb: 5,
    features: JSON.stringify(['FISCAL_BASIC', 'INVENTORY', 'CUSTOMERS'])
  },
  // ... outros planos
];
```

---

### 🟠 **FASE 2: INTEGRAÇÃO DE PAGAMENTOS** (Semanas 3-4)
**Objetivo:** Receber pagamentos em PIX/Boleto via Asaas  
**Saída:** Sistema cobrando e recebendo pagamentos reais

#### ⏳ **2.1 - Asaas Service** (2 dias) [NÃO INICIADO]
**Arquivo:** `api/src/services/payment/asaas.service.ts`

**Métodos:**
```typescript
class AsaasService implements PaymentGateway {
  // Criar cliente no Asaas
  async createCustomer(tenant: Tenant): Promise<{customerId: string}>
  
  // Gerar cobrança (PIX ou boleto)
  async createCharge(params: {
    customerId: string;
    amount: number;
    dueDate: Date;
    description: string;
    type: 'PIX' | 'BOLETO'; // 'BANK_SLIP'
  }): Promise<{
    chargeId: string;
    qrCode?: string; // Para PIX
    url?: string; // Para boleto
    barcode?: string;
  }>
  
  // Consultar status da cobrança
  async getChargeStatus(chargeId: string): Promise<PaymentStatus>
  
  // Cancelar cobrança
  async cancelCharge(chargeId: string): Promise<void>
  
  // Verificar webhook
  async verifyWebhookSignature(payload: any, signature: string): Promise<boolean>
}
```

**Variáveis de Ambiente:**
```env
# .env (development)
ASAAS_API_KEY=eyJ...
ASAAS_WEBHOOK_TOKEN=abc123...
ASAAS_ENVIRONMENT=sandbox
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3

# .env (production)
ASAAS_API_KEY=${VAULT_ASAAS_API_KEY}
ASAAS_WEBHOOK_TOKEN=${VAULT_ASAAS_WEBHOOK_TOKEN}
ASAAS_ENVIRONMENT=production
ASAAS_BASE_URL=https://api.asaas.com/v3
```

**Instalação:**
```bash
cd api
npm install axios
```

---

#### ⏳ **2.2 - Webhook Controller (Asaas)** (1 dia) [NÃO INICIADO]
**Arquivo:** `api/src/controllers/webhook.controller.ts`

**Rotas:**
```typescript
// POST /api/webhooks/asaas
// Validar assinatura Asaas
// Processar eventos:

class WebhookController {
  async handleAsaasWebhook(req: Request, res: Response) {
    // 1. Validar signature
    // 2. Buscar charge no banco
    // 3. Processar por tipo de evento:
    
    switch(event.event) {
      case 'PAYMENT_CONFIRMED':
        // → Atualizar Payment status = 'confirmed'
        // → Se referente a subscription:
        //    - Estender subscription_end (+30 dias ou 1 ano)
        //    - Mudar subscription_status = 'active'
        //    - Atualizar Tenant.subscription_end
        break;
        
      case 'PAYMENT_RECEIVED':
        // → Atualizar Payment status = 'paid'
        // → Atualizar BillingAccount status = 'paid'
        break;
        
      case 'PAYMENT_OVERDUE':
        // → Enviar notificação ao tenant (email/sms)
        break;
        
      case 'PAYMENT_DELETED':
        // → Atualizar Payment status = 'cancelled'
        break;
    }
    
    return res.json({status: 'ok'});
  }
}
```

---

#### ⏳ **2.3 - Payment Routes** (1 dia) [NÃO INICIADO]
**Arquivo:** `api/src/routes/payment.routes.ts`

**Rotas:**
```
POST   /api/v1/payments/create-charge
  Body: {amount, dueDate, type: 'PIX'|'BOLETO', description}
  Response: {chargeId, qrCode, pixUrl, boleto}
  
GET    /api/v1/payments/:id/status
  Response: {status, qrCode, boleto, ...}
  
GET    /api/v1/payments
  Query: ?status=pending|paid|failed
  Response: [{id, amount, status, dueDate, ...}]

POST   /api/webhooks/asaas
  (sem autenticação, valida por signature)
```

---

#### ⏳ **2.4 - Seed: Configuração Asaas para Tenants** (0.5 dia) [NÃO INICIADO]
**Arquivo:** Adicionar ao `api/src/seed/index.ts`

```typescript
// Ao criar tenant de teste:
// 1. Gerar AsaasService
// 2. Criar customer no Asaas (retorna customerId)
// 3. Armazenar em PaymentGatewayCredentials
```

---

### 🟡 **FASE 3: UI DE GESTÃO E DASHBOARD** (Semana 5)
**Objetivo:** Admin e Superadmin conseguem monitorar assinaturas e uso  
**Saída:** Visibilidade completa do negócio

#### ⏳ **3.1 - Dashboard de Uso (Tenant)** (1.5 dias) [NÃO INICIADO]
**Arquivo:** `src/pages/tenant/Usage.tsx`

**Seções:**
- **Cabeçalho:** "Seu Consumo", data de vencimento, botão "Fazer Upgrade"
- **Cards de Métrica (grid 2x2):**
  - Usuários: 2/5 (barra de progresso, 40%)
  - Produtos: 45/100 (45%)
  - Transações: 850/1.000 (85%) ⚠️
  - Armazenamento: 32 GB / 50 GB (64%)
  
- **Gráficos:**
  - Tendência de uso últimos 6 meses (Chart.js)
  - Alertas quando > 80%

**API Endpoint:**
```
GET /api/v1/usage/current
Response: {
  users: {current: 2, limit: 5, percentage: 40},
  products: {current: 45, limit: 100, percentage: 45},
  invoices: {current: 850, limit: 1000, percentage: 85},
  storage: {current: 32, limit: 50, percentage: 64},
  warnings: ['invoices', 'storage']
}
```

---

#### ⏳ **3.2 - Painel de Assinações (Superadmin)** (2 dias) [NÃO INICIADO]
**Arquivo:** `src/pages/superadmin/Subscriptions.tsx`

**Tabela com colunas:**
- Tenant (nome, CNPJ)
- Plano
- Status (ativa/vencida/suspensa) com badge colorido
- Data de vencimento
- Último pagamento
- Valor mensal

**Ações em linha:**
- 🔄 Renovar (estende 30 dias)
- ⏸ Suspender
- ▶ Reativar
- ⬆ Upgrade de plano (dropdown)
- ⚙ Configurar

**Filtros/Busca:**
- Por status (dropdown)
- Por plano (multi-select)
- Vencimento próximo (checkbox)
- CNPJ ou nome (search)

**API Endpoints:**
```
GET    /api/v1/superadmin/subscriptions
GET    /api/v1/superadmin/subscriptions/:tenantId
PATCH  /api/v1/superadmin/subscriptions/:tenantId/renew
PATCH  /api/v1/superadmin/subscriptions/:tenantId/suspend
PATCH  /api/v1/superadmin/subscriptions/:tenantId/reactivate
PATCH  /api/v1/superadmin/subscriptions/:tenantId/change-plan
```

---

#### ⏳ **3.3 - Painel de Billing (Superadmin)** (1.5 dias) [NÃO INICIADO]
**Arquivo:** `src/pages/superadmin/Billing.tsx`

**Cards resumidos:**
- Total a Receber: R$ XX.XXX
- Recebido este mês: R$ X.XXX
- Taxa de Inadimplência: X%
- Média de atraso: X dias

**Tabela: Contas a Receber**
- Tenant
- Valor
- Vencimento
- Status
- Dias em atraso (se aplicável)

**Ações:**
- Marcar como Pago
- Cancelar
- Reenviar cobrança
- Gerar relatório

---

### 🟢 **FASE 4: FINALIZAÇÃO NF-e (Semana 6)**
**Objetivo:** Testar e validar emissão de NF-e com Sefaz real  
**Saída:** Sistema pronto para produção com NF-e homologado

#### ⏳ **4.1 - Teste Real com Sefaz Homologação** (2 dias) [NÃO INICIADO]
**Checklist:**
- [ ] Obter certificado A1 de teste (CNPJ teste: 16.716.114/0001-72)
- [ ] Configurar tenant de teste com certificado em homologação
- [ ] Remover fallback mock em `sefaz.service.ts`
- [ ] Executar ciclo completo:
  1. Criar perfil fiscal (ambiente: homologação)
  2. Criar série fiscal
  3. Emitir NF-e de venda (saída)
  4. Validar retorno Sefaz (protocolo de autorização)
  5. Consultar protocolo (status autorizado)
  6. Cancelar NF-e
  7. Validar evento de cancelamento
- [ ] Documentar erros encontrados

**Referências:**
- Sefaz SP Homologação: https://homologacao.nfe.fazenda.sp.gov.br/webservices/NfeStatusServico4/NfeStatusServico4.asmx
- Ambiente CNPJ teste: 16.716.114/0001-72
- Certificado teste: Baixar do portal Sefaz

---

#### ⏳ **4.2 - Assinatura Digital Real** (1.5 dias) [NÃO INICIADO]
**Arquivo:** `api/src/services/xml-signer.service.ts`

**Usar node-forge:**
```bash
cd api
npm install node-forge jsdom xmldom
```

**Implementação:**
```typescript
class XmlSignerService {
  // Carregar certificado criptografado
  async loadCertificate(tenantId: string): Promise<pem>
  
  // Assinar XML do NF-e
  async signNFe(xmlContent: string, tenantId: string): Promise<signedXml>
  
  // Validar assinatura (para testes)
  async verifySignature(signedXml: string): Promise<boolean>
}
```

**Processo:**
1. Desencriptar certificado PFX
2. Extrair chave privada
3. Assinar XML (Reference URI="#NFe" + Transforms SHA256)
4. Retornar XML assinado pronto para Sefaz

---

#### ⏳ **4.3 - DANFE PDF** (2 dias) [NÃO INICIADO]
**Arquivo:** `api/src/services/danfe.service.ts`

**Usar puppeteer:**
```bash
cd api
npm install puppeteer bwip-js qrcode
```

**Estrutura DANFE:**
```
┌─────────────────────────────────────┐
│  DANFE (Documento Auxiliar NF-e)    │
├─────────────────────────────────────┤
│ Logo Empresa        │  Código Barras  │
│ Razão Social        │  Chave: 12345...│
│ Endereço            │                 │
├─────────────────────────────────────┤
│ DESTINATÁRIO  │  EMITENTE          │
│ CNPJ/CPF      │  CNPJ/CPF          │
│ Endereço      │  Endereço          │
├─────────────────────────────────────┤
│ Produtos (Tabela)                   │
├─────────────────────────────────────┤
│ Totalizadores       │ Impostos       │
├─────────────────────────────────────┤
│ FISCO             │ QR Code (NFC-e) │
│ Protocolo         │ (se aplicável)  │
└─────────────────────────────────────┘
```

**Saída:** PDF binário baixável em `/api/v1/invoices/:id/danfe`

---

#### ⏳ **4.4 - Carta de Correção Eletrônica (CC-e)** (1.5 dias) [NÃO INICIADO]
**Arquivo:** Adicionar em `api/src/services/nfe.service.ts`

**Comportamento:**
- Apenas para NF-e com status AUTHORIZED
- Máximo 20 CC-e por NF-e
- Não pode corrigir valores, apenas campos descritivos

**Rota:**
```
POST /api/v1/invoices/:id/correction
Body: {reason, correction}
Response: {eventId, protocol, status}
```

---

### 🔵 **FASE 5: SEGURANÇA E TESTES** (Semana 7)
**Objetivo:** Garantir qualidade, segurança e monitoramento  
**Saída:** Sistema production-ready

#### ⏳ **5.1 - Migração de Secrets para Vault** (1.5 dias) [NÃO INICIADO]
**Estratégia:** AWS Secrets Manager (se AWS) ou HashiCorp Vault

**Secrets a migrar:**
- CERTIFICATE_ENCRYPTION_KEY
- JWT_SECRET, JWT_REFRESH_SECRET
- DATABASE_URL (master)
- ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN
- INFINITYPAY_API_KEY, INFINITYPAY_WEBHOOK_TOKEN
- SMTP_PASS (email)

**Arquivo:** `api/src/services/secrets.service.ts`

---

#### ⏳ **5.2 - Configurar HTTPS e Security Headers** (1 dia) [NÃO INICIADO]
**Checklist:**
- [ ] Adicionar middleware HTTPS redirect
- [ ] Configurar Helmet headers
- [ ] HSTS (Strict-Transport-Security)
- [ ] CSP (Content-Security-Policy)
- [ ] X-Frame-Options: DENY
- [ ] Certificado SSL/TLS (Let's Encrypt ou AWS ACM)
- [ ] Testar SSL Labs (meta: A+)

---

#### ⏳ **5.3 - Testes Unitários** (2 dias) [NÃO INICIADO]
**Cobertura meta:** 80%+

**Arquivos de teste:**
```
api/test/unit/
├── subscription.service.test.ts
├── limits.service.test.ts
├── xml-signer.service.test.ts
├── asaas.service.test.ts
├── danfe.service.test.ts
└── webhook.controller.test.ts

api/test/integration/
├── subscription-flow.test.ts (criar→renovar→suspender)
├── payment-webhook.test.ts
├── limits-enforcement.test.ts
└── nfe-emission.test.ts
```

---

#### ⏳ **5.4 - CI/CD Pipeline** (1.5 dias) [NÃO INICIADO]
**Arquivo:** `.github/workflows/ci.yml`

**Jobs:**
1. **Lint** - ESLint
2. **Test** - Vitest + coverage
3. **Build** - TypeScript compile
4. **Deploy Staging** - Auto após push em `develop`
5. **Deploy Production** - Manual após merge em `main`

---

### ⭐ **FASE 6: FUNCIONALIDADES ADICIONAIS** (Semana 8+)
Implementar conforme prioridade

- [ ] NFC-e com QR Code
- [ ] Contingência FS-DA
- [ ] Inutilização de série
- [ ] Relatórios avançados (SPED, SINTEGRA)
- [ ] Monitoramento (Prometheus + Grafana)
- [ ] 2FA para SUPERADMIN
- [ ] Notificações (email/SMS)
- [ ] API GraphQL

---

## 📋 CHECKLIST DE PREPARAÇÃO

### 🔐 Segurança
- [ ] Secrets em Vault (não em .env)
- [ ] HTTPS obrigatório
- [ ] Rate limiting (100 req/15min)
- [ ] CORS restrito
- [ ] SQL injection prevented (Prisma)
- [ ] XSS prevented (sanitização)
- [ ] CSRF protection
- [ ] Audit logs

### 🧪 Testes
- [ ] Cobertura > 80%
- [ ] Testes E2E passando
- [ ] Teste com Sefaz homologação OK
- [ ] Teste de carga realizado

### 📊 Monitoramento
- [ ] Prometheus + Grafana
- [ ] Alertas de erro
- [ ] Logs centralizados
- [ ] Health check endpoint

### 📝 Documentação
- [ ] README atualizado
- [ ] API documentada (Swagger)
- [ ] DEPLOY.md com instruções
- [ ] Runbook para incidentes

---

## 🎯 PRIORIDADES E DEPENDÊNCIAS

```
FASE 1 (Semanas 1-2)
├── 1.1 Schema ✅ DONE
├── 1.2 SubscriptionService → 1.3
├── 1.3 validateSubscription → 1.4
├── 1.4 LicenseExpired UI → 1.5
├── 1.5 Limits Service → 1.6
└── 1.6 Seeds

        ↓ (todos completados)

FASE 2 (Semanas 3-4)
├── 2.1 AsaasService → 2.2
├── 2.2 WebhookController → 2.3
├── 2.3 PaymentRoutes → 2.4
└── 2.4 Seeds

        ↓ (paralelo com 1+2)

FASE 4 (Semana 6 - pode começar antes)
├── 4.1 Teste Sefaz
├── 4.2 Assinatura Digital
├── 4.3 DANFE PDF
└── 4.4 CC-e

        ↓

FASE 3 (Semana 5)
├── 3.1 Dashboard Uso
├── 3.2 Painel Subscriptions
└── 3.3 Painel Billing

        ↓

FASE 5 (Semana 7)
├── 5.1 Secrets Vault
├── 5.2 HTTPS
├── 5.3 Testes
└── 5.4 CI/CD
```

---

## 📞 REFERÊNCIAS E RECURSOS

### Sefaz
- **Portal:** https://nfe.fazenda.gov.br
- **Homologação SP:** https://homologacao.nfe.fazenda.sp.gov.br/webservices/NfeStatusServico4/NfeStatusServico4.asmx
- **Produção SP:** https://nfe.fazenda.sp.gov.br/webservices/NfeStatusServico4/NfeStatusServico4.asmx

### Gateways
- **Asaas:** https://docs.asaas.com/api/v3
- **InfinityPay:** https://docs.infinitypay.io

### Bibliotecas
- `node-forge` - Assinatura digital X.509
- `puppeteer` - Geração DANFE PDF
- `qrcode` - QR Codes
- `bwip-js` - Código de barras
- `axios` - HTTP client

---

## 📊 ESTIMATIVAS DE ESFORÇO

| Fase | Tarefas | Dias | Desenvolvedor(es) |
|------|---------|------|-------------------|
| 1 | 6 | 6 dias | 1 | 
| 2 | 4 | 5 dias | 1 |
| 3 | 3 | 4 dias | 1-2 |
| 4 | 4 | 6 dias | 1 (paralelo com 1-2) |
| 5 | 4 | 6 dias | 1-2 |
| **TOTAL** | **21** | **~4 semanas** | 1-2 |

---

## 🚀 INÍCIO IMEDIATO - PRÓXIMOS PASSOS

### Semana de 20/11/2025:
1. **Implementar 1.2 (SubscriptionService)** - Dia 20-21
2. **Implementar 1.3 (validateSubscription middleware)** - Dia 21-22
3. **Implementar 1.4 (LicenseExpired UI)** - Dia 22-23
4. **Iniciar 2.1 (AsaasService)** - Dia 23-24

### Semana de 27/11/2025:
1. **Finalizar 2.1 e 2.2** (AsaasService + WebhookController)
2. **Implementar 2.3** (PaymentRoutes)
3. **Iniciar 4.1** (Teste Sefaz em paralelo)

---

**Status:** 🚧 EM DESENVOLVIMENTO  
**Última atualização:** 20/11/2025  
**Responsável:** Clegivaldo
