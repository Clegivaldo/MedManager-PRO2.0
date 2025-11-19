# Implementação de Assinatura Digital XML A1 e Geração NFe 4.00

## Resumo da Implementação

Implementamos assinatura digital **real** de XML usando certificado A1 (PKCS#12) e geração estruturada de NF-e conforme layout 4.00 da Receita Federal.

## Arquivos Criados

### 1. `api/src/utils/xmlSigner.ts`
**Assinatura Digital XML com Certificado A1**

#### Funcionalidades:
- ✅ Carrega e valida certificados `.pfx` (PKCS#12)
- ✅ Extrai chave privada e certificado X.509
- ✅ Calcula digest SHA-1 do elemento `infNFe`
- ✅ Implementa canonicalização C14N
- ✅ Assina `SignedInfo` com RSA-SHA1
- ✅ Gera tag `<Signature>` completa conforme XML Signature
- ✅ Valida certificado (data de validade, integridade)
- ✅ Extrai CNPJ do certificado

#### Funções Principais:
```typescript
signXml(options: SignXmlOptions): SignatureResult
validateCertificate(pfxBuffer: Buffer, pfxPassword: string)
extractCnpjFromCertificate(pfxBuffer: Buffer, pfxPassword: string)
```

---

### 2. `api/src/utils/nfeXmlBuilder.ts`
**Geração de XML NFe 4.00 Estruturado**

#### Funcionalidades:
- ✅ Gera XML NFe versão 4.00 conforme Manual de Integração v7.0
- ✅ Suporte completo a campos obrigatórios e opcionais
- ✅ Geração de chave de acesso (44 dígitos + DV)
- ✅ Cálculo de dígito verificador (módulo 11)
- ✅ Escape de caracteres especiais XML
- ✅ Suporte a impostos (ICMS, PIS, COFINS)
- ✅ Estrutura detalhada para produtos/serviços
- ✅ Informações de emitente e destinatário
- ✅ Dados de pagamento e transporte

#### Interface Principal:
```typescript
interface NFeXmlData {
  ide: { /* Identificação da NF-e */ }
  emit: { /* Emitente */ }
  dest: { /* Destinatário */ }
  det: Array<{ /* Produtos */ }>
  total: { /* Totais */ }
  transp: { /* Transporte */ }
  pag: { /* Pagamento */ }
  infAdic?: { /* Info adicionais */ }
}
```

#### Funções Principais:
```typescript
buildNFeXml(data: NFeXmlData, accessKey: string): string
generateAccessKey(data: AccessKeyData): string
```

---

### 3. `api/src/services/nfe.service.ts` (Atualizado)
**Integração Completa do Fluxo de Emissão**

#### Mudanças Implementadas:

**Antes (Simulado):**
- XML gerado com template string simples
- Assinatura simulada com placeholder
- Chave de acesso calculada localmente

**Depois (Real):**
```typescript
// 1. Gera XML estruturado usando nfeXmlBuilder
const xml = buildNFeXml(xmlData, accessKey);

// 2. Assina digitalmente com certificado A1
const signedXml = await this.signXml(xml, fiscalProfile);
  - Lê certificado .pfx criptografado (AES-256-GCM)
  - Valida certificado (validade, integridade)
  - Assina XML com chave privada RSA
  - Insere tag <Signature> no XML

// 3. Envia para Sefaz (TODO: implementar SOAP real)
const sefazResponse = await this.sendToSefaz(signedXml, ...);
```

---

## Fluxo de Emissão de NF-e

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend: Usuário preenche modal de emissão             │
│    - Seleciona cliente                                      │
│    - Adiciona produtos, quantidades e preços                │
│    - Clica em "Emitir NFe"                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend: POST /api/v1/invoices (cria rascunho)          │
│    - Valida dados (cliente, produtos, estoque)             │
│    - Calcula totais e impostos                              │
│    - Cria invoice com status DRAFT                          │
│    - Retorna invoice ID                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend: POST /api/v1/invoices/:id/emit                 │
│    - Busca perfil fiscal do tenant                          │
│    - Incrementa série da NF-e                               │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ 3.1. Gera XML NFe 4.00                              │ │
│    │      - buildNFeXml() → XML estruturado              │ │
│    │      - generateAccessKey() → chave 44 dígitos       │ │
│    └─────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ 3.2. Assina digitalmente                            │ │
│    │      - Lê certificado .pfx criptografado            │ │
│    │      - Descriptografa com AES-256-GCM               │ │
│    │      - Valida certificado                           │ │
│    │      - signXml() → XML + <Signature>                │ │
│    └─────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ 3.3. Envia para Sefaz (TODO: SOAP real)            │ │
│    │      - Atualmente: Mock com 90% aprovação           │ │
│    │      - Futuro: WebService SOAP/REST real            │ │
│    └─────────────────────────────────────────────────────┘ │
│    - Atualiza invoice: status → AUTHORIZED                  │
│    - Armazena: accessKey, protocol, xmlContent              │
│    - Reduz estoque (FIFO)                                   │
│    - Registra movimentações e auditoria                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend: Atualiza lista de NF-es                        │
│    - Mostra nota com status "Autorizada"                    │
│    - Habilita botões: Download DANFE, Cancelar             │
└─────────────────────────────────────────────────────────────┘
```

---

## Segurança Implementada

### Certificado A1
- ✅ **Armazenamento:** Criptografado com AES-256-GCM
- ✅ **Chave:** `CERTIFICATE_ENCRYPTION_KEY` no ambiente (SHA-256)
- ✅ **Validação:** Verifica validade antes de usar
- ✅ **Isolamento:** Por tenant (cada empresa seu certificado)

### Assinatura Digital
- ✅ **Algoritmo:** RSA-SHA1 (padrão Receita Federal)
- ✅ **Canonicalização:** C14N (xml-c14n)
- ✅ **Digest:** SHA-1 do elemento `infNFe`
- ✅ **Padrão:** XML Signature (W3C)

---

## Próximos Passos (TODO)

### Alta Prioridade
1. **Integração Sefaz Real**
   - Implementar WebService SOAP conforme [Portal da NF-e](https://www.nfe.fazenda.gov.br/portal/webServices.aspx)
   - Ou integrar provider (NFe.io, TecnoSpeed, Bling)
   - Suporte a ambiente de homologação/produção
   - Tratamento de respostas: autorização, rejeição, contingência

2. **Seleção de Lote (Produtos Controlados)**
   - Adicionar campo de seleção de batch no modal
   - Obrigatório para medicamentos controlados (RDC 430)
   - Validar estoque por lote específico

3. **Página de Perfil Fiscal**
   - Upload de certificado A1 (.pfx)
   - Configuração de séries e numeração
   - CSC para QRCode (NFC-e)
   - Ambiente (homologação/produção)

### Média Prioridade
4. **Dashboard com Métricas Reais**
   - Endpoint: `GET /api/v1/dashboard/metrics`
   - Vendas do período, estoque crítico, alertas de compliance

5. **Download XML Autorizado**
   - Adicionar botão para baixar XML além do DANFE
   - Armazenar XML assinado no banco

6. **Cancelamento NFCe (Contingência)**
   - Suporte a emissão em contingência
   - Cancelamento extemporâneo

### Baixa Prioridade
7. **Testes E2E**
   - Fluxo completo: login → emitir NF-e → cancelar
   - Testes com certificado válido em homologação

8. **Consulta Status Sefaz**
   - Botão para consultar status atualizado na Sefaz
   - Sincronização automática periódica

---

## Como Testar Localmente

### Pré-requisitos
1. Certificado A1 válido (`.pfx`)
2. Perfil fiscal configurado no banco
3. Containers rodando

### Passos

#### 1. Configurar Perfil Fiscal
```sql
-- Inserir perfil fiscal para o tenant (ajuste os valores)
INSERT INTO tenant_fiscal_profiles (
  id, tenant_id, company_name, trading_name, cnpj,
  state_registration, certificate_type, certificate_path,
  certificate_password, sefaz_environment, is_active, created_at, updated_at
) VALUES (
  'uuid-aqui', 'tenant-uuid', 'Minha Empresa LTDA', 'Minha Empresa',
  '12345678000190', 'ISENTO', 'A1',
  '/app/certificates/tenant-uuid.pfx.enc',
  'senha-do-certificado', 'homologacao', true,
  NOW(), NOW()
);

-- Criar série fiscal
INSERT INTO fiscal_series (
  id, fiscal_profile_id, series_number, invoice_type,
  next_number, is_active, created_at, updated_at
) VALUES (
  'uuid-serie', 'uuid-perfil', 1, 'EXIT', 1, true, NOW(), NOW()
);
```

#### 2. Criptografar e Armazenar Certificado
```bash
# No container backend
docker exec -it backend sh

# Criptografar certificado
node -e "
const fs = require('fs');
const { encryptCertificate } = require('./dist/utils/certificate.js');
const pfx = fs.readFileSync('/caminho/certificado.pfx');
const encrypted = encryptCertificate(pfx);
fs.writeFileSync('/app/certificates/tenant-uuid.pfx.enc', encrypted, 'utf-8');
console.log('Certificado criptografado salvo');
"
```

#### 3. Testar Emissão
1. Acesse `http://localhost:5173`
2. Faça login
3. Vá para **NF-e**
4. Clique em **Emitir NFe Avulsa**
5. Selecione cliente e produtos
6. Informe preços e quantidades
7. Clique em **Emitir NFe**

#### 4. Verificar Logs
```bash
# Logs do backend
docker logs -f backend --tail 50

# Buscar por:
# - "Starting NFe emission"
# - "Signing NFe XML"
# - "Certificate validated"
# - "XML signed successfully"
# - "NFe emission completed"
```

---

## Estrutura de Arquivos

```
api/src/
├── services/
│   └── nfe.service.ts           # Serviço principal de emissão
├── utils/
│   ├── xmlSigner.ts             # ✨ NOVO: Assinatura digital A1
│   ├── nfeXmlBuilder.ts         # ✨ NOVO: Geração XML NFe 4.00
│   └── certificate.ts           # Criptografia AES-256-GCM
├── routes/
│   └── invoice.routes.ts        # Endpoints de emissão/cancelamento
└── middleware/
    └── permissions.ts           # Controle RBAC

src/
├── services/
│   └── invoice.service.ts       # ✨ NOVO: Cliente HTTP para invoices
├── pages/tenant/
│   └── NFe.tsx                  # ✨ ATUALIZADO: Lista real de NF-es
└── components/tenant/modals/
    ├── NewNFeModal.tsx          # ✨ ATUALIZADO: Modal de emissão
    └── CancelNFeModal.tsx       # ✨ ATUALIZADO: Modal de cancelamento
```

---

## Referências

- [Manual de Integração - Contribuinte NFe v7.0](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fJKFrBj8Y=)
- [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/)
- [XML Signature - W3C](https://www.w3.org/TR/xmldsig-core/)
- [node-forge - Biblioteca Crypto](https://github.com/digitalbazaar/forge)
- [RDC 430/2020 ANVISA - Farmacovigilância](https://www.in.gov.br/web/dou/-/resolucao-rdc-n-430-de-8-de-outubro-de-2020-282070593)

---

## Notas Importantes

⚠️ **Homologação vs Produção:**
- Atualmente configurado para **homologação** (`tpAmb=2`)
- Alterar no perfil fiscal: `sefazEnvironment = 'producao'`
- **NUNCA** emitir em produção sem testes completos

⚠️ **Certificado A1:**
- Validade máxima: 1 ano
- Renovação obrigatória antes do vencimento
- Sistema valida certificado antes de cada emissão

⚠️ **Integração Sefaz:**
- Atualmente mock com 90% de aprovação
- Para produção, **OBRIGATÓRIO** implementar SOAP/REST real
- Considerar usar provider terceirizado (NFe.io, TecnoSpeed)

---

## Autores

- **Backend:** NFeService + xmlSigner + nfeXmlBuilder
- **Frontend:** NFe.tsx + NewNFeModal + invoiceService
- **Segurança:** AES-256-GCM + RSA-SHA1 + RBAC

**Status:** ✅ Assinatura XML A1 implementada | ⏳ Integração Sefaz pendente
