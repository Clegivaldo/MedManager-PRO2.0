# 🎯 AÇÃO IMEDIATA - O que fazer AGORA

## Você tem 3 opções:

### ⚡ OPÇÃO 1: Execute Setup (Recomendado - 5 min)

**Linux/Mac:**
```bash
./setup-nfe.sh
```

**Windows PowerShell:**
```powershell
.\setup-nfe.ps1
```

**O que acontece:**
1. ✅ Verifica ambiente
2. ✅ Criptografa senhas
3. ✅ Testa emissão
4. ✅ Mostra resultado

**Tempo total: ~5 minutos**

---

### 📖 OPÇÃO 2: Leia Guia Rápido (5 min)

```bash
# Abra com seu editor favorito:
GUIA_RAPIDO_NFE.md
```

**Conteúdo:**
- 3 comandos principais
- Checklist de 8 pontos
- FAQ rápido

**Depois execute:** `./setup-nfe.sh` ou `.\setup-nfe.ps1`

**Tempo total: ~10 minutos**

---

### 📚 OPÇÃO 3: Leitura Profunda (45 min)

**1. Leia primeiro (3 min):**
```bash
LEIA_PRIMEIRO_NFE.md
```

**2. Depois estes docs em ordem (45 min):**
1. GUIA_RAPIDO_NFE.md (5 min)
2. NFE_EMISSAO_SEGURA.md (20 min)
3. CHECKLIST_NFE_EMISSAO.md (15 min)
4. SUMARIO_EXECUTIVO_NFE.md (3 min)

**3. Então execute:** `./setup-nfe.sh` ou `.\setup-nfe.ps1`

**Tempo total: ~45 minutos (aprendizado profundo)**

---

## 🎉 Depois de Executar Setup...

Se vir isto, você está pronto:

```
✅ ENCRYPTION_KEY: configurada
✅ CERTIFICATE_ENCRYPTION_KEY: configurada
✅ Dependências: instaladas
✅ 1 senha criptografada
✅ NF-e emitida: 100001
   Chave: 35240111234567000161550010000100001000100001
   Status: authorized
✅ Setup concluído com sucesso!
```

---

## 🚀 Próximo: Usar API

```bash
# 1. Criar invoice
POST /api/v1/invoices
{
  "invoiceNumber": 100002,
  "customer": {...},
  "items": [...]
}

# 2. Emitir NF-e
POST /api/v1/invoices/{id}/emit
Authorization: Bearer {token}
```

---

## ⚠️ RESTRIÇÃO CRÍTICA

🚫 **APENAS HOMOLOGAÇÃO**  
🚫 **NUNCA PRODUÇÃO**

Sistema bloqueia automaticamente qualquer tentativa de produção.

---

## ❓ Se Não Funcionar

1. Verifique ENCRYPTION_KEY em .env
2. Verifique CERTIFICATE_ENCRYPTION_KEY em .env
3. Leia: CHECKLIST_NFE_EMISSAO.md (Troubleshooting)
4. Veja logs em `/logs/nfe/`

---

## 📋 Escolha sua ação:

- [ ] **AGORA**: `./setup-nfe.sh` (Opção 1 - 5 min)
- [ ] **Antes**: Ler GUIA_RAPIDO_NFE.md (Opção 2 - 10 min)
- [ ] **Profundo**: Opção 3 - 45 min

**Recomendação**: Opção 1 ou 2 🚀

---

👉 **Vamos começar?**

```bash
./setup-nfe.sh
# ou
.\setup-nfe.ps1
```

**Tempo: 5 minutos até primeira NF-e emitida!** ⚡
