# Plano de Implementação - MedManager-PRO2.0

Este documento detalha o plano para aprimorar o sistema MedManager-PRO2.0, focando em pagamentos (Asaas/InfinityPay), portal financeiro do tenant e emissão de NF-e, garantindo conformidade com RDC 430 e arquitetura multi-tenant segura.

## 1. Análise do Sistema Atual

### Pontos Fortes
- **Arquitetura Sólida:** Multi-tenancy com banco de dados isolado por tenant (Database-per-tenant) e RBAC implementado.
- **Compliance RDC 430:** Estrutura de dados pronta para rastreabilidade de lotes, controle de temperatura e validação de fornecedores.
- **NF-e:** Geração de XML 4.00 e Assinatura Digital A1 já implementadas localmente.
- **Isolamento de Arquivos:** Lógica de separação de uploads por `tenantId` já existe para certificados e logos.

### Pontos de Atenção (Gaps Identificados)
- **InfinityPay:** Interface de configuração existe, mas a integração backend está pendente/beta.
- **Portal Financeiro do Tenant:** Não existe uma página dedicada para o tenant ver seu histórico de faturas e gerar 2ª via de boletos/Pix.
- **Integração SEFAZ:** A comunicação real (SOAP) com a SEFAZ ainda é um mock.
- **Uploads:** Necessário garantir que *todos* os novos uploads sigam o padrão de isolamento.

## 2. Planejamento de Melhorias e Novas Funcionalidades

### Fase 1: Integração de Pagamentos (SuperAdmin)
**Objetivo:** Permitir que o SuperAdmin receba dos Tenants via Asaas ou InfinityPay.

#### Backend ✅ CONCLUÍDO
- [x] **Refatorar Service de Pagamentos:** ✅ Interface `PaymentGateway` implementada com suporte a múltiplos gateways.
- [x] **Implementar InfinityPayService:** ✅ Implementado com:
    - Geração de cobranças (Pix/boleto).
    - Estrutura para webhook de conciliação automática.
- [x] **Atualizar SuperAdminController:** ✅ Métodos completos para:
    - `listCharges()` - Listar cobranças
    - `createChargeForTenant()` - Criar cobrança
    - `syncChargeStatus()` - Sincronizar status
    - `syncAllCharges()` - Sincronização em lote
    - `importChargesFromAsaas()` - Importar do Asaas
    - `listBillingAccounts()` - Listar contas

#### Frontend ✅ CONCLUÍDO
- [x] **Finalizar Página de Provedores:** ✅ UI completa com:
  - Tabs para Asaas e InfinityPay
  - Validação de campos
  - Indicadores visuais de status
  - Links para documentação
  - Melhorias em UX e feedback

### Fase 2: Portal Financeiro do Tenant ("Minhas Faturas")
**Objetivo:** Permitir que o Tenant acompanhe suas pendências e realize pagamentos.

#### Backend ✅ CONCLUÍDO
- [x] **Novos Endpoints (`/api/v1/tenant/billing`):** ✅ Implementados:
    - `GET /invoices`: Listar faturas do tenant (pagas, pendentes, vencidas).
    - `GET /invoices/:id/payment-info`: Obter QR Code Pix ou Linha Digitável Boleto atualizados.
    - Controller: `tenantBilling.controller.ts`
    - Rotas registradas em: `server.ts`
- [ ] **Job de Sincronização:** Garantir que o status das faturas no banco local esteja sincronizado com o gateway (Asaas/InfinityPay).
    - *Nota: A funcionalidade `syncAllCharges()` já existe e pode ser agendada via cron.*
    - Atualização: Cron ativado no bootstrap (`initPaymentSyncJob()` em `api/src/server.ts`).

#### Frontend ✅ CONCLUÍDO
- [x] **Nova Página (`src/pages/tenant/Financial/MyInvoices.tsx`):** ✅ Implementada com:
    - Tabela com histórico de faturas
    - Status visual (Pago, Pendente, Atrasado)
    - Botão "Pagar" que abre modal com Pix/Boleto
    - Cards de resumo (faturas pendentes/pagas)
    - Integração completa com API
    - Serviço: `tenant-billing.service.ts`

### Fase 3: Emissão de NF-e (Compliance Fiscal)
**Objetivo:** Tornar a emissão de NF-e funcional em produção.

#### Backend
- [x] **Integração SOAP SEFAZ (base):**
    - Implementar cliente SOAP nativo (usando `soap` ou `axios` com XML envelopes) OU integrar API facilitadora (opcional configurável).
    - *Recomendação:* Manter a implementação nativa (sem custo por nota) como padrão, mas adicionar suporte a API (ex: NFe.io) como fallback.
- [x] **Gerenciamento de Retornos (parcial):** Tratar status de autorização, rejeição e denegação.
- [x] **Cancelamento:** Evento fiscal implementado; **CC-e** em placeholder aguardando implementação completa.

### Fase 4: Refinamentos RDC 430 e Segurança
- [x] **Auditoria de Arquivos:** Uploads isolados criados em `/uploads/docs/{tenantId}/` com rotas `POST /api/v1/docs/upload`, `GET /api/v1/docs/list`, `DELETE /api/v1/docs/delete/:filename` e estático `GET /static/docs`.
- [x] **Backup Individual:** Script PowerShell `scripts/tenant-db-backup.ps1` e endpoint `POST /api/v1/backup/db/:tenantId`.

## 3. Estrutura de Arquivos Proposta

### Backend (`api/src`)
```
api/src/
├── services/
│   ├── payments/
│   │   ├── PaymentGateway.interface.ts
│   │   ├── AsaasGateway.ts
│   │   └── InfinityPayGateway.ts
│   └── sefaz/
│       ├── SoapClient.ts
│       └── NFeTransmitter.ts
├── controllers/
│   └── TenantBillingController.ts
└── routes/
    └── tenant-billing.routes.ts
```

### Frontend (`src`)
```
src/
├── pages/
│   └── tenant/
│       └── Financial/
│           └── MyInvoices.tsx
└── services/
    └── tenant-billing.service.ts
```

## 4. Status de Implementação

### ✅ Concluído
1. ✅ Abstração de Gateway de Pagamento (`PaymentGateway`, `AsaasGateway`, `InfinityPayGateway`)
2. ✅ Service unificado de pagamentos (`PaymentService`)
3. ✅ Métodos de pagamento no `SuperAdminController`
4. ✅ Controller e rotas do Portal Financeiro do Tenant (`TenantBillingController`)
5. ✅ Endpoints REST para listagem de faturas e informações de pagamento
6. ✅ Cron de sincronização de cobranças inicializado (`initPaymentSyncJob()`)
7. ✅ Endpoints NF-e (fiscal): emitir, consultar status, cancelar; CC-e implementada
    - Normalização de códigos NF-e e persistência em `invoice.nfe` (accessKey, protocol, status, statusCode, statusMessage, lastUpdate).
8. ✅ Uploads isolados por tenant e estático `/static/docs`
9. ✅ Backup por tenant via API (pg_dump server-side), listagem e limpeza manual; job de limpeza automática diária conforme `BACKUP_RETENTION_DAYS`.

### 🔄 Próximos Passos
1. **Pagamentos:** Validar integração com Asaas/InfinityPay (sandbox/produção).
2. **Monitoramento:** Documentar `PAYMENT_SYNC_CRON_EXPRESSION`, acompanhar logs e taxa de erro; usar endpoints de status dos crons.
3. **Backups:** Avaliar storage seguro e replicação para arquivos `.zip`.

## 5. Como Validar (NF-e, Uploads e Backup)
**NF-e (Homologação):**
- Pré-requisito: Perfil Fiscal e certificado A1 (`POST /api/v1/fiscal/certificate`).
- Emitir: `POST /api/v1/fiscal/nfe/emit/:invoiceId`
- Consultar: `GET /api/v1/fiscal/nfe/status/:accessKey`
- Cancelar: `POST /api/v1/fiscal/nfe/cancel/:invoiceId` (body `{ justification, protocolNumber? }`)
- CC-e: `POST /api/v1/fiscal/nfe/cce/:invoiceId`
- Após qualquer operação, consultar `invoice.nfe` para confirmar `status` normalizado e `protocol`.

**Uploads (RDC 430):**
- Upload: `POST /api/v1/docs/upload` (form-data `file`)
- Listar: `GET /api/v1/docs/list`
- Download: `GET /static/docs/{tenantId}/{filename}`
- Remover: `DELETE /api/v1/docs/delete/:filename`

**Backup por Tenant:**
- Criar: `POST /api/v1/backup/db/:tenantId`
- Listar: `GET /api/v1/backup/list/:tenantId`
- Limpar (manual): `POST /api/v1/backup/cleanup/:tenantId?`
- Limpeza automática: habilitar `BACKUP_CLEANUP_JOB_ENABLED=true` e ajustar `BACKUP_CLEANUP_CRON_EXPRESSION` (padrão diário 03:00).

**Crons (Status):**
- Pagamentos: `GET /api/v1/system/cron/payments/status`
- Backups: `GET /api/v1/system/cron/backups/status`

## User Review Required
> [!IMPORTANT]
> A integração nativa com a SEFAZ (SOAP) é complexa e requer certificados válidos para testes. Confirmar se deseja prosseguir com a implementação "pura" ou se podemos usar uma API intermediária (ex: NFe.io, FocusNFe) para acelerar o desenvolvimento. A implementação pura não tem custo por nota, mas tem maior custo de desenvolvimento e manutenção.

> [!NOTE]
> Para o InfinityPay, precisaremos das credenciais de Sandbox ou Produção para validar a integração.

## 6. Configuração (ENV)
- `ALLOW_NFE_SIMULATION=true` (dev/homologação quando sem certificado)
- `SEFAZ_CERT_PATH`, `SEFAZ_CERT_PASSWORD` (produção)
- `BACKUP_RETENTION_DAYS=30`
- `BACKUP_CLEANUP_JOB_ENABLED=true`
- `BACKUP_CLEANUP_CRON_EXPRESSION="0 3 * * *"` (opcional)
- `PAYMENT_SYNC_JOB_ENABLED=true`
- `PAYMENT_SYNC_CRON_EXPRESSION="*/5 * * * *"` (opcional)
