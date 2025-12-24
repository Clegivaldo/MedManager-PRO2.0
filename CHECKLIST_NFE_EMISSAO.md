# ✅ Checklist de Emissão de NF-e - MedManager PRO 2.0

## 🔐 SEGURANÇA - OBRIGATÓRIO VERIFICAR ANTES

- [ ] **Ambiente é HOMOLOGAÇÃO?**
  - Verificar: `fiscalProfile.sefazEnvironment === 'homologacao'`
  - Bloqueia qualquer tentativa de produção

- [ ] **ENCRYPTION_KEY configurada?**
  - Verificar: `echo $ENCRYPTION_KEY` (não vazio)
  - Usado para: Descriptografar senhas de certificado

- [ ] **CERTIFICATE_ENCRYPTION_KEY configurada?**
  - Verificar: `echo $CERTIFICATE_ENCRYPTION_KEY` (não vazio)
  - Usado para: Descriptografar arquivo .pfx

- [ ] **Senhas de certificado foram criptografadas?**
  - Executar: `pnpm ts-node api/src/scripts/encrypt-certificate-passwords.ts`
  - Verificar formato no banco: `v1:iv:tag:data`

- [ ] **Certificado digital está válido?**
  - Não está expirado
  - É do tipo A1 (.pfx)
  - Compatível com NFe 4.00

## 📋 DADOS FISCAIS - VERIFICAR ANTES

### Perfil Fiscal (tenantFiscalProfile)

- [ ] **CNPJ válido?**
  - Formato: XX.XXX.XXX/XXXX-XX
  - Verificar dígito verificador
  - Configurado em: `fiscalProfile.cnpj`

- [ ] **Número de Inscrição Estadual?**
  - ICMS: Número com 12-14 dígitos
  - Configurado em: `fiscalProfile.registrationNumber`

- [ ] **CSC (Código de Segurança do Contribuinte)?**
  - ID CSC: `fiscalProfile.cscId`
  - Valor CSC: `fiscalProfile.cscValue`
  - Ambos obrigatórios para NFC-e, opcionais para NFe

- [ ] **Caminho do certificado correto?**
  - Arquivo existe: `ls -la {certificatePath}`
  - Permissão de leitura: `chmod 644`
  - Configurado em: `fiscalProfile.certificatePath`

### Dados da Invoice

- [ ] **Número de série válido?**
  - Série 1 (padrão) ou série existente
  - Verificar se próximo número já foi emitido

- [ ] **CNPJ do cliente válido?**
  - CPF (11 dígitos) ou CNPJ (14 dígitos)
  - Dígito verificador correto
  - NÃO pode ser o CNPJ da empresa

- [ ] **Email do cliente preenchido?**
  - Necessário para envio de DANFE
  - Verificar: `customer.email`

- [ ] **Endereço completo?**
  - Rua, número, bairro, cidade, estado, CEP
  - País: sempre "Brasil"

- [ ] **Itens com NCM?**
  - Código NCM válido (8 dígitos)
  - Ex: 69111100 para serviços

- [ ] **CFOP correto?**
  - 5101: Venda de produto do estabelecimento
  - 5102: Retorno/devolução de venda
  - 5901: Serviço de transporte
  - Deve corresponder ao tipo de operação

- [ ] **Impostos calculados?**
  - ICMS, PIS, COFINS com alíquotas
  - Total de itens = Subtotal
  - Subtotal + Impostos = Total (sem desconto)

## 🧪 TESTE - PASSO A PASSO

### 1. Preparação
```bash
# Entrar na pasta API
cd api

# Instalar dependências (se necessário)
pnpm install

# Verificar ambiente
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo "CERTIFICATE_ENCRYPTION_KEY: $CERTIFICATE_ENCRYPTION_KEY"
```

### 2. Criptografar Senhas
```bash
# Executar script de criptografia
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts

# Esperado:
# ✅ CRIPTOGRAFADA: [Empresa]
# 📊 Resumo: Total 1, Criptografadas 1
```

### 3. Verificar Banco de Dados
```bash
# Acessar Prisma Studio
pnpm prisma studio

# Navegue até: tenantFiscalProfile
# Verifique: certificatePassword começa com "v1:"
```

### 4. Executar Teste de Emissão
```bash
# Definir ID da tenant (se necessário)
export TEST_TENANT_ID=e9675bde-126b-429a-a150-533e055e7cc0

# Executar teste
pnpm ts-node src/scripts/test-nfe-emission.ts

# Esperado:
# 🧪 Iniciando teste de emissão de NF-e...
# ✅ Tenant encontrado
# ✅ Perfil fiscal encontrado
# ✅ Confirmado: Emissão será realizada em HOMOLOGAÇÃO
# 🚀 Emitindo NF-e em homologação...
# ✅ NF-e EMITIDA COM SUCESSO!
# 📊 Resultado: (número, chave, protocolo, etc)
```

### 5. Verificar XML Gerado
```bash
# O XML deve conter:
# - Assinatura digital RSA-SHA1
# - Chave de acesso 44 dígitos
# - Dados do cliente
# - Itens com NCM
# - Totais de impostos
```

### 6. Consultar Sefaz
```bash
# Em homologação, após emissão bem-sucedida
curl -X GET "http://localhost:3000/api/v1/invoices/{invoiceId}"

# Esperado:
# - nfeNumber: 100001
# - status: authorized
# - protocol: número do protocolo
# - authorizedAt: data/hora autorização
```

## 🚨 TROUBLESHOOTING

### ❌ "Certificate not found"
```
Verificar:
1. Arquivo existe: ls -la {certificatePath}
2. Permissões: chmod 644 {file}
3. Caminho correto no banco: Prisma Studio
```

### ❌ "Failed to decrypt certificate password"
```
Verificar:
1. ENCRYPTION_KEY está configurada
2. ENCRYPTION_KEY é válida (256 bits)
3. Senha não foi corrompida no banco
4. Executar: pnpm ts-node encrypt-certificate-passwords.ts
```

### ❌ "Certificate invalid or expired"
```
Verificar:
1. Data de validade: openssl pkcs12 -info -in arquivo.pfx
2. Tipo: deve ser A1 (.pfx ou .p12)
3. Renovar com AC se expirado
```

### ❌ "CNPJ not found at Sefaz"
```
Verificar:
1. CNPJ cadastrado para NFe na Sefaz
2. Estado correto (SP, MG, etc)
3. Autorização de NFe ativa
4. CSC configurado (se NFCe)
```

### ❌ "Invalid CFOP or NCM"
```
Verificar:
1. CFOP: deve existir e ser compatível com tipo de operação
2. NCM: deve ser válido (8 dígitos)
3. Tabelas: consultar CONFAZ/Sefaz
```

## 📊 LOGS PARA ANÁLISE

### Arquivos de Log
- NFe: `/logs/nfe/nfe-{date}.log`
- Assinatura: `/logs/signatures/sig-{date}.log`
- Sefaz: `/logs/sefaz/sefaz-{date}.log`

### Comandos Úteis
```bash
# Ver logs em tempo real
tail -f /logs/nfe/nfe-*.log

# Procurar por erros
grep "ERROR" /logs/nfe/nfe-*.log

# Extrair chave de acesso
grep "accessKey" /logs/nfe/nfe-*.log
```

## ✅ SUCESSO - SINAIS DE QUE ESTÁ FUNCIONANDO

1. ✅ Script de criptografia executa sem erros
2. ✅ Senhas aparecem como `v1:...` no banco
3. ✅ Teste de emissão retorna `nfeNumber` e `accessKey`
4. ✅ XML contém assinatura digital
5. ✅ Protocolo da Sefaz é retornado
6. ✅ Invoice atualizado com `nfeNumber` e `status`
7. ✅ DANFE pode ser gerado e visualizado
8. ✅ Logs mostram "NFe emitted successfully"

## 🎯 PRÓXIMOS PASSOS

Após teste bem-sucedido em homologação:

1. [ ] Gerar DANFE em PDF
2. [ ] Implementar consulta de status
3. [ ] Criar endpoint de cancelamento
4. [ ] Testar inutilização de série
5. [ ] Documentar processo para SRE
6. [ ] Configurar alertas de falha
7. [ ] Setup de backup de certificados
8. [ ] Treinamento de operações

---

**Última atualização**: 2024
**Status**: ✅ Pronto para teste em homologação
**Restrição crítica**: Apenas HOMOLOGAÇÃO, nunca produção sem aprovação
