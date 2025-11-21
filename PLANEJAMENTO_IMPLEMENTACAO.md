# 🚀 Planejamento de Implementação - MedManager-PRO 2.0

**Data:** 20/11/2025  
**Objetivo:** Transformar o sistema em plataforma multi-tenant completa com gestão de assinaturas, pagamentos e NF-e finalizada

---

## 📊 Estado Atual do Sistema

### ✅ Funcionalidades Completas (95-100%)
- ✅ Multi-tenancy Database-per-Tenant (95%)
- ✅ RBAC Granular com 70+ permissões (100%)
- ✅ Autenticação JWT + Refresh Token (100%)
- ✅ Assinatura Digital A1 para NF-e (100%)
- ✅ Isolamento de pastas por tenant (100%)
- ✅ Criptografia de certificados AES-256-GCM (100%)

### ⚠️ Funcionalidades Parciais (30-85%)
- ⚠️ Emissão de NF-e (85%) - falta teste real Sefaz + DANFE PDF
- ⚠️ Sistema de Planos (40%) - estrutura existe, sem enforcement
- ⚠️ Validação de Licença (30%) - campos existem, sem middleware

### ❌ Funcionalidades Ausentes (0%)
- ❌ Sistema de Pagamentos (Asaas/InfinityPay)
- ❌ Gestão de Assinaturas e Renovação
- ❌ Enforcement de Limites por Plano
- ❌ Billing e Contas a Receber
- ❌ Carta de Correção Eletrônica
- ❌ Dashboard de Uso Real

---

## 🎯 Roadmap de Implementação

### ✅ INFRAESTRUTURA DE PRODUÇÃO (COMPLETA)

**Status:** 🎉 100% IMPLEMENTADO

#### Sistemas Implementados:
- ✅ **Webhook Retry System** com exponential backoff (1min → 5min → 15min → 1h)
- ✅ **Dead Letter Queue (DLQ)** para webhooks falhados
- ✅ **Backup Automático** PostgreSQL com retenção e compressão
- ✅ **Restore Seguro** com verificação de integridade
- ✅ **Cron Job de Assinaturas** com notificações em 3 níveis
- ✅ **Script Reprocess DLQ** com estatísticas e limpeza automática
- ✅ **Monitoramento Completo** (Prometheus + Grafana + Alertmanager)
- ✅ **Exporters** para Node, PostgreSQL e Redis
- ✅ **Alertas Configurados** (20+ regras para sistema, DB, app, negócio)
- ✅ **Deploy de Produção** com Caddy reverse proxy e TLS automático
- ✅ **Secrets Management** (Docker Secrets, AWS Secrets Manager, Vault)
- ✅ **Migração Prisma** para WebhookLog e DeadLetterQueue

#### Documentação Criada:
- ✅ `AUTOMATION_SYSTEMS.md` - Guia de backups, cron jobs, webhooks
- ✅ `MONITORING_SETUP.md` - Setup Prometheus + Grafana completo
- ✅ `SECRETS_MANAGEMENT.md` - Gerenciamento seguro de credenciais
- ✅ `DEPLOY_PROD.md` - Deploy completo para produção
- ✅ `INFRASTRUCTURE_COMPLETE.md` - Resumo executivo

---

### ✅ FASE 1: CORE DO NEGÓCIO (COMPLETA)

#### 1.1. Sistema de Assinaturas e Planos ✅
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** Nenhuma  
**Status:** ✅ IMPLEMENTADO

**Tarefas:**
- [x] Criar tabelas `Subscription`, `Payment`, `BillingAccount` no schema master
- [x] Adicionar campos de assinatura em `Tenant`: `subscription_start`, `subscription_end`, `subscription_status`
- [x] Implementar `SubscriptionService` com métodos:
  - `createSubscription(tenantId, planId, duration)`
  - `renewSubscription(tenantId, months)`
  - `checkValidity(tenantId)`
  - `suspendSubscription(tenantId)`
  - `reactivateSubscription(tenantId)`
- [x] Criar migration e rodar em dev
- [x] Criar seeds para planos padrão (Starter, Professional, Enterprise)

**Arquivos a criar:**
- `api/prisma/migrations/XXXXX_add_subscriptions/migration.sql`
- `api/src/services/subscription.service.ts`
- `api/src/types/subscription.types.ts`

---

#### 1.2. Middleware de Validação de Licença ✅
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** 1.1  
**Status:** ✅ IMPLEMENTADO

**Tarefas:**
- [x] Criar middleware `validateSubscription` em `api/src/middleware/subscription.middleware.ts`
- [x] Validar `subscription_end < now()` e `subscription_status !== 'ACTIVE'`
- [x] Retornar erro 403 com código `LICENSE_EXPIRED` se vencido
- [x] Aplicar middleware em todas as rotas de tenant (exceto `/auth/login` e `/license`)
- [x] Criar exceção para SUPERADMIN (bypass automático)

**Arquivos a criar:**
- `api/src/middleware/subscription.middleware.ts`

**Arquivos a editar:**
- `api/src/server.ts` - adicionar middleware global
- `api/src/routes/*.routes.ts` - aplicar em rotas protegidas

---

#### 1.3. Página de Licença Vencida (Frontend) ⏱️ 1 dia
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** 1.2  

**Tarefas:**
- [ ] Criar página `src/pages/tenant/LicenseExpired.tsx`
- [ ] Exibir informações: plano atual, data de vencimento, valor da renovação
- [ ] Botão "Renovar Assinatura" → gera cobrança
- [ ] Interceptor em `src/services/api.ts` detecta erro `LICENSE_EXPIRED`
- [ ] Redirecionar para `/license-expired` automaticamente
- [ ] Atualizar `ProtectedRoute` para bloquear todas as rotas exceto `/license-expired`

**Arquivos a criar:**
- `src/pages/tenant/LicenseExpired.tsx`

**Arquivos a editar:**
- `src/services/api.ts` - adicionar interceptor
- `src/components/ProtectedRoute.tsx` - validar licença
- `src/App.tsx` - adicionar rota

---

#### 1.4. Enforcement de Limites por Plano ⏱️ 3 dias
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** 1.1  

**Tarefas:**
- [ ] Criar tabela `UsageMetrics` para tracking de uso mensal
- [ ] Implementar `LimitsService` com métodos:
  - `checkUserLimit(tenantId)` - verifica max_users
  - `checkProductLimit(tenantId)` - verifica max_products
  - `checkTransactionLimit(tenantId)` - verifica max_monthly_transactions
  - `checkStorageLimit(tenantId)` - verifica max_storage_gb
  - `trackUsage(tenantId, metricType, value)` - registra uso
- [ ] Criar middleware `checkPlanLimits` que valida antes de operações CRUD
- [ ] Retornar erro 402 Payment Required ao atingir limite
- [ ] Aplicar em controllers: `user.controller`, `product.controller`, `invoice.controller`

**Arquivos a criar:**
- `api/src/services/limits.service.ts`
- `api/src/middleware/limits.middleware.ts`
- `api/src/types/usage.types.ts`
- `api/prisma/migrations/XXXXX_add_usage_metrics/migration.sql`

**Arquivos a editar:**
- `api/src/controllers/user.controller.ts`
- `api/src/controllers/product.controller.ts`
- `api/src/controllers/invoice.controller.ts`

---

### 🟠 FASE 2: PAGAMENTOS (Crítico - Semanas 2-3)

#### 2.1. Integração com Gateway Asaas ⏱️ 4 dias
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** 1.1  

**Tarefas:**
- [ ] Instalar SDK `asaas` via npm
- [ ] Criar `AsaasService` em `api/src/services/payment/asaas.service.ts`
- [ ] Implementar métodos:
  - `createCustomer(tenantData)` - cria cliente no Asaas
  - `createCharge(tenantId, amount, dueDate, type)` - gera PIX/boleto
  - `getChargeStatus(chargeId)` - consulta status
  - `cancelCharge(chargeId)` - cancela cobrança
- [ ] Criar `AsaasWebhookController` em `api/src/controllers/webhook.controller.ts`
- [ ] Implementar handlers para eventos:
  - `PAYMENT_CONFIRMED` → atualizar subscription_end (+30 dias)
  - `PAYMENT_RECEIVED` → marcar BillingAccount como PAID
  - `PAYMENT_OVERDUE` → notificar tenant
- [ ] Adicionar rotas:
  - `POST /api/webhooks/asaas` (público, validar assinatura)
  - `POST /api/payments/create-charge` (protegido)
  - `GET /api/payments/:id/status` (protegido)
- [ ] Configurar webhook no painel Asaas apontando para produção

**Arquivos a criar:**
- `api/src/services/payment/asaas.service.ts`
- `api/src/controllers/webhook.controller.ts`
- `api/src/routes/webhook.routes.ts`
- `api/src/routes/payment.routes.ts`
- `api/src/types/payment.types.ts`

**Variáveis de ambiente (.env):**
```
ASAAS_API_KEY=seu_api_key_aqui
ASAAS_ENVIRONMENT=sandbox # ou production
ASAAS_WEBHOOK_TOKEN=seu_webhook_token_aqui
```

---

#### 2.2. Integração com Gateway InfinityPay ⏱️ 3 dias
**Prioridade:** 🟠 ALTA  
**Dependências:** 2.1  

**Tarefas:**
- [ ] Instalar SDK `infinitypay` via npm (se existir) ou usar REST API
- [ ] Criar `InfinityPayService` espelhando estrutura do `AsaasService`
- [ ] Implementar mesmos métodos (createCustomer, createCharge, etc.)
- [ ] Criar `InfinityPayWebhookController`
- [ ] Adicionar campo `payment_gateway_preference` em `Tenant` (ASAAS | INFINITYPAY | BOTH)
- [ ] Criar `PaymentGatewayFactory` que retorna service correto baseado em preferência
- [ ] Adicionar rota `POST /api/webhooks/infinitypay`

**Arquivos a criar:**
- `api/src/services/payment/infinitypay.service.ts`
- `api/src/services/payment/gateway-factory.service.ts`
- `api/src/controllers/infinitypay-webhook.controller.ts`

---

#### 2.3. Sistema de Billing e Contas a Receber ⏱️ 2 dias
**Prioridade:** 🟠 ALTA  
**Dependências:** 2.1  

**Tarefas:**
- [ ] Tabela `BillingAccount` já criada em 1.1
- [ ] Implementar `BillingService` com métodos:
  - `createBillingAccount(tenantId, amount, dueDate)`
  - `markAsPaid(billingId, transactionId)`
  - `listOverdueAccounts()`
  - `generateMonthlyBilling()` - job automático
- [ ] Criar endpoint `GET /api/superadmin/billing` listando contas
- [ ] Adicionar filtros por status (PENDING/PAID/OVERDUE) e tenant
- [ ] Criar job cron que gera cobrança automática 7 dias antes do vencimento

**Arquivos a criar:**
- `api/src/services/billing.service.ts`
- `api/src/controllers/billing.controller.ts`
- `api/src/routes/billing.routes.ts`
- `api/src/jobs/monthly-billing.job.ts`

---

### 🟡 FASE 3: UI DE GESTÃO (Alta - Semana 4)

#### 3.1. Dashboard de Uso para Tenant ✅ (IMPLEMENTADO EM PROGRESSO)
**Prioridade:** 🟠 ALTA  
**Dependências:** FASE 1 concluída  
**Status:** Parcial (serviços prontos, UI em construção)

**Tarefas:**
- [x] Modelo `UsageMetrics` criado no schema master
- [x] Serviço `limits.service.ts` com métodos de verificação
- [x] Middleware coleta e atualiza métricas automaticamente
- [ ] Página `src/pages/tenant/Usage.tsx` (cards, barras, upgrade)
- [ ] Endpoint `GET /api/usage/current` agregando métricas + limites
- [ ] Gráfico de tendência (agregação mensal futura)
- [ ] Alerta visual quando uso > 80%
- [ ] Ação "Fazer Upgrade" integrando com pagamentos

**Arquivos criados/parciais:**
- `api/src/services/limits.service.ts`
- `api/prisma/schema.prisma` (UsageMetrics)
- `api/src/middleware/subscription.middleware.ts` (limites)
- `src/pages/tenant/Usage.tsx` (PENDENTE)
  

---

#### 3.2. Gestão de Assinaturas (Superadmin) 🔄 EM ANDAMENTO
**Prioridade:** 🟠 ALTA  
**Dependências:** Assinaturas + Pagamentos prontos  
**Status:** Planejado / em início

**Tarefas:**
- [x] Tabelas `Subscription` e `Payment` existentes
- [x] Renovação automática via webhook Asaas implementada
- [ ] Página `src/pages/superadmin/Subscriptions.tsx`
- [ ] Endpoint `GET /api/superadmin/subscriptions` (listar)
- [ ] Endpoint `PATCH /api/superadmin/subscriptions/:tenantId/renew`
- [ ] Endpoint `PATCH /api/superadmin/subscriptions/:tenantId/suspend`
- [ ] Endpoint `PATCH /api/superadmin/subscriptions/:tenantId/change-plan`
- [ ] Filtros e badges por status
- [ ] Ações multi-seleção (renovar em massa)
- [ ] Export CSV/Excel

**Arquivos pendentes:**
- `api/src/controllers/superadmin/subscription.controller.ts`
- `api/src/routes/superadmin/subscription.routes.ts`
- `src/pages/superadmin/Subscriptions.tsx`

---

#### 3.3. Página de Billing (Superadmin) 🔄 EM ANDAMENTO
**Prioridade:** 🟡 MÉDIA  
**Dependências:** Pagamentos / Cobranças automáticas  
**Status:** Planejado

**Tarefas:**
- [x] Tabela `BillingAccount` existente
- [ ] Página `src/pages/superadmin/Billing.tsx`
- [ ] Endpoint `GET /api/superadmin/billing` (listagem)
- [ ] Filtros por status, período, tenant
- [ ] Ação marcar como pago manualmente
- [ ] Reenviar cobrança (recreate charge)
- [ ] KPIs: Total a receber, recebido no mês, inadimplência
- [ ] Exportar CSV/PDF

**Arquivos pendentes:**
- `api/src/controllers/superadmin/billing.controller.ts`
- `api/src/routes/superadmin/billing.routes.ts`
- `src/pages/superadmin/Billing.tsx`

---

### 🟢 FASE 4: FINALIZAÇÃO NF-e (Alta - Semana 5)

#### 4.1. Teste Real com Sefaz Homologação ⏱️ 2 dias
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** Nenhuma (pode ser feito em paralelo)  

**Tarefas:**
- [ ] Obter certificado A1 de teste válido
- [ ] Configurar tenant de teste com certificado em homologação
- [ ] Remover fallback mock em `sefaz.service.ts`
- [ ] Executar teste E2E completo:
  - Criar perfil fiscal
  - Emitir NF-e de venda
  - Validar retorno da Sefaz (protocolo, chave de acesso)
  - Consultar protocolo
  - Cancelar NF-e
  - Validar evento de cancelamento
- [ ] Documentar erros encontrados e ajustar

**Arquivos a editar:**
- `api/src/services/sefaz.service.ts` - remover mock fallback
- `api/test/nfe-complete-flow.e2e.test.ts` - atualizar para ambiente real

---

#### 4.2. Implementar DANFE PDF Real ⏱️ 3 dias
**Prioridade:** 🔴 CRÍTICA  
**Dependências:** 4.1  

**Tarefas:**
- [ ] Instalar `puppeteer` ou `pdfkit`
- [ ] Criar `DanfeService` em `api/src/services/danfe.service.ts`
- [ ] Implementar layout oficial da Receita Federal:
  - Cabeçalho com logo empresa
  - Dados do emitente e destinatário
  - Produtos com descrição, quantidade, valor
  - Totais e tributos
  - Código de barras da chave de acesso (usando `bwip-js`)
  - QR Code para consulta (NFC-e)
- [ ] Gerar PDF a partir do XML assinado
- [ ] Atualizar endpoint `GET /api/fiscal/invoices/:id/danfe` para retornar PDF real
- [ ] Adicionar watermark "SEM VALOR FISCAL" em homologação

**Arquivos a criar:**
- `api/src/services/danfe.service.ts`
- `api/src/templates/danfe.html` (template HTML)

**Arquivos a editar:**
- `api/src/controllers/invoice.controller.ts` - usar DanfeService

---

#### 4.3. Carta de Correção Eletrônica (CC-e) ⏱️ 2 dias
**Prioridade:** 🟡 MÉDIA  
**Dependências:** 4.1  

**Tarefas:**
- [ ] Adicionar método `sendCorrection()` em `nfe.service.ts`
- [ ] Gerar XML de evento tipo 110110 (CC-e)
- [ ] Assinar evento digitalmente
- [ ] Enviar para Sefaz via `recepcaoEvento`
- [ ] Armazenar XML do evento em `Invoice.correction_events` (JSON array)
- [ ] Criar endpoint `POST /api/fiscal/invoices/:id/correction`
- [ ] Validar regras:
  - Apenas para NF-e autorizadas
  - Máximo 20 CC-e por NF-e
  - Não pode corrigir valores ou produtos
- [ ] Criar UI modal em `InvoiceDetails.tsx` para solicitar CC-e

**Arquivos a criar:**
- `src/components/tenant/CorrectionModal.tsx`

**Arquivos a editar:**
- `api/src/services/nfe.service.ts`
- `api/src/controllers/invoice.controller.ts`
- `src/pages/tenant/InvoiceDetails.tsx`

---

#### 4.4. Validação XSD e Retry com Backoff ⏱️ 2 dias
**Prioridade:** 🟡 MÉDIA  
**Dependências:** 4.1  

**Tarefas:**
- [ ] Baixar schemas XSD oficiais da Receita Federal
- [ ] Instalar `libxmljs2` para validação XSD
- [ ] Implementar `XmlValidatorService` que valida XML antes de enviar
- [ ] Adicionar retry com backoff exponencial:
  - Tentativa 1: imediato
  - Tentativa 2: 5 segundos
  - Tentativa 3: 15 segundos
- [ ] Aplicar retry apenas em erros temporários (timeout, 503)
- [ ] Não fazer retry em erros de validação (rejeição 400-499)

**Arquivos a criar:**
- `api/src/services/xml-validator.service.ts`
- `api/src/assets/schemas/` (schemas XSD)
- `api/src/utils/retry.util.ts`

**Arquivos a editar:**
- `api/src/services/sefaz.service.ts` - adicionar retry

---

### 🔵 FASE 5: MÓDULOS E SEGURANÇA (Média - Semana 6)

#### 5.1. Módulos Opcionais por Plano ⏱️ 3 dias
**Prioridade:** 🟡 MÉDIA  
**Dependências:** 1.1, 1.4  

**Tarefas:**
- [ ] Criar `ROUTE_MODULE_MAP` em `api/src/config/modules.ts`:
  ```typescript
  {
    '/api/fiscal/*': 'NFE',
    '/api/financial/*': 'FINANCE',
    '/api/routes/*': 'ROUTES',
    '/api/bi/*': 'BI',
    '/api/automation/*': 'AUTOMATION'
  }
  ```
- [ ] Atualizar `checkPlanLimits` middleware para validar módulo habilitado
- [ ] Retornar erro 403 com `code: 'MODULE_NOT_ENABLED'` se módulo não contratado
- [ ] Criar guard no frontend `src/components/ProtectedRoute.tsx`
- [ ] Ocultar rotas de módulos não habilitados no menu lateral
- [ ] Exibir modal "Fazer Upgrade" ao tentar acessar módulo bloqueado

**Arquivos a criar:**
- `api/src/config/modules.ts`
- `src/components/tenant/UpgradeModal.tsx`

**Arquivos a editar:**
- `api/src/middleware/limits.middleware.ts`
- `src/components/ProtectedRoute.tsx`
- `src/components/Layout/Sidebar.tsx` - condicional no menu

---

#### 5.2. Migrar Secrets para Vault ⏱️ 3 dias
**Prioridade:** 🔴 CRÍTICA (Produção)  
**Dependências:** Nenhuma  

**Tarefas:**
- [ ] Escolher solução: AWS Secrets Manager ou HashiCorp Vault
- [ ] Instalar SDK (`@aws-sdk/client-secrets-manager` ou `node-vault`)
- [ ] Criar `SecretsService` em `api/src/services/secrets.service.ts`
- [ ] Migrar secrets:
  - `CERTIFICATE_ENCRYPTION_KEY` → vault
  - `JWT_SECRET` → vault
  - `JWT_REFRESH_SECRET` → vault
  - `DATABASE_URL` master → vault
  - `ASAAS_API_KEY` → vault
  - `INFINITYPAY_API_KEY` → vault
- [ ] Atualizar `environment.ts` para buscar do vault
- [ ] Rotacionar secrets antigos
- [ ] Documentar em `DEPLOY.md` processo de setup do vault

**Arquivos a criar:**
- `api/src/services/secrets.service.ts`

**Arquivos a editar:**
- `api/src/config/environment.ts`
- `DEPLOY.md`

---

#### 5.3. Configurar HTTPS e Security Headers ⏱️ 1 dia
**Prioridade:** 🔴 CRÍTICA (Produção)  
**Dependências:** Nenhuma  

**Tarefas:**
- [ ] Adicionar middleware que força HTTPS em produção:
  ```typescript
  if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  ```
- [ ] Atualizar Helmet com headers de segurança:
  - HSTS (Strict-Transport-Security)
  - CSP (Content-Security-Policy)
  - X-Frame-Options: DENY
- [ ] Configurar certificado SSL/TLS no Nginx ou AWS ALB
- [ ] Atualizar CORS para aceitar apenas domínios em produção
- [ ] Testar com SSL Labs (nota A+)

**Arquivos a editar:**
- `api/src/server.ts`
- `docker-compose.yml` - adicionar Nginx se necessário

---

### 🟣 FASE 6: TESTES E MONITORAMENTO (Baixa - Semana 7)

#### 6.1. Testes Unitários e Integração ⏱️ 4 dias
**Prioridade:** 🟡 MÉDIA  
**Dependências:** Todas as fases anteriores  

**Tarefas:**
- [ ] Criar testes unitários:
  - `xmlSigner.test.ts` - assinar e validar assinaturas
  - `nfeXmlBuilder.test.ts` - geração de XML válido
  - `certificateManager.test.ts` - criptografia/descriptografia
  - `subscription.service.test.ts` - lógica de renovação
  - `limits.service.test.ts` - validação de limites
  - `asaas.service.test.ts` - mock de APIs
- [ ] Criar testes de integração:
  - `subscription-flow.integration.test.ts` - criar → renovar → suspender
  - `payment-webhook.integration.test.ts` - simular webhook Asaas
  - `limits-enforcement.integration.test.ts` - bloquear ao atingir limite
- [ ] Configurar coverage com `vitest --coverage`
- [ ] Meta: 80%+ de cobertura

**Arquivos a criar:**
- `api/test/unit/*.test.ts` (múltiplos arquivos)
- `api/test/integration/*.test.ts` (múltiplos arquivos)

---

#### 6.2. CI/CD Pipeline ⏱️ 3 dias
**Prioridade:** 🟡 MÉDIA  
**Dependências:** 6.1  

**Tarefas:**
- [ ] Criar `.github/workflows/ci.yml`:
  - Job 1: Lint (ESLint)
  - Job 2: Test (Vitest + coverage)
  - Job 3: Build (TypeScript compile)
  - Job 4: Deploy Staging (auto após push em `develop`)
  - Job 5: Deploy Production (manual após merge em `main`)
- [ ] Configurar secrets no GitHub:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `DOCKER_USERNAME`
  - `DOCKER_PASSWORD`
- [ ] Criar script de deploy `scripts/deploy.sh`
- [ ] Configurar rollback automático se health check falhar

**Arquivos a criar:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`
- `scripts/deploy.sh`

---

#### 6.3. Monitoramento com Prometheus + Grafana ⏱️ 3 dias
**Prioridade:** 🟢 BAIXA  
**Dependências:** Nenhuma  

**Tarefas:**
- [ ] Instalar `prom-client` para métricas
- [ ] Expor endpoint `GET /metrics` com métricas Prometheus:
  - `http_requests_total{method,route,status}`
  - `http_request_duration_seconds{method,route}`
  - `nfe_emissions_total{tenant,status}`
  - `subscriptions_active{plan}`
  - `subscriptions_expired_total`
- [ ] Configurar Prometheus no `docker-compose.yml`
- [ ] Criar dashboards Grafana:
  - Dashboard 1: APIs (response time, error rate)
  - Dashboard 2: Tenants (uso por plano, licenças vencendo)
  - Dashboard 3: NF-e (emissões por hora, taxa de sucesso)
  - Dashboard 4: Pagamentos (receita mensal, inadimplência)
- [ ] Configurar alertas:
  - Error rate > 5%
  - Response time > 2s
  - Licenças vencendo em 7 dias

**Arquivos a criar:**
- `api/src/services/metrics.service.ts`
- `docker/prometheus/prometheus.yml`
- `docker/grafana/dashboards/*.json`

**Arquivos a editar:**
- `docker-compose.yml` - adicionar Prometheus e Grafana

---

#### 6.4. Logging Centralizado ⏱️ 2 dias
**Prioridade:** 🟢 BAIXA  
**Dependências:** Nenhuma  

**Tarefas:**
- [ ] Configurar Winston para enviar logs ao ElasticSearch ou CloudWatch
- [ ] Estruturar logs com contexto rico:
  - `tenantId`, `userId`, `action`, `resource`, `status`, `duration`
- [ ] Criar dashboard Kibana (se ElasticSearch) com:
  - Logs de erro por tenant
  - Acessos por hora
  - Ações de admin auditadas
- [ ] Configurar retenção de logs (90 dias)

**Arquivos a editar:**
- `api/src/config/logger.ts`
- `docker-compose.yml` - adicionar ElasticSearch + Kibana (opcional)

---

### 🎁 FASE 7: FUNCIONALIDADES ADICIONAIS (Opcional - Semanas 8+)

#### 7.1. NFC-e com QR Code ⏱️ 2 dias
**Prioridade:** 🟢 BAIXA  

**Tarefas:**
- [ ] Adicionar suporte a modelo 65 (NFC-e)
- [ ] Gerar QR Code com dados para consulta (usando `qrcode` lib)
- [ ] Incluir QR Code no XML e DANFE
- [ ] Validar CSC (Código de Segurança do Contribuinte) obrigatório

---

#### 7.2. Contingência FS-DA ⏱️ 3 dias
**Prioridade:** 🟢 BAIXA  

**Tarefas:**
- [ ] Implementar emissão offline (FS-DA)
- [ ] Armazenar XML em fila para envio posterior
- [ ] Job que tenta enviar XMLs pendentes a cada 15 minutos
- [ ] Validar regras de contingência (prazo de 168h)

---

#### 7.3. Relatórios Avançados ⏱️ 3 dias
**Prioridade:** 🟢 BAIXA  

**Tarefas:**
- [ ] Relatório de NF-e emitidas (filtros: período, cliente, status)
- [ ] Relatório de faturamento (por tenant, por plano)
- [ ] Relatório de inadimplência
- [ ] Exportar Excel/PDF

---

## 📋 Checklist Final de Produção

### 🔐 Segurança
- [ ] Secrets migrados para vault (AWS KMS ou HashiCorp)
- [ ] HTTPS obrigatório configurado
- [ ] Certificados A1 criptografados com chave segura
- [ ] Rate limiting configurado (100 req/15min)
- [ ] CORS restrito a domínios em produção
- [ ] SQL injection prevenido (Prisma ORM)
- [ ] XSS prevenido (sanitização de inputs)
- [ ] CSRF protection (tokens)
- [ ] Audit logs imutáveis
- [ ] IP whitelist para superadmin

### 🧪 Testes
- [ ] Cobertura de testes > 80%
- [ ] Testes E2E passando (NF-e, subscription, payment)
- [ ] Testes de carga realizados (k6)
- [ ] Teste real com Sefaz homologação OK

### 📊 Monitoramento
- [ ] Prometheus + Grafana configurado
- [ ] Alertas de erro configurados
- [ ] Logs centralizados (ElasticSearch ou CloudWatch)
- [ ] Dashboard de negócio (receita, inadimplência)
- [ ] Health check endpoint (`/health`)

### 🚀 Deploy
- [ ] CI/CD pipeline funcionando
- [ ] Deploy staging automatizado
- [ ] Deploy production manual com aprovação
- [ ] Rollback testado
- [ ] Backup automatizado diário para S3
- [ ] Migrations rodadas em produção

### 📝 Documentação
- [ ] README.md atualizado
- [ ] API documentada (Swagger ou Postman)
- [ ] DEPLOY.md com instruções de produção
- [ ] Runbook para incidentes
- [ ] Documentação de webhooks (Asaas/InfinityPay)

---

## 🎯 Métricas de Sucesso

### KPIs Técnicos
- ✅ Uptime > 99.5%
- ✅ Response time API < 500ms (p95)
- ✅ Error rate < 1%
- ✅ Cobertura de testes > 80%

### KPIs de Negócio
- ✅ Taxa de sucesso de emissão NF-e > 98%
- ✅ Taxa de conversão de pagamento > 95%
- ✅ Inadimplência < 5%
- ✅ Churn rate < 3%/mês

---

## 📞 Contatos de Suporte

### Sefaz
- **Homologação SP:** https://homologacao.nfe.fazenda.sp.gov.br
- **Produção SP:** https://nfe.fazenda.sp.gov.br
- **Suporte:** nfe@fazenda.sp.gov.br

### Gateways de Pagamento
- **Asaas:** suporte@asaas.com | https://docs.asaas.com
- **InfinityPay:** contato@infinitypay.io | https://docs.infinitypay.io

### Infraestrutura
- **AWS:** console.aws.amazon.com
- **Docker:** docker.com

---

**Última atualização:** 20/11/2025  
**Responsável:** Clegivaldo  
**Status:** 🚧 EM DESENVOLVIMENTO

