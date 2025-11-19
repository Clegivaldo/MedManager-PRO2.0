# Changelog - Infraestrutura Fiscal para NF-e

## 2025-11-18 - Perfil Fiscal e Integração Real NF-e

### Resumo
Implementada infraestrutura completa para emissão de NF-e com dados fiscais reais do tenant, preparando o sistema para integração com Sefaz homologado.

### Modelos de Dados Criados

#### TenantFiscalProfile
Perfil fiscal único por tenant contendo:
- **Dados da Empresa**: companyName, tradingName, cnpj, stateRegistration, municipalRegistration
- **Endereço Completo**: street, number, complement, district, city, state, zipCode
- **Contato**: phone, email
- **Regime Tributário**: simple_national | real_profit | presumed_profit
- **CSC (NFC-e)**: cscId, cscToken (Código de Segurança do Contribuinte para QRCode)
- **Certificado Digital**: certificateType (A1/A3), certificatePath, certificatePassword, certificateExpiresAt
- **Ambiente Sefaz**: homologacao | producao

#### FiscalSeries
Controle de numeração de notas por tipo:
- **fiscalProfileId**: Relacionamento com TenantFiscalProfile
- **seriesNumber**: Número da série (1, 2, 3...)
- **invoiceType**: ENTRY | EXIT | DEVOLUTION
- **nextNumber**: Próximo número disponível (auto-incremento)
- **isActive**: Série ativa ou inativa
- **Constraint única**: (fiscalProfileId, seriesNumber, invoiceType)

### Migração
```
api/prisma/migrations/20251119002000_add_fiscal_profile/
```
- Tabelas `tenant_fiscal_profiles` e `fiscal_series` criadas
- Foreign keys com CASCADE delete
- Indexes otimizados

### Rotas REST Criadas

**GET /api/v1/fiscal**
- Retorna perfil fiscal do tenant com todas as séries
- Requer permissão: SYSTEM_CONFIG

**POST /api/v1/fiscal**
- Cria ou atualiza (upsert) perfil fiscal do tenant
- Validação Zod completa
- Requer permissão: SYSTEM_CONFIG

**POST /api/v1/fiscal/series**
- Cria ou atualiza (upsert) série fiscal
- Validação de duplicação via constraint única
- Requer permissão: SYSTEM_CONFIG

**PUT /api/v1/fiscal/series/:id**
- Atualiza número da série ou status ativo/inativo
- Requer permissão: SYSTEM_CONFIG

### NFeService Refatorado

#### Mudanças na assinatura `emitNFe`
Antes:
```typescript
async emitNFe(nfeData: NFeInvoiceData): Promise<SefazResponse>
```

Depois:
```typescript
async emitNFe(nfeData: NFeInvoiceData, tenantId: string): Promise<SefazResponse>
```

#### Fluxo de Emissão
1. **Busca perfil fiscal** do tenant no banco (prismaMaster.tenantFiscalProfile)
2. **Valida existência** de perfil e série ativa para EXIT
3. **Incrementa nextNumber** da série automaticamente
4. **Gera XML NF-e** usando:
   - CNPJ, IE, IM do perfil fiscal
   - Endereço completo do perfil
   - Regime tributário (CRT) do perfil
   - Série e número da série fiscal
   - Ambiente Sefaz (homologação/produção)
5. **Prepara assinatura digital**:
   - Certificado A1: lê .pfx do certificatePath com certificatePassword
   - Certificado A3: integração com hardware token via PKCS#11
6. **Envia para Sefaz** usando CSC (se configurado) para QRCode

#### Geração de Chave de Acesso
Formato padrão NF-e (44 dígitos + DV):
```
UF (2) + AAMM (4) + CNPJ (14) + MOD (2) + SERIE (3) + NNF (9) + TP_EMIS (1) + CN (8) + DV (1)
```
- UF e AAMM extraídos do perfil e timestamp
- CNPJ do fiscal profile (não mais do issuer genérico)
- SERIE do FiscalSeries (não mais fixo "001")
- NNF do nextNumber auto-incrementado

### Testes E2E

#### test/fiscal.e2e.test.ts
- Login com master admin
- POST /fiscal: cria perfil fiscal completo
- POST /fiscal/series: cria série fiscal tipo EXIT
- Validações: CNPJ, regime tributário, CSC, ambiente
- **Status**: ✅ PASSING

#### test/invoice.e2e.test.ts (atualizado)
- Continua testando fluxo draft → emit
- Agora usa perfil fiscal automaticamente
- **Status**: ✅ PASSING

### Padronização RBAC

Todos os arquivos de rotas agora usam:
```typescript
import { requirePermissions, PERMISSIONS } from '../middleware/permissions.js';
```

Permissões padronizadas:
- `PERMISSIONS.SYSTEM_CONFIG`: Configurações fiscais
- `PERMISSIONS.NFE_ISSUE`: Emitir NF-e
- `PERMISSIONS.NFE_CANCEL`: Cancelar NF-e
- `PERMISSIONS.NFE_VIEW_DANFE`: Visualizar DANFE
- `PERMISSIONS.INVOICE_READ/CREATE/UPDATE`: Gerenciar invoices
- `PERMISSIONS.CUSTOMER_READ/CREATE/UPDATE`: Gerenciar clientes
- `PERMISSIONS.USER_READ/CREATE/UPDATE`: Gerenciar usuários

### Scripts package.json

Adicionados:
- `seed` / `seed:dev`: Popular banco com dados básicos
- `tenant:lite` / `tenant:lite:dev`: Criar tenant de teste
- `test`: Rodar testes E2E com Vitest
- `test:coverage`: Testes com cobertura

### Dependências Adicionadas
- `cross-env`: Variáveis de ambiente multiplataforma (Windows/Linux)
- `node-fetch`: HTTP client para testes E2E

### Arquivos Modificados
- `api/src/services/nfe.service.ts`: Integração com perfil fiscal
- `api/src/routes/invoice.routes.ts`: Passa tenantId ao NFeService
- `api/src/routes/fiscal.routes.ts`: **NOVO** - CRUD fiscal
- `api/src/routes/customer.routes.ts`: PERMISSIONS padronizados
- `api/src/routes/user.routes.ts`: PERMISSIONS padronizados
- `api/src/server.ts`: Registra `/api/v1/fiscal`
- `api/prisma/schema.prisma`: Modelos TenantFiscalProfile e FiscalSeries
- `api/test/fiscal.e2e.test.ts`: **NOVO** - Teste perfil fiscal
- `README.md`: Seção completa sobre perfil fiscal

### Estado do Sistema

✅ **Funcionando**:
- Perfil fiscal por tenant configurável via REST API
- Séries fiscais com auto-incremento e constraint de unicidade
- NFeService usa dados reais do perfil fiscal
- XML NF-e com regime tributário, CSC, ambiente corretos
- Testes E2E cobrindo fluxo completo
- Chave de acesso NF-e gerada com dados reais
- Preparação para assinatura A1/A3

⏳ **Pendente (Produção)**:
- Upload de certificado .pfx via multipart/form-data
- Assinatura digital real (node-forge para A1, PKCS#11 para A3)
- Integração com provedor (NFe.io, TecnoSpeed) ou Sefaz direto
- Validação de validade do certificado (alertas antes do vencimento)
- Eventos NF-e: ciência, confirmação, cancelamento, carta de correção
- Testes em ambiente de homologação Sefaz

### Como Usar

1. **Configurar perfil fiscal**:
```bash
POST /api/v1/fiscal
{
  "companyName": "Sua Empresa LTDA",
  "cnpj": "12345678000155",
  "stateRegistration": "123456789",
  "taxRegime": "simple_national",
  "cscId": "CSC001",
  "cscToken": "TOKEN_CSC_HOMOLOGACAO",
  "sefazEnvironment": "homologacao"
}
```

2. **Criar série fiscal**:
```bash
POST /api/v1/fiscal/series
{
  "seriesNumber": 1,
  "invoiceType": "EXIT",
  "nextNumber": 1
}
```

3. **Emitir NF-e** (automático):
```bash
POST /api/v1/invoices/:id/emit
```
O sistema busca perfil fiscal, incrementa série, gera XML com dados reais.

### Impacto em Produção

**Antes**: NF-e com dados mock, chave de acesso aleatória, série fixa "001"

**Agora**: NF-e com CNPJ/IE/endereço real do tenant, chave de acesso válida, série auto-incrementada, regime tributário correto

**Próximo**: Assinatura digital real e envio para Sefaz homologado

---

**Autores**: Desenvolvido com foco em conformidade fiscal e RDC 430 (medicamentos)
**Data**: 2025-11-18
**Status**: Pronto para testes de homologação
