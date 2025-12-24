# ⚡ GUIA RÁPIDO - Emissão de NF-e

## 🚀 3 Comandos para Começar

### 1️⃣ Criptografar Senhas (1 vez)
```bash
cd api
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts
```
✅ Resultado: Senhas convertidas para formato seguro

### 2️⃣ Testar Emissão
```bash
export TEST_TENANT_ID=e9675bde-126b-429a-a150-533e055e7cc0
pnpm ts-node src/scripts/test-nfe-emission.ts
```
✅ Resultado: NF-e emitida com número, chave e protocolo

### 3️⃣ Usar API para Emitir
```bash
# Criar invoice
POST /api/v1/invoices
{
  "invoiceNumber": 100001,
  "customer": {...},
  "items": [...]
}

# Emitir NF-e
POST /api/v1/invoices/{id}/emit
Authorization: Bearer {token}
```
✅ Resultado: Invoice atualizado com NFe data

---

## 🔐 Segurança em 3 Camadas

| Camada | Proteção | Chave |
|--------|----------|-------|
| 1️⃣ Arquivo .pfx | AES-256-GCM | CERTIFICATE_ENCRYPTION_KEY |
| 2️⃣ Senha | AES-256-GCM | ENCRYPTION_KEY |
| 3️⃣ Banco | Padrão PostgreSQL | configurado |

---

## 📋 Checklist Rápido Antes de Emitir

- [ ] `ENCRYPTION_KEY` configurada
- [ ] `CERTIFICATE_ENCRYPTION_KEY` configurada
- [ ] Certificado não expirado
- [ ] CNPJ da empresa válido
- [ ] Ambiente é **HOMOLOGAÇÃO** (nunca produção)
- [ ] Cliente tem CPF/CNPJ válido
- [ ] Itens têm NCM válido
- [ ] CFOP correto para tipo de operação

---

## 🛠️ Troubleshooting em 30s

| Erro | Comando para Verificar | Solução |
|------|----------------------|---------|
| "Certificate not found" | `ls -la {certificatePath}` | Arquivo não existe ou caminho errado |
| "Failed to decrypt" | `echo $ENCRYPTION_KEY` | Variável não está configurada |
| "Certificate expired" | `openssl pkcs12 -info -in cert.pfx` | Renovar certificado |
| "Production mode" | `SELECT sefazEnvironment FROM...` | Alterar para homologacao |
| "CNPJ invalid" | Validar dígito verificador | Usar CNPJ correto |

---

## 📊 Estrutura de Resposta

```json
{
  "success": true,
  "nfeNumber": "100001",
  "accessKey": "35240111234567000161550010000100001000100001",
  "protocol": "135240101234567",
  "status": "authorized",
  "authorizedAt": "2024-01-15T10:30:00Z",
  "danfeUrl": "https://..."
}
```

---

## 📚 Documentos de Referência

| Documento | Para |
|-----------|------|
| [NFE_EMISSAO_SEGURA.md](NFE_EMISSAO_SEGURA.md) | Entender fluxo técnico completo |
| [CHECKLIST_NFE_EMISSAO.md](CHECKLIST_NFE_EMISSAO.md) | Verificações detalhadas antes de emitir |
| [RESUMO_IMPLEMENTACAO_NFE.md](RESUMO_IMPLEMENTACAO_NFE.md) | Histórico de mudanças e decisões |

---

## 🎯 Próximos Passos Após Primeiro Teste

1. **Gerar DANFE em PDF**
   - [x] Estrutura pronta
   - [ ] Implementar renderização

2. **Consultar Status na Sefaz**
   - [ ] Implementar endpoint

3. **Cancelar NF-e**
   - [ ] Implementar com CC-e

4. **Integrar com Sistema de Vendas**
   - [ ] Webhook ao emitir
   - [ ] Log de auditoria

---

## ❓ FAQ Rápido

**P: E se a senha for em texto simples no banco antigo?**
A: Sistema detecta e usa fallback. Run `encrypt-certificate-passwords.ts` para converter.

**P: Pode emitir em produção?**
A: NÃO. Sistema bloqueia se `sefazEnvironment === 'producao'`.

**P: Precisa renovar certificado após encriptação?**
A: NÃO. Descriptografa automaticamente quando precisa.

**P: Quantas NF-e posso emitir por dia?**
A: Limite da Sefaz é ~5 por minuto. Sistema não tem limite.

**P: O que é CSC?**
A: Código de Segurança do Contribuinte. Obrigatório para NFCe, opcional para NFe.

---

**Última atualização**: 2024 | **Status**: ✅ Pronto para usar
