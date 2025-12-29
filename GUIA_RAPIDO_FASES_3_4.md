# ⚡ GUIA RÁPIDO - FASES 3 E 4

## 🎯 O que foi entregue?

### FASE 3: Integração Automática Produtos + Guia 33
- ✅ Validação automática de prescrições
- ✅ Controle de quotas de pacientes
- ✅ Bloqueio de vendas irregulares
- ✅ 5 novos endpoints REST

### FASE 4: Rastreabilidade RDC 430/2020
- ✅ Sincronização com SNGPC/SNCM
- ✅ **DESABILITADO por padrão** (seguro)
- ✅ Habilitar/desabilitar via API
- ✅ 6 novos endpoints REST

---

## 🚀 Iniciar Servidor

```bash
cd c:\Users\Clegivaldo\Desktop\MedManager-PRO2.0\api
pnpm dev
# Servidor: http://localhost:3333
```

---

## 🧪 Testes Rápidos

### 1. Login
```bash
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@medmanager.com.br","password":"admin123"}' \
  | jq '.token' -r
# Salvar em: $TOKEN
```

### 2. FASE 3 - Dispensação Controlada

#### Criar produto controlado
```bash
curl -X POST http://localhost:3333/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alprazolam 1mg",
    "price": 35.90,
    "stockQuantity": 100,
    "isControlled": true,
    "controlledSubstance": "Benzodiazepínico"
  }' | jq '.product.id' -r
# Salvar em: $PRODUCT_ID
```

#### Criar cliente
```bash
curl -X POST http://localhost:3333/api/v1/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "document": "12345678900"
  }' | jq '.customer.id' -r
# Salvar em: $CUSTOMER_ID
```

#### Dispensar com prescrição (sucesso)
```bash
curl -X POST http://localhost:3333/api/v1/controlled-dispensation/dispense \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "customerId": "'$CUSTOMER_ID'",
    "quantity": 2,
    "prescription": {
      "id": "RX-001",
      "date": "2025-12-28",
      "validityDays": 30
    }
  }' | jq '.'
# Resultado esperado: ✅ success: true
```

#### Tentar dispensar SEM prescrição (bloqueado)
```bash
curl -X POST http://localhost:3333/api/v1/controlled-dispensation/dispense \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "customerId": "'$CUSTOMER_ID'",
    "quantity": 1
  }' | jq '.'
# Resultado esperado: ❌ error: "Prescription required"
```

### 3. FASE 4 - Rastreabilidade SNGPC

#### Verificar padrão (DESABILITADO)
```bash
curl -X GET http://localhost:3333/api/v1/sngpc/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" | jq '.'
# Resultado esperado: "autoSyncEnabled": false
```

#### Habilitar auto-sync
```bash
curl -X POST http://localhost:3333/api/v1/sngpc/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" | jq '.'
# Resultado esperado: "autoSyncEnabled": true
```

#### Verificar status
```bash
curl -X GET http://localhost:3333/api/v1/sngpc/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" | jq '.'
# Resultado esperado: status completo com próxima sincronização
```

#### Sincronizar manualmente
```bash
curl -X POST http://localhost:3333/api/v1/sngpc/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
# Resultado esperado: itemsSynced: N, itemsFailed: 0
```

#### Ver histórico
```bash
curl -X GET http://localhost:3333/api/v1/sngpc/history?limit=5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" | jq '.'
# Resultado esperado: lista de sincronizações
```

#### Desabilitar auto-sync
```bash
curl -X POST http://localhost:3333/api/v1/sngpc/disable \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: TENANT-ID" | jq '.'
# Resultado esperado: "autoSyncEnabled": false
```

---

## 📋 Variáveis Necessárias

```bash
# Login
$TOKEN          # JWT Bearer token
$TENANT_ID      # ID do tenant

# FASE 3
$PRODUCT_ID     # ID do produto controlado
$CUSTOMER_ID    # ID do cliente
```

---

## 📁 Arquivos Criados

### FASE 3
- `api/src/services/product-guia33-integration.service.ts` (277 linhas)
- `api/src/middleware/controlled-substance.middleware.ts` (95 linhas)
- `api/src/routes/controlled-dispensation.routes.ts` (232 linhas)

### FASE 4
- `api/src/services/sngpc-sncm.service.ts` (490 linhas)
- `api/src/routes/sngpc-config.routes.ts` (320 linhas)
- `api/src/middleware/sngpc-auto-sync.ts` (150 linhas)

### Modificados
- `api/src/server.ts` (import + routes)
- `.env.example` (variáveis SNGPC)

### Documentação
- `FASE3_INTEGRACAO_PRODUTOS_GUIA33.md`
- `FASE4_RDC430_SNGPC_SNCM.md`
- `RESUMO_FASE4_EXECUTIVO.md`
- `STATUS_PROJETO.md` (atualizado)

---

## ✅ Verificação Final

```bash
# 1. Compilar
cd api
pnpm build
# Esperado: ✅ Sem erros

# 2. Iniciar servidor
pnpm dev
# Esperado: 🚀 Server running on port 3333

# 3. Testar login
curl http://localhost:3333/api/v1/auth/login ...
# Esperado: ✅ Token retornado
```

---

## 🎯 Endpoints Implementados

### FASE 3 (5 endpoints)
```
POST   /api/v1/controlled-dispensation/dispense
POST   /api/v1/controlled-dispensation/receive
POST   /api/v1/controlled-dispensation/return
POST   /api/v1/controlled-dispensation/loss-waste
GET    /api/v1/controlled-dispensation/compliance/:productId
```

### FASE 4 (6 endpoints)
```
POST   /api/v1/sngpc/enable
POST   /api/v1/sngpc/disable
GET    /api/v1/sngpc/config
GET    /api/v1/sngpc/status
POST   /api/v1/sngpc/sync
GET    /api/v1/sngpc/history
```

**Total: 11 novos endpoints** ✅

---

## 🔑 Credenciais Teste

```
Email:    admin@medmanager.com.br
Senha:    admin123
Tenant:   (Seu ID de tenant)
```

---

## 🚨 Problemas Comuns

### Porta 3333 em uso
```bash
# Matar processo node
Stop-Process -Name node -Force

# Ou usar outra porta
PORT=3334 pnpm dev
```

### Erro de CORS
```bash
# Adicionar ao .env
CORS_ORIGINS=http://localhost:5173
```

### Erro de banco de dados
```bash
# Verificar .env
DATABASE_URL=postgresql://user:pass@localhost:5432/medmanager
```

---

## 📞 Suporte

### Documentação Completa
- FASE 3: [FASE3_INTEGRACAO_PRODUTOS_GUIA33.md](FASE3_INTEGRACAO_PRODUTOS_GUIA33.md)
- FASE 4: [FASE4_RDC430_SNGPC_SNCM.md](FASE4_RDC430_SNGPC_SNCM.md)

### Logs
```bash
# Ver logs de desenvolvimento
pnpm dev
# (Logs aparecem no terminal)

# Ver logs de produção
cat logs/app.log
```

---

## 🎉 Próximas Etapas

### FASE 5: Dashboard Frontend
- [ ] Painel de dispensação
- [ ] Painel SNGPC
- [ ] Gráficos de rastreabilidade

### FASE 6: Integração NF-e
- [ ] Link NF-e + Guia 33
- [ ] Rastreabilidade completa

---

**Desenvolvido:** 28/12/2025  
**Versão:** FASE 4  
**Status:** ✅ Pronto para uso
