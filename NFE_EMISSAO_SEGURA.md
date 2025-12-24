# 🔐 Emissão de NF-e com Segurança - MedManager PRO 2.0

## Visão Geral
Este documento descreve o fluxo seguro de emissão de NF-e e NFCe no sistema MedManager PRO 2.0.

## 🔐 Proteção de Segurança Implementada

### 1. Certificado Digital (.pfx)
- **Armazenamento**: Arquivo criptografado com AES-256-GCM
- **Localização**: Servidor da tenant (caminho configurável)
- **Chave de Criptografia**: `CERTIFICATE_ENCRYPTION_KEY` (.env)
- **Descriptografia**: Automática no momento da assinatura

### 2. Senha do Certificado
- **Armazenamento Anterior**: Texto simples no banco de dados ❌
- **Armazenamento Novo**: AES-256-GCM criptografado ✅
- **Formato**: `v1:iv:tag:data` (base64)
- **Chave de Criptografia**: `ENCRYPTION_KEY` (.env)
- **Descriptografia**: Automática em `signXml()` e `sendToSefaz()`

### 3. Compatibilidade com Senhas Existentes
- Sistema detecta senhas já criptografadas (presença de `:`)
- Senhas em texto simples ainda funcionam com fallback
- Migração gradual permite transição sem downtime

## 📋 Fluxo de Emissão (NF-e)

### 1. Validação Inicial
```
invoiceRoutes.post('/:id/emit') 
  ↓
Verifica tenant e permissões
  ↓
Busca invoice no banco
  ↓
Valida dados obrigatórios
```

### 2. Busca do Perfil Fiscal
```
nfeService.emitNFe()
  ↓
Busca tenantFiscalProfile
  ↓
Valida certificado digital
  ↓
Valida CSC (Código de Segurança do Contribuinte)
```

### 3. Geração do XML NF-e 4.00
```
nfeService.generateNFeXml()
  ↓
Monta estrutura XML conforme NFe 4.00
  ↓
Calcula totais e impostos
  ↓
Valida contra XSD schema
```

### 4. Assinatura Digital
```
nfeService.signXml()
  ↓
Lê arquivo .pfx criptografado
  ↓
DESCRIPTOGRAFA SENHA DO CERTIFICADO
  ↓
Carrega certificado com senha descriptografada
  ↓
Valida certificado (validade, compatibilidade)
  ↓
Assina XML com RSA-SHA1
  ↓
Adiciona signature ao XML
```

### 5. Envio para Sefaz
```
nfeService.sendToSefaz()
  ↓
DESCRIPTOGRAFA SENHA DO CERTIFICADO (novamente)
  ↓
Configura SefazService com credenciais
  ↓
Conecta ao Sefaz (homologação/produção)
  ↓
Envia XML assinado
  ↓
Recebe protocolo ou erro
```

### 6. Armazenamento de Resultado
```
Atualiza invoice com:
- NFe number
- Access key
- Authorization protocol
- DANFE URL
- Status (autorizado/rejeitado)
```

## 🔧 Pré-requisitos para Emissão

### Variáveis de Ambiente Obrigatórias
```bash
# Chave de criptografia para senhas
ENCRYPTION_KEY=sua-chave-256-bits-base64

# Chave de criptografia para certificados
CERTIFICATE_ENCRYPTION_KEY=sua-chave-256-bits-base64

# Chave de criptografia para dados sensíveis
DATA_ENCRYPTION_KEY=sua-chave-256-bits-base64
```

### Configuração no Banco de Dados
Cada tenant necessita de um `tenantFiscalProfile` com:
```json
{
  "cnpj": "00.000.000/0000-00",
  "registrationNumber": "123456789.12.34",
  "certificatePath": "/certs/empresa.pfx",
  "certificatePassword": "v1:iv:tag:data (criptografado)",
  "sefazEnvironment": "homologacao",
  "cscId": "123456",
  "cscValue": "abc123def456"
}
```

## 🚀 Passo a Passo: Testar Emissão de NF-e

### 1. Criptografar Senhas Existentes
```bash
# Executar script de migração
cd api
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts
```

**Saída esperada:**
```
🔒 Iniciando criptografia de senhas de certificados...

📋 Encontradas 1 senhas para criptografar:

✅ CRIPTOGRAFADA: MedManager LTDA (abc123...)

📊 Resumo:
   - Total processados: 1
   - Criptografadas: 1
   - Puladas (já criptografadas): 0
```

### 2. Criar Invoice de Teste
```bash
POST /api/v1/invoices
Content-Type: application/json

{
  "invoiceNumber": "100001",
  "invoiceSeries": "1",
  "issueDate": "2024-01-15",
  "customer": {
    "name": "Cliente Teste",
    "cpfCnpj": "12345678901234",
    "email": "cliente@test.com"
  },
  "items": [
    {
      "description": "Produto Teste",
      "quantity": 1,
      "unitValue": 100.00
    }
  ],
  "total": 100.00
}
```

### 3. Emitir NF-e
```bash
POST /api/v1/invoices/{invoiceId}/emit
Content-Type: application/json
Authorization: Bearer {token}

{}
```

**Resposta esperada (homologação):**
```json
{
  "success": true,
  "nfeNumber": "100001",
  "accessKey": "35240111234567000161550010000100001000100001",
  "protocol": "135240101234567",
  "danfeUrl": "https://...",
  "authorizedAt": "2024-01-15T10:30:00Z",
  "status": "authorized"
}
```

### 4. Verificar Resultado
```bash
GET /api/v1/invoices/{invoiceId}
Authorization: Bearer {token}
```

## 🚨 Tratamento de Erros

### Erro: "Certificate not found"
- **Causa**: Arquivo .pfx não existe no caminho configurado
- **Solução**: Verificar `certificatePath` em `tenantFiscalProfile`

### Erro: "Failed to decrypt certificate password"
- **Causa**: ENCRYPTION_KEY inválida ou corrompida
- **Solução**: Verificar se `ENCRYPTION_KEY` está correta no .env

### Erro: "Certificate invalid or expired"
- **Causa**: Certificado expirado ou incompatível
- **Solução**: Renovar certificado junto à AC

### Erro: "CNPJ not found in Sefaz"
- **Causa**: CNPJ não cadastrado na Sefaz para NFe
- **Solução**: Autorizar NFe junto à Sefaz (depende de estado)

## 📊 Estrutura XML NF-e 4.00

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35240111234567000161550010000100001000100001">
    <ide>
      <cUF>35</cUF>
      <CNPJ>11234567000161</CNPJ>
      <assinaturas>...</assinaturas>
    </ide>
    <emit>
      <CNPJ>11234567000161</CNPJ>
      <xNome>Empresa XYZ</xNome>
      <enderEmit>...</enderEmit>
    </emit>
    <dest>...</dest>
    <det>...</det>
    <total>...</total>
    <transp>...</transp>
  </infNFe>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <!-- Assinatura digital RSA-SHA1 -->
  </Signature>
</NFe>
```

## 🔒 Segurança em Produção

### ❌ NUNCA em Produção
- Modo desenvolvimento ativa mocks da Sefaz
- Teste sempre em **homologação** antes
- Não use certificados de produção em desenvolvimento

### ✅ Obrigatório em Produção
- Certificado digital A1 válido
- CSC registrado na Sefaz
- Chaves de criptografia em gerenciador de secrets (ex: Vault)
- Backup de certificados em local seguro
- Logs de auditoria de todas as emissões

## 📚 Referências

- [NF-e Portal da Sefaz](https://www.nfe.fazenda.gov.br/)
- [Manual de NF-e 4.00](https://www.nfe.fazenda.gov.br/portal/informe.aspx)
- [Documentação do Sefaz SP](https://www.nfe.sp.gov.br/)

## 🆘 Suporte

Para questões sobre emissão de NF-e:
1. Verificar logs em `/logs/nfe/`
2. Validar certificado: `openssl pkcs12 -info -in arquivo.pfx`
3. Testar Sefaz em homologação primeiro

---

**Última atualização**: 2024
**Status de Segurança**: ✅ Certificados e senhas criptografados
