# 📖 Índice Completo - Implementação de Emissão de NF-e

**Status**: ✅ Pronto para Teste em Homologação  
**Data**: 2024  
**Restrição Crítica**: Apenas homologação, nunca produção

---

## 📚 Documentação

### 1. **GUIA_RAPIDO_NFE.md** ⚡ (COMECE AQUI)
- 3 comandos para começar
- Segurança em 3 camadas
- Checklist de 8 pontos
- Troubleshooting em 30 segundos
- FAQ rápido
- **Tempo de leitura**: 5 minutos

### 2. **NFE_EMISSAO_SEGURA.md** 📋 (REFERÊNCIA TÉCNICA)
- Visão geral de proteção
- Fluxo de emissão em 6 etapas
- Pré-requisitos de ambiente
- Passo a passo de teste com screenshots
- Tratamento de erros
- Estrutura XML NF-e 4.00
- **Tempo de leitura**: 20 minutos

### 3. **CHECKLIST_NFE_EMISSAO.md** ✅ (GUIA PRÁTICO)
- Checklist de segurança (8 itens)
- Verificações de dados fiscais (15 itens)
- Passo a passo de teste (6 etapas detalhadas)
- Troubleshooting com soluções
- Logs para análise
- Sinais de sucesso
- **Tempo de leitura**: 15 minutos

### 4. **RESUMO_IMPLEMENTACAO_NFE.md** 📊 (HISTÓRICO)
- Histórico de 3 fases de implementação
- Antes vs Depois (segurança)
- Estrutura de arquivos modificados
- Métricas de sucesso
- Lições aprendidas
- **Tempo de leitura**: 10 minutos

---

## 🛠️ Scripts Executáveis

### 1. **encrypt-certificate-passwords.ts** 🔐
**Localização**: `api/src/scripts/encrypt-certificate-passwords.ts`

**Função**: Criptografar todas as senhas de certificado já existentes no banco

**Uso**:
```bash
cd api
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts
```

**Exemplo de Output**:
```
🔒 Iniciando criptografia de senhas de certificados...
📋 Encontradas 1 senhas para criptografar:
✅ CRIPTOGRAFADA: MedManager LTDA (id)
📊 Resumo:
   - Total processados: 1
   - Criptografadas: 1
   - Puladas (já criptografadas): 0
✅ Senhas de certificados criptografadas com sucesso!
```

**Quando Usar**: Uma única vez após deployment

### 2. **test-nfe-emission.ts** 🧪
**Localização**: `api/src/scripts/test-nfe-emission.ts`

**Função**: Testar emissão completa de NF-e em homologação

**Uso**:
```bash
export TEST_TENANT_ID=e9675bde-126b-429a-a150-533e055e7cc0
pnpm ts-node src/scripts/test-nfe-emission.ts
```

**Exemplo de Output**:
```
🧪 Iniciando teste de emissão de NF-e...
📋 Buscando tenant: e9675bde-126b-429a-a150-533e055e7cc0
✅ Tenant encontrado: MedManager
📋 Buscando perfil fiscal...
✅ Perfil fiscal encontrado:
   CNPJ: 11.234.567/0001-61
   Ambiente: homologacao
   Certificado: /certs/empresa.pfx
✅ Confirmado: Emissão será realizada em HOMOLOGAÇÃO
📝 Montando dados de NF-e...
⚙️  Inicializando serviço de NF-e...
🚀 Emitindo NF-e em homologação...
✅ NF-e EMITIDA COM SUCESSO!
📊 Resultado:
   Número NF-e: 100001
   Chave acesso: 35240111234567000161550010000100001000100001
   Protocolo: 135240101234567
   Status: authorized
   Data/Hora: 2024-01-15T10:30:00Z
🎉 Teste concluído com sucesso!
```

**Quando Usar**: Após criptografar senhas, antes de usar em produção

---

## 🚀 Scripts de Setup

### 1. **setup-nfe.sh** (Linux/Mac)
**Localização**: `setup-nfe.sh`

**Função**: Setup automático - verifica ambiente, criptografa senhas, testa emissão

**Uso**:
```bash
chmod +x setup-nfe.sh
./setup-nfe.sh
```

### 2. **setup-nfe.ps1** (Windows)
**Localização**: `setup-nfe.ps1`

**Função**: Setup automático para Windows PowerShell

**Uso**:
```powershell
.\setup-nfe.ps1
```

---

## 💻 Código Modificado

### 1. **api/src/services/nfe.service.ts** 🔐
**Modificações**:
- [Método `signXml`](api/src/services/nfe.service.ts#L559-L628): Descriptografa senha do certificado
- [Método `sendToSefaz`](api/src/services/nfe.service.ts#L640-L690): Descriptografa senha do certificado

**O que faz**:
```typescript
// Detecta se senha está criptografada (contém ':')
if (certPassword && certPassword.includes(':')) {
  // Descriptografa usando ENCRYPTION_KEY
  certPassword = decrypt(certPassword);
}
```

**Compatibilidade**: Senhas em texto simples ainda funcionam com fallback

### 2. **api/src/services/nfce.service.ts** 🔐
**Modificações**:
- [Método `signXml`](api/src/services/nfce.service.ts#L456-L480): Descriptografa senha do certificado
- [Método `sendToSefaz`](api/src/services/nfce.service.ts#L467-L495): Descriptografa senha do certificado

**O que faz**: Mesmo padrão de descriptografia que nfe.service.ts

---

## 📦 Estrutura de Arquivos

```
MedManager-PRO2.0/
├── 📄 GUIA_RAPIDO_NFE.md                  ← COMECE AQUI (⚡ 5 min)
├── 📄 NFE_EMISSAO_SEGURA.md               ← Referência técnica (📋 20 min)
├── 📄 CHECKLIST_NFE_EMISSAO.md            ← Guia prático (✅ 15 min)
├── 📄 RESUMO_IMPLEMENTACAO_NFE.md         ← Histórico (📊 10 min)
├── 📄 INDICE_NFE_IMPLEMENTACAO.md         ← Este arquivo
├── 🔧 setup-nfe.sh                        ← Setup automático (Linux/Mac)
├── 🔧 setup-nfe.ps1                       ← Setup automático (Windows)
│
└── api/src/
    ├── services/
    │   ├── nfe.service.ts                 ✅ MODIFICADO
    │   └── nfce.service.ts                ✅ MODIFICADO
    │
    ├── scripts/
    │   ├── encrypt-certificate-passwords.ts  ✨ NOVO
    │   └── test-nfe-emission.ts              ✨ NOVO
    │
    ├── utils/
    │   ├── encryption.ts                  ✅ Disponível
    │   └── certificate.ts                 ✅ Disponível
    │
    └── routes/
        └── invoice.routes.ts              ✅ POST /:id/emit
```

---

## 🔐 Segurança

### Camadas de Proteção

| Nível | O Quê | Como | Chave |
|-------|-------|------|-------|
| 1 | Arquivo .pfx | AES-256-GCM | CERTIFICATE_ENCRYPTION_KEY |
| 2 | Senha certificado | AES-256-GCM | ENCRYPTION_KEY |
| 3 | Banco de dados | PostgreSQL | configurado |

### Formato de Armazenamento
```
Antes: certificatePassword = "minhasenha123"  ❌
Depois: certificatePassword = "v1:iv:tag:data"  ✅ (base64)
```

### Descriptografia Automática
```
Ao emitir NF-e:
  → signXml() detecta ':'
    → chama decrypt(certificatePassword)
      → usa ENCRYPTION_KEY (.env)
        → descriptografa com AES-256-GCM
          → usa em memória (nunca em disco)
            → descarta após uso
```

---

## 🚀 Fluxo de Uso

### Passo 1: Preparação (1 hora)
1. Revisar [GUIA_RAPIDO_NFE.md](GUIA_RAPIDO_NFE.md)
2. Verificar variáveis de ambiente (ENCRYPTION_KEY, CERTIFICATE_ENCRYPTION_KEY)
3. Validar certificado digital não está expirado
4. Confirmar ambiente é HOMOLOGAÇÃO

### Passo 2: Setup (5 minutos)
```bash
# Linux/Mac
./setup-nfe.sh

# Windows
.\setup-nfe.ps1
```

Script fará:
- ✅ Verificar variáveis de ambiente
- ✅ Criptografar senhas existentes
- ✅ Testar emissão de NF-e
- ✅ Gerar relatório de sucesso

### Passo 3: Usar API (conforme necessário)
```bash
# Criar invoice
POST /api/v1/invoices
Authorization: Bearer {token}
Body: { invoiceNumber, customer, items }

# Emitir NF-e
POST /api/v1/invoices/{id}/emit
Authorization: Bearer {token}

# Resultado
{
  "nfeNumber": "100001",
  "accessKey": "35240111234567...",
  "protocol": "135240101234567",
  "status": "authorized"
}
```

### Passo 4: Monitoramento
Logs em:
- `/logs/nfe/nfe-{date}.log`
- `/logs/signatures/sig-{date}.log`
- `/logs/sefaz/sefaz-{date}.log`

---

## ❓ Perguntas Frequentes

**P: Qual documento devo ler primeiro?**
A: [GUIA_RAPIDO_NFE.md](GUIA_RAPIDO_NFE.md) (5 minutos)

**P: Como executo tudo de uma vez?**
A: `./setup-nfe.sh` (Linux/Mac) ou `.\setup-nfe.ps1` (Windows)

**P: Posso emitir em produção?**
A: NÃO. Sistema bloqueia automaticamente se `sefazEnvironment === 'producao'`

**P: E se a senha for em texto simples no banco antigo?**
A: Sistema funciona com fallback. Execute `encrypt-certificate-passwords.ts` para converter.

**P: Onde posso ver exemplo de XML assinado?**
A: Em [NFE_EMISSAO_SEGURA.md](NFE_EMISSAO_SEGURA.md) seção "Estrutura XML NF-e 4.00"

**P: Como saber se funcionou?**
A: Seguir [CHECKLIST_NFE_EMISSAO.md](CHECKLIST_NFE_EMISSAO.md) seção "Sinais de sucesso"

---

## 📊 Métricas

| Item | Status | Evidência |
|------|--------|-----------|
| Dashboard com borders | ✅ Completo | 3 arquivos modificados |
| Certificato protegido | ✅ Completo | AES-256-GCM implementado |
| Senha protegida | ✅ Completo | Descryptação adicionada |
| Scripts de teste | ✅ Completo | 2 scripts criados |
| Documentação | ✅ Completo | 4 documentos |
| Checklist | ✅ Completo | 23 itens |
| Troubleshooting | ✅ Completo | 8 cenários cobertos |
| Segurança homolog | ✅ Completo | Bloqueia produção |

---

## 🎯 Próximos Passos

### Imediato (Hoje)
- [ ] Ler [GUIA_RAPIDO_NFE.md](GUIA_RAPIDO_NFE.md)
- [ ] Executar `setup-nfe.sh` ou `setup-nfe.ps1`
- [ ] Validar teste bem-sucedido

### Curto Prazo (Semana)
- [ ] Integrar com sistema de vendas
- [ ] Testar múltiplas emissões
- [ ] Validar DANFE em PDF
- [ ] Documentar para time

### Médio Prazo (Mês)
- [ ] Implementar consulta de status
- [ ] Adicionar cancelamento de NF-e
- [ ] Integrar inutilização de números
- [ ] Setup em staging

### Longo Prazo (Produção)
- [ ] Backup de certificados
- [ ] Monitoramento de quota
- [ ] Alertas de expiração
- [ ] Auditoria de emissões

---

## 🆘 Suporte

### Problemas Comuns
Consulte [CHECKLIST_NFE_EMISSAO.md](CHECKLIST_NFE_EMISSAO.md) seção "TROUBLESHOOTING"

### Documentação Adicional
- Sefaz: https://www.nfe.fazenda.gov.br/
- Manual NFe 4.00: https://www.nfe.fazenda.gov.br/portal/informe.aspx

### Contato
Para questões técnicas, verificar logs em `/logs/nfe/`

---

**Última atualização**: 2024  
**Versão**: 1.0  
**Status**: ✅ Pronto para produção em homologação  

👉 **Comece aqui**: [GUIA_RAPIDO_NFE.md](GUIA_RAPIDO_NFE.md)
