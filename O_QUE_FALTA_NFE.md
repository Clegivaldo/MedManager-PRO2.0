# 🎯 O QUE FALTA PARA NFe RODAR 100%

## Status Atual: 80% Completo ✅

---

## ✅ JÁ IMPLEMENTADO (80%)

- ✅ Código de segurança (descriptografia automática)
- ✅ Scripts de teste e migração
- ✅ Documentação completa
- ✅ Validações de dados
- ✅ Estrutura XML NFe 4.00
- ✅ Assinatura digital
- ✅ Endpoints da Sefaz configurados

---

## ⚠️ FALTAM 5 PASSOS CRÍTICOS (20%)

### 1️⃣ Configurar CERTIFICATE_ENCRYPTION_KEY no .env

**Status**: ❌ NÃO CONFIGURADA

**Como fazer**:
```bash
# Gerar chave (copie o resultado)
node -p "require('crypto').randomBytes(32).toString('hex')"

# Adicionar ao .env
echo "CERTIFICATE_ENCRYPTION_KEY=<chave-gerada>" >> .env
```

**Resultado esperado**: Chave de 64 caracteres hex no .env

---

### 2️⃣ Executar Script de Criptografia

**Status**: ❌ NÃO EXECUTADO

**Como fazer**:
```bash
cd api
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts
```

**O que faz**: Converte senhas de plaintext para AES-256-GCM

**Resultado esperado**:
```
✅ CRIPTOGRAFADA: [Nome da Empresa]
📊 Resumo: Total 1, Criptografadas 1
```

---

### 3️⃣ Configurar Dados Fiscais no Banco

**Status**: ⚠️ PRECISA VALIDAR

**Verificar se existe**:
```sql
SELECT 
  id,
  cnpj,
  registrationNumber,
  certificatePath,
  certificatePassword,
  sefazEnvironment,
  cscId,
  cscValue
FROM tenant_fiscal_profile
WHERE tenantId = 'e9675bde-126b-429a-a150-533e055e7cc0';
```

**O que precisa ter**:
- ✅ CNPJ válido (formato XX.XXX.XXX/XXXX-XX)
- ✅ IE válida (registrationNumber)
- ✅ Caminho do certificado (certificatePath)
- ✅ Senha do certificado (certificatePassword) - será criptografada no passo 2
- ✅ Ambiente: 'homologacao'
- ⚠️ CSC (opcional para NFe, obrigatório para NFCe)

**Se não existir, criar**:
```sql
INSERT INTO tenant_fiscal_profile (
  tenantId,
  cnpj,
  registrationNumber,
  companyName,
  certificatePath,
  certificatePassword,
  sefazEnvironment,
  cscId,
  cscValue
) VALUES (
  'e9675bde-126b-429a-a150-533e055e7cc0',
  '00.000.000/0000-00',  -- SEU CNPJ
  '123456789.12.34',      -- SUA IE
  'Sua Empresa LTDA',
  '/path/to/certificate.pfx',  -- Caminho real
  'senha-do-certificado',      -- Será criptografada
  'homologacao',
  '123456',               -- CSC ID (obter na Sefaz)
  'abc123def456'          -- CSC Value (obter na Sefaz)
);
```

---

### 4️⃣ Certificado Digital A1 Válido

**Status**: ⚠️ PRECISA VALIDAR

**O que precisa**:
- Certificado digital A1 (.pfx ou .p12)
- Não pode estar expirado
- Deve estar no caminho especificado em `certificatePath`
- Senha correta configurada

**Como validar**:
```bash
# Verificar validade (Windows - precisa openssl instalado)
openssl pkcs12 -info -in /path/to/certificate.pfx -noout

# Ou verificar se arquivo existe
ls -la /path/to/certificate.pfx
```

**Como obter certificado**:
1. Adquirir de uma AC (Certisign, Serasa, etc)
2. Tipo: A1 (arquivo .pfx)
3. Uso: Assinatura de documentos fiscais
4. Validade: Geralmente 1 ano

---

### 5️⃣ Testar Emissão em Homologação

**Status**: ❌ NÃO TESTADO

**Como fazer**:
```bash
cd api
export TEST_TENANT_ID=e9675bde-126b-429a-a150-533e055e7cc0
pnpm ts-node src/scripts/test-nfe-emission.ts
```

**Resultado esperado**:
```
✅ Tenant encontrado
✅ Perfil fiscal encontrado
✅ Confirmado: Emissão em HOMOLOGAÇÃO
✅ NF-e EMITIDA COM SUCESSO!
📊 Resultado:
   Número NF-e: 100001
   Chave acesso: 35240111234567000161550010000100001000100001
   Protocolo: 135240101234567
   Status: authorized
```

**Se falhar, verificar**:
- ENCRYPTION_KEY configurada?
- CERTIFICATE_ENCRYPTION_KEY configurada?
- Certificado existe no caminho?
- Senha foi criptografada?
- Dados fiscais estão corretos?

---

## 📋 CHECKLIST DE EXECUÇÃO

Execute nesta ordem:

```bash
# 1. Configurar CERTIFICATE_ENCRYPTION_KEY
node -p "require('crypto').randomBytes(32).toString('hex')"
# Copie resultado e adicione ao .env:
# CERTIFICATE_ENCRYPTION_KEY=<resultado>

# 2. Criptografar senhas existentes
cd api
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts

# 3. Verificar dados fiscais no banco
# Use Prisma Studio ou SQL direto

# 4. Validar certificado digital
# Verificar se arquivo existe e está válido

# 5. Testar emissão
export TEST_TENANT_ID=e9675bde-126b-429a-a150-533e055e7cc0
pnpm ts-node src/scripts/test-nfe-emission.ts
```

---

## ⚠️ BLOQUEIOS CONHECIDOS

### Se der erro: "ENCRYPTION_KEY not found"
**Solução**: Adicionar ao .env

### Se der erro: "CERTIFICATE_ENCRYPTION_KEY not found"
**Solução**: Adicionar ao .env (passo 1)

### Se der erro: "Certificate not found"
**Solução**: Verificar `certificatePath` no banco

### Se der erro: "Failed to decrypt password"
**Solução**: Executar passo 2 (encrypt-certificate-passwords.ts)

### Se der erro: "Certificate expired"
**Solução**: Renovar certificado com AC

### Se der erro: "CNPJ not found at Sefaz"
**Solução**: Autorizar NFe junto à Sefaz do estado

---

## 🎯 FEATURES OPCIONAIS (Não bloqueiam emissão)

Estas podem ser implementadas depois:

- [ ] DANFE PDF generation (já tem estrutura)
- [ ] Consulta de status na Sefaz
- [ ] Cancelamento de NFe
- [ ] Carta de Correção (CC-e)
- [ ] Inutilização de numeração
- [ ] Contingência offline
- [ ] Email automático do DANFE

---

## 🚀 SETUP RÁPIDO (5 minutos)

Se você tem tudo pronto (certificado, dados fiscais), execute:

```bash
./setup-nfe.sh         # Linux/Mac
# ou
.\setup-nfe.ps1        # Windows
```

Este script faz tudo automaticamente:
1. ✅ Verifica ENCRYPTION_KEY
2. ✅ Verifica CERTIFICATE_ENCRYPTION_KEY
3. ✅ Criptografa senhas
4. ✅ Testa emissão
5. ✅ Gera relatório

---

## 📊 RESUMO

| Item | Status | Ação Necessária |
|------|--------|-----------------|
| Código | ✅ Completo | Nenhuma |
| Scripts | ✅ Completo | Executar |
| Documentação | ✅ Completo | Ler |
| ENCRYPTION_KEY | ✅ Configurada | Nenhuma |
| CERTIFICATE_ENCRYPTION_KEY | ❌ Falta | Adicionar ao .env |
| Criptografar senhas | ❌ Não executado | Executar script |
| Dados fiscais | ⚠️ Validar | Verificar banco |
| Certificado digital | ⚠️ Validar | Verificar arquivo |
| Teste emissão | ❌ Não testado | Executar script |

---

## ✅ APÓS COMPLETAR OS 5 PASSOS

Você terá:
- ✅ 100% pronto para emitir NFe em homologação
- ✅ Senhas protegidas com AES-256-GCM
- ✅ Certificado validado
- ✅ Dados fiscais corretos
- ✅ Teste bem-sucedido

---

## 🎉 PRÓXIMO PASSO

**AGORA**: Adicione CERTIFICATE_ENCRYPTION_KEY ao .env

```bash
# Gerar chave
node -p "require('crypto').randomBytes(32).toString('hex')"

# Abra .env e adicione:
# CERTIFICATE_ENCRYPTION_KEY=<chave-gerada>
```

**DEPOIS**: Execute os outros 4 passos

**TOTAL**: 10-15 minutos até primeira NFe emitida! ⚡

---

**Última atualização**: 2024  
**Status**: 80% pronto, faltam 5 passos  
**Tempo restante**: 10-15 minutos
