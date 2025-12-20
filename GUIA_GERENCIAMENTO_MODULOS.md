# 📚 Como Gerenciar Módulos de Tenants

## 🎯 Visão Geral

Os módulos controlam o acesso a funcionalidades específicas em cada tenant. Atualmente, você tem:

```
Tenant Demo (CNPJ: 12345678000195)
├─ ✅ DASHBOARD
├─ ✅ PRODUCTS  
└─ ✅ NFE
```

---

## 🔧 Como Adicionar Módulos

### Opção 1: Via SQL (Recomendado para Produção)

**Conectar ao banco:**
```bash
docker exec -it db psql -U postgres -d medmanager_master
```

**Adicionar um módulo:**
```sql
UPDATE tenants 
SET modules_enabled = '["DASHBOARD", "PRODUCTS", "NFE", "INVENTORY"]'
WHERE cnpj = '12345678000195';
```

**Adicionar vários módulos:**
```sql
UPDATE tenants 
SET modules_enabled = '["DASHBOARD", "PRODUCTS", "NFE", "INVENTORY", "ORDERS", "QUOTES", "DELIVERY", "FINANCIAL", "AUDIT", "COMPLIANCE"]'
WHERE cnpj = '12345678000195';
```

**Verificar módulos atuais:**
```sql
SELECT cnpj, name, modules_enabled 
FROM tenants 
WHERE cnpj = '12345678000195';
```

### Opção 2: Via API (Quando Implementada)
```bash
POST /api/v1/superadmin/modules/assign

{
  "tenantId": "e9675bde-126b-429a-a150-533e055e7cc0",
  "modules": ["DASHBOARD", "PRODUCTS", "NFE", "INVENTORY", "ORDERS"]
}
```
*Atualmente não implementada - será adicionada na gestão de módulos do superadmin*

---

## 📋 Módulos Disponíveis

### Core
| Módulo | Nome | Descrição | Rota | Header |
|--------|------|-----------|------|--------|
| DASHBOARD | Dashboard | Painel principal | `/dashboard` | `validateModule('DASHBOARD')` |
| PRODUCTS | Produtos | Gestão de produtos | `/products` | `validateModule('PRODUCTS')` |
| NFE | NFe / PDV | Nota Fiscal / PDV | `/nfe`, `/pdv` | `validateModule('NFE')` |

### Vendas & Finanças
| Módulo | Nome | Descrição | Rota | Header |
|--------|------|-----------|------|--------|
| ORDERS | Pedidos | Gestão de pedidos | `/orders` | `validateModule('ORDERS')` |
| QUOTES | Orçamentos | Gestão de orçamentos | `/quotes` | `validateModule('QUOTES')` |
| SALES | Vendas | Módulo de vendas geral | `/sales` | `validateModule('SALES')` |
| FINANCIAL | Financeiro | Financeiro e pagamentos | `/financials` | `validateModule('FINANCIAL')` |

### Operações
| Módulo | Nome | Descrição | Rota | Header |
|--------|------|-----------|------|--------|
| INVENTORY | Estoque | Gestão de estoque | `/inventory` | `validateModule('INVENTORY')` |
| WAREHOUSE | Warehouse | Armazém (temperaturas) | `/warehouses` | `validateModule('WAREHOUSE')` |
| DELIVERY | Entregas | Rotas de entrega | `/routes` | `validateModule('DELIVERY')` |

### Administrativo
| Módulo | Nome | Descrição | Rota | Header |
|--------|------|-----------|------|--------|
| AUDIT | Auditoria | Log de auditoria | `/audit` | `validateModule('AUDIT')` |
| COMPLIANCE | Conformidade | Conformidade regulatória | `/compliance` | `validateModule('COMPLIANCE')` |

---

## ✅ Checklist: Adicionar um Novo Módulo

Se precisar adicionar um novo módulo (para nova funcionalidade):

1. **Definir o nome do módulo** (ex: `ADVANCED_REPORTS`)
   
2. **Backend - Adicionar middleware à rota:**
   ```typescript
   // File: api/src/server.ts
   app.use(
     `/api/${config.API_VERSION}/advanced-reports`,
     authenticateToken,
     tenantMiddleware,
     validateSubscription,
     validateModule('ADVANCED_REPORTS'), // ← Adicionar aqui
     advancedReportsRouter
   );
   ```

3. **Frontend - Adicionar ao Sidebar:**
   ```typescript
   // File: src/components/Layout/Sidebar.tsx
   const menuItems = [
     // ... items existentes
     { 
       title: 'Relatórios Avançados', 
       icon: BarChart3,
       href: '/advanced-reports',
       module: 'ADVANCED_REPORTS' // ← Adicionar aqui
     },
   ];
   ```

4. **Frontend - Adicionar rota protegida:**
   ```typescript
   // File: src/App.tsx
   <Route path="advanced-reports" element={<ProtectedRoute requiredModule="ADVANCED_REPORTS" />}>
     <Route index element={<AdvancedReports />} />
   </Route>
   ```

5. **Habilitar para Tenant:**
   ```sql
   UPDATE tenants 
   SET modules_enabled = array_append(modules_enabled, 'ADVANCED_REPORTS')
   WHERE cnpj = '12345678000195';
   ```

---

## 🧪 Teste Após Adicionar Módulo

1. **No banco:**
   ```sql
   SELECT modules_enabled FROM tenants WHERE cnpj = '12345678000195';
   -- Deve mostrar: ["DASHBOARD", "PRODUCTS", "NFE", "INVENTORY", ...]
   ```

2. **No frontend:**
   ```
   - Recarregar página (Ctrl+R ou Cmd+R)
   - Sidebar deve mostrar novo botão
   - Clicar deve abrir a página
   ```

3. **Na API:**
   ```bash
   # Com token e header de tenant corretos
   curl -X GET http://localhost:3333/api/v1/advanced-reports \
     -H "Authorization: Bearer TOKEN" \
     -H "x-tenant-id: e9675bde-126b-429a-a150-533e055e7cc0"
   
   # Deve retornar 200 OK (não 403)
   ```

---

## 🔍 Validações em Ação

### Cenário 1: Módulo Habilitado
```
Request:  GET /api/v1/products
Header:   x-tenant-id: e9675bde-126b-429a-a150-533e055e7cc0
Modules:  ["DASHBOARD", "PRODUCTS", "NFE"]
Response: ✅ 200 OK - Dados retornados
```

### Cenário 2: Módulo NÃO Habilitado
```
Request:  GET /api/v1/warehouses
Header:   x-tenant-id: e9675bde-126b-429a-a150-533e055e7cc0
Modules:  ["DASHBOARD", "PRODUCTS", "NFE"]  (sem WAREHOUSE)
Response: ❌ 403 Forbidden
{
  "error": {
    "message": "Módulo \"WAREHOUSE\" não está disponível...",
    "code": "MODULE_NOT_ENABLED",
    "statusCode": 403
  }
}
```

### Cenário 3: SUPERADMIN Ignora Restrição
```
Request:  GET /api/v1/warehouses
Role:     SUPERADMIN
Tenant:   (nenhum)
Modules:  (ignorado)
Response: ✅ 200 OK - Acesso permitido
```

---

## 📊 Exemplo: Ativar Todos os Módulos

Para sua tenant de teste, ativar todos os módulos:

```sql
UPDATE tenants 
SET modules_enabled = '[
  "DASHBOARD",
  "PRODUCTS",
  "NFE",
  "INVENTORY",
  "ORDERS",
  "QUOTES",
  "SALES",
  "FINANCIAL",
  "WAREHOUSE",
  "DELIVERY",
  "AUDIT",
  "COMPLIANCE"
]'
WHERE cnpj = '12345678000195';
```

Verificar:
```sql
SELECT modules_enabled 
FROM tenants 
WHERE cnpj = '12345678000195';
```

---

## 🐛 Troubleshooting

### Problema: Adicionei módulo no DB mas não aparece no Sidebar
**Solução:**
1. Recarregar página no browser (Ctrl+Shift+R para limpiar cache)
2. Verificar se o token está atualizado (fazer logout/login)
3. Verificar no Network/Console se GET /auth/me retorna módulos atualizados

### Problema: Módulo aparece no Sidebar mas dá erro na API
**Verificar:**
1. Middleware adicionado à rota?
   ```bash
   grep -r "validateModule('WAREHOUSE')" api/src/
   ```
2. Nome do módulo escrito corretamente?
   - Case-sensitive: `WAREHOUSE` ≠ `warehouse`
3. Tenant foi atualizado no DB?

### Problema: Usuário SUPERADMIN não consegue acessar rota
**Checklist:**
1. Está logado? (Verificar token)
2. Rota tem `authenticateToken`?
3. Se não tem tenant header, middleware deixa passar?
4. Checar logs do backend

---

## 📞 Suporte

Para dúvidas sobre módulos:
1. Verificar [RESUMO_CORRECOES_MODULOS.md](./RESUMO_CORRECOES_MODULOS.md)
2. Checar [CORRECAO_MASTER_MODULOS.md](./CORRECAO_MASTER_MODULOS.md)
3. Análise de logs: `docker logs backend | grep -i module`
