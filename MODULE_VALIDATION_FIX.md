# 🔧 Correção: Bloqueio de Acesso a Módulos Desativados

## Problema Identificado
- Ao tentar acessar rotas que o tenant não tem módulo ativado (ex: warehouse, quotes), o app retornava erro de Unhandled Rejection
- Erro: `Cannot read properties of undefined (reading 'findMany')`
- Causa: O prisma client era `undefined` porque o tenant context não estava sendo validado

## Soluções Implementadas

### 1. **Backend - Melhorado Middleware de Validação de Módulos** 
Arquivo: `api/src/middleware/subscription.middleware.ts`

- Atualizado `validateModule()` para verificar `req.tenant.modulesEnabled` primeiro
- Se não estiver em `req.tenant`, busca do banco de dados
- Retorna erro 403 com código `MODULE_NOT_ENABLED` quando módulo não está habilitado

### 2. **Backend - Adicionado Middleware às Rotas**
Arquivo: `api/src/server.ts`

```typescript
app.use(`/api/v1/warehouses`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('WAREHOUSE'), warehouseRouter);
app.use(`/api/v1/quotes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('QUOTES'), quoteRouter);
app.use(`/api/v1/orders`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('ORDERS'), orderRouter);
app.use(`/api/v1/temperature`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('WAREHOUSE'), temperatureRouter);
app.use(`/api/v1/delivery-routes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('DELIVERY'), deliveryRouteRouter);
```

### 3. **Frontend - Sincronização de Nomes de Módulos**
Arquivos: 
- `src/components/Layout/Sidebar.tsx` - Nomes dos módulos atualizados para:
  - `ORDERS` (antes: `SALES`)
  - `QUOTES` (antes: `SALES`)
  - `DELIVERY` (antes: `ROUTES`)
  
- `src/App.tsx` - Requisitos de módulo das rotas atualizados

### 4. **Frontend - Proteção de Rotas**
Arquivo: `src/components/ProtectedRoute.tsx`

- Já existia validação de módulos
- Agora exibe mensagem clara quando módulo não está habilitado
- Inclui botão para fazer upgrade

## Como Funciona Agora

### 1. **Bloquear no Sidebar**
O sidebar não mostra botões/links para módulos não ativados:
```
Tenant modules enabled: ["DASHBOARD", "PRODUCTS", "NFE"]
```
- ✅ Dashboard - Visível
- ✅ Produtos - Visível
- ✅ NFe / PDV - Visível
- ❌ Warehouses - Oculto
- ❌ Quotes - Oculto
- ❌ Orders - Oculto
- ❌ Delivery Routes - Oculto

### 2. **Bloquear no Frontend**
Se usuário tentar acessar URL diretamente (ex: `http://localhost:5173/quotes`):
- ProtectedRoute verifica módulo
- Se não estiver em `tenant.modulesEnabled`
- Exibe tela: "Módulo Não Habilitado"

### 3. **Bloquear no Backend**
Se requisição chegar na API sem módulo:
```json
{
  "error": {
    "message": "Módulo \"QUOTES\" não está disponível no seu plano. Faça upgrade para acessar.",
    "code": "MODULE_NOT_ENABLED",
    "statusCode": 403
  }
}
```

## Módulos Configurados para Sua Tenant

```sql
SELECT modules_enabled FROM tenants 
WHERE cnpj = '12345678000195';

-- Result: ["DASHBOARD", "PRODUCTS", "NFE"]
```

## Testando

### Opção 1: Via API (com token válido)
```bash
curl -X GET http://localhost:3333/api/v1/warehouses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: e9675bde-126b-429a-a150-533e055e7cc0"

# Resultado esperado: 403 MODULE_NOT_ENABLED
```

### Opção 2: Via Frontend
1. Faça login com tenant
2. Tente acessar:
   - ✅ Dashboard - Funciona
   - ✅ Produtos - Funciona
   - ✅ NFe - Funciona
   - ❌ Quotes - Mostra "Módulo Não Habilitado"
   - ❌ Warehouses - Não aparece no menu

## Para Adicionar Módulos à Tenant

```sql
UPDATE tenants 
SET modules_enabled = '["DASHBOARD", "PRODUCTS", "NFE", "QUOTES", "WAREHOUSE", "ORDERS", "DELIVERY"]'
WHERE id = 'e9675bde-126b-429a-a150-533e055e7cc0';
```

## Arquivos Modificados
- ✅ `api/src/middleware/subscription.middleware.ts`
- ✅ `api/src/server.ts`
- ✅ `src/components/Layout/Sidebar.tsx`
- ✅ `src/App.tsx`

## Status
✅ Implementado e testado com sucesso!
