# 📋 Teste de Validação de Módulos

## Tenant: Farmácia Demo (CNPJ: 12345678000195)
**Módulos Habilitados:** `["DASHBOARD", "PRODUCTS", "NFE"]`

### Rotas que Devem Funcionar ✅
1. **Dashboard** - `/dashboard`
   - Módulo: `DASHBOARD`
   - Status: ✅ Habilitado

2. **Produtos** - `/products`
   - Módulo: `PRODUCTS`
   - Status: ✅ Habilitado

3. **NFe / PDV** - `/nfe` e `/pdv`
   - Módulo: `NFE`
   - Status: ✅ Habilitado

### Rotas que Devem Ser Bloqueadas ❌
1. **Warehouse** - `/api/v1/warehouses`
   - Módulo: `WAREHOUSE`
   - Status: ❌ Não habilitado
   - Erro esperado: 403 MODULE_NOT_ENABLED

2. **Quotes** - `/api/v1/quotes`
   - Módulo: `QUOTES`
   - Status: ❌ Não habilitado
   - Erro esperado: 403 MODULE_NOT_ENABLED

3. **Orders** - `/api/v1/orders`
   - Módulo: `ORDERS`
   - Status: ❌ Não habilitado
   - Erro esperado: 403 MODULE_NOT_ENABLED

4. **Delivery Routes** - `/api/v1/delivery-routes`
   - Módulo: `DELIVERY`
   - Status: ❌ Não habilitado
   - Erro esperado: 403 MODULE_NOT_ENABLED

5. **Temperature** - `/api/v1/temperature`
   - Módulo: `WAREHOUSE`
   - Status: ❌ Não habilitado
   - Erro esperado: 403 MODULE_NOT_ENABLED

## No Frontend

### Sidebar
- ✅ Dashboard - Visível
- ✅ Produtos - Visível
- ✅ NFe / PDV - Visível
- ❌ Quotes - Oculto
- ❌ Orders - Oculto
- ❌ Warehouses - Oculto
- ❌ Temperature - Oculto (junto com warehouses)
- ❌ Delivery Routes - Oculto

### Proteção de Rotas
Se tentar acessar uma URL de módulo desabilitado diretamente:
- Exibe: "Módulo Não Habilitado - MODULE_QUOTES não está disponível"
- Opção de voltar ou fazer upgrade

## Para Testar Adicionando Módulos

```sql
-- Adicionar QUOTES e ORDERS
UPDATE tenants 
SET modules_enabled = '["DASHBOARD", "PRODUCTS", "NFE", "QUOTES", "ORDERS"]'
WHERE cnpj = '12345678000195';

-- Agora /quotes e /orders devem funcionar
-- E os links devem aparecer no sidebar
```

## Verificação no Banco

```sql
SELECT cnpj, modules_enabled 
FROM tenants 
WHERE cnpj = '12345678000195';
```

Expected Output:
```
       cnpj       |                modules_enabled
-------------------+------------------------------------------------
 12345678000195    | ["DASHBOARD", "PRODUCTS", "NFE"]
```
