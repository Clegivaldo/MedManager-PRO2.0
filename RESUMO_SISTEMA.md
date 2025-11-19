# Sistema MedManager-PRO 2.0 - Resumo Completo

## Visão Geral
Sistema multi-tenant para gestão de distribuidoras de medicamentos com conformidade regulatória RDC 430 e emissão de NF-e integrada.

## Arquitetura

### Backend (Node.js + TypeScript)
- **Framework**: Express 4.x
- **ORM**: Prisma 5.22 (PostgreSQL)
- **Autenticação**: JWT + bcrypt
- **Validação**: Zod
- **Logs**: Winston
- **Upload**: Multer
- **Certificados**: node-forge

### Frontend (React)
- **Build**: Vite 5
- **UI**: shadcn/ui + Tailwind CSS
- **Estado**: React 19

### Infraestrutura
- **Docker Compose**: API, Web, Postgres 15, Redis 7
- **Migrations**: Prisma Migrate
- **Health checks**: Container-level monitoring
- **Backup**: Script automatizado (backup.sh)

## Funcionalidades Implementadas

### 1. Multi-Tenancy
- Tenant Master com CNPJ único
- Middleware de tenant por header `x-tenant-cnpj`
- Isolamento de dados por tenant

### 2. RBAC (Role-Based Access Control)
- **Roles**: SUPERADMIN, ADMIN, MANAGER, USER, VIEWER
- **Permissões granulares**: 20+ permissions (INVOICE_READ, NFE_ISSUE, SYSTEM_CONFIG, etc.)
- Middleware `requirePermissions` em todas as rotas protegidas
- SUPERADMIN com bypass automático

### 3. Gestão de Produtos
- Cadastro completo (NCM, CEST, CFOP, ANS)
- Controle de substâncias controladas
- Temperatura controlada com range
- Prescrição obrigatória
- Lotes com data de fabricação e validade
- Estoque com movimentações (ENTRY, EXIT, ADJUSTMENT, TRANSFER, DEVOLUTION)

### 4. Clientes e Fornecedores
- CNPJ/CPF com validação
- Endereço completo
- Tipo de cliente (DISTRIBUTOR, PHARMACY, HOSPITAL, CLINIC, OTHER)
- Histórico de movimentações

### 5. Faturamento e NF-e

#### Perfil Fiscal (TenantFiscalProfile)
- ✅ CNPJ, IE, IM
- ✅ Endereço completo
- ✅ Regime tributário (Simples Nacional, Lucro Real, Presumido)
- ✅ CSC (ID e token) para NFC-e
- ✅ Certificado digital A1/A3
  - Tipo, path, senha, data de expiração
  - Upload via multer
  - Extração de informações (CN, emissor, validade)
  - Validação automática (bloqueia < 7 dias, alerta < 30 dias)
  - Armazenamento criptografado (Base64 - produção requer AES-256/KMS)
- ✅ Ambiente Sefaz (homologação/produção)

#### Séries Fiscais (FiscalSeries)
- ✅ Múltiplas séries por tenant
- ✅ Tipos: ENTRY, EXIT, DEVOLUTION
- ✅ Auto-incremento de numeração
- ✅ Status ativo/inativo
- ✅ Constraint única (fiscalProfileId, seriesNumber, invoiceType)

#### NFeService
- ✅ Integração com perfil fiscal
- ✅ Busca série ativa automaticamente
- ✅ Incrementa nextNumber
- ✅ Gera chave de acesso válida (44 dígitos + DV)
- ✅ XML com dados reais do perfil
- ✅ Regime tributário correto (CRT)
- ✅ Preparação para assinatura A1/A3
- ✅ CSC para QRCode
- ⏳ Assinatura digital real (mock)
- ⏳ Envio para Sefaz (mock)

### 6. Conformidade Regulatória
- RDC 430/2020: Rastreabilidade de medicamentos
- RDC 301/2019: Boas Práticas de Distribuição
- Alertas de validade
- Controle de temperatura
- Histórico de movimentações auditável

## Rotas REST API

### Auth (`/api/v1/auth`)
- `POST /login` - Login com email/senha
- `POST /refresh` - Refresh token
- `POST /logout` - Logout

### Fiscal (`/api/v1/fiscal`)
- `GET /` - Consultar perfil fiscal (SYSTEM_CONFIG)
- `POST /` - Criar/atualizar perfil fiscal (SYSTEM_CONFIG)
- `POST /series` - Criar/atualizar série fiscal (SYSTEM_CONFIG)
- `PUT /series/:id` - Atualizar série (nextNumber, isActive) (SYSTEM_CONFIG)
- `POST /certificate` - Upload certificado digital A1 (SYSTEM_CONFIG)
- `GET /certificate` - Consultar status do certificado (SYSTEM_CONFIG)

### Invoices (`/api/v1/invoices`)
- `GET /` - Listar invoices (INVOICE_READ)
- `POST /` - Criar invoice (DRAFT) (INVOICE_CREATE)
- `GET /:id` - Buscar invoice por ID (INVOICE_READ)
- `PUT /:id` - Atualizar invoice (INVOICE_UPDATE)
- `POST /:id/emit` - Emitir NF-e (usa perfil fiscal) (NFE_ISSUE)
- `POST /:id/cancel` - Cancelar NF-e (NFE_CANCEL)
- `GET /:id/danfe` - Gerar DANFE PDF (NFE_VIEW_DANFE)

### Customers, Products, Inventory, Users, Suppliers
- CRUD completo com RBAC

### Superadmin (`/api/v1/superadmin`)
- Gestão de tenants (SUPERADMIN_FULL)

## Banco de Dados

### Principais Tabelas
- `tenants`: Master de tenants
- `users`: Usuários com roles
- `tenant_fiscal_profiles`: Perfil fiscal por tenant (1:1)
- `fiscal_series`: Séries fiscais por perfil (1:N)
- `customers`, `suppliers`: Clientes e fornecedores
- `products`: Produtos com dados regulatórios
- `batches`: Lotes com validade
- `stock_movements`: Movimentações de estoque
- `invoices`: Notas fiscais
- `invoice_items`: Itens das notas

### Migrations
- `20251113222204_init`: Schema inicial
- `20251119002000_add_fiscal_profile`: Perfil fiscal e séries

## Testes E2E (Vitest + node-fetch)

✅ **Todos os testes passando**

### `test/invoice.e2e.test.ts`
- Login master admin
- Criar invoice (DRAFT)
- Emitir NF-e (AUTHORIZED)
- Valida chave de acesso e protocolo

### `test/fiscal.e2e.test.ts`
- Criar perfil fiscal completo
- Criar série fiscal tipo EXIT
- Upsert sem duplicação

### `test/certificate.e2e.test.ts`
- Upload de certificado .pfx
- Validação de formato e senha
- Consulta de status (valid/expiring_soon/expired)
- Rejeição de certificado inválido

## Scripts Utilitários

### `package.json` (api/)
- `seed` / `seed:dev`: Popular banco com dados básicos
- `tenant:lite` / `tenant:lite:dev`: Criar tenant de teste
- `test`: Rodar testes E2E
- `test:coverage`: Testes com cobertura

### Docker
- `docker compose up -d --build`: Subir stack completa
- `docker logs medmanager-api --tail 50`: Ver logs da API
- `docker exec -it medmanager-postgres psql -U postgres -d medmanager_master`: Acessar banco

## Segurança

### Implementado
- ✅ JWT com refresh token
- ✅ bcrypt para senhas (10 rounds)
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configurado
- ✅ RBAC granular
- ✅ Validação Zod em todas as rotas
- ✅ Tenant isolation

### Produção (Pendente)
- [ ] Certificado criptografado com AES-256 ou AWS KMS
- [ ] Secrets no AWS Secrets Manager / HashiCorp Vault
- [ ] HTTPS obrigatório
- [ ] Audit logs imutáveis
- [ ] 2FA para SUPERADMIN
- [ ] IP whitelist para endpoints críticos

## Logs e Monitoramento

### Winston Logger
- Níveis: error, warn, info, debug
- Formato: JSON estruturado
- Contexto: tenantId, userId, invoiceId, etc.
- Exemplos:
  ```
  [info]: Fiscal profile upserted for tenant 9621a99a...
  [info]: NFe emission completed {accessKey, protocol, status}
  [warn]: Certificate expiring soon {daysUntilExpiry: 25}
  [error]: NFe emission failed {invoiceNumber, error}
  ```

## Conformidade Fiscal

### RDC 430 (Medicamentos)
- ✅ Rastreabilidade por lote
- ✅ NCM obrigatório
- ✅ Substâncias controladas identificadas
- ✅ Temperatura controlada com range
- ✅ Prescrição obrigatória
- ✅ Data de validade
- ✅ Histórico de movimentações

### NF-e
- ✅ Chave de acesso válida (44 dígitos + DV)
- ✅ XML conforme layout 4.0
- ✅ Regime tributário (CRT) correto
- ✅ CSC para QRCode (NFC-e)
- ✅ Certificado A1/A3 (estrutura pronta)
- ⏳ Assinatura digital real
- ⏳ Envio para Sefaz homologado

## Próximos Passos

### Prioritário (Produção)
1. Implementar assinatura digital real com node-forge (A1) ou PKCS#11 (A3)
2. Integrar com provider homologado (NFe.io, TecnoSpeed, ou Sefaz direto)
3. Testar em ambiente de homologação Sefaz
4. Implementar criptografia AES-256 para certificados
5. Tratamento de eventos NF-e (ciência, confirmação, cancelamento)

### Melhorias
- Cobertura de testes > 80%
- Dashboard de métricas (Grafana + Prometheus)
- CI/CD com GitHub Actions
- Backup automatizado S3
- Notificações (email/SMS) para certificado expirando
- Relatórios fiscais (SPED, SINTEGRA)

### Documentação
- API Reference (Swagger/OpenAPI)
- Guia de integração para frontends
- Manual de operação
- Runbook para troubleshooting

## Performance

### Otimizações Implementadas
- ✅ Indexes no banco (cnpj, tenantId, fiscalProfileId)
- ✅ Prisma connection pooling
- ✅ Rate limiting
- ✅ Docker multi-stage build
- ✅ Caching Redis (estrutura pronta)

### Benchmarks (Load Testing Pendente)
- Target: 100 req/s por container
- Latência: p95 < 500ms
- Emissão NF-e: < 3s

## Equipe e Suporte

**Desenvolvido para**: Distribuidoras de medicamentos com foco em conformidade fiscal e regulatória

**Tecnologias**: Node.js, TypeScript, React, Prisma, PostgreSQL, Docker

**Status**: ✅ Pronto para homologação com Sefaz

**Última atualização**: 2025-11-18
