# Teste de Correção - Tenant ID em JWT

## Problema Original
```
Ao abrir o dashboard, vários erros 403:
- GET /api/v1/warehouses?limit=100 → 403 Forbidden (módulo não habilitado)
- GET /api/v1/dashboard/metrics → net::ERR_EMPTY_RESPONSE
- GET /api/v1/dashboard/predictive → net::ERR_EMPTY_RESPONSE

Causa: tenantIdInHeader: undefined, tenantIdInUser: undefined
```

## Solução Implementada

### Mudança no Backend
**Arquivo**: `api/src/routes/auth.routes.ts` (linha ~190)

**Problema**: No login simples (sem CNPJ), o `tenantId` não estava sendo incluído no JWT.

**Fix**:
```typescript
// ANTES:
const accessToken = generateAccessToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  permissions
});

// DEPOIS:
const accessToken = generateAccessToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId || undefined, // ✅ NOVO
  permissions
});
```

### Por que isso resolve:
1. **JWT agora contém tenantId**:
   - Quando o usuário faz login, o JWT é gerado com `tenantId` (se o usuário tiver um)
   
2. **optionalTenantMiddleware extrai do JWT**:
   ```typescript
   const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
   ```
   - Tira do header `x-tenant-id` OU do `user.tenantId` do JWT

3. **Frontend envia x-tenant-id automaticamente**:
   - O authService salva `tenant_id` no localStorage durante login
   - O interceptador do Axios adiciona o header: `config.headers['x-tenant-id'] = tenantId`

4. **Backend consegue identificar o tenant**:
   - optionalTenantMiddleware resolve a informação do tenant
   - Adiciona `req.tenant` com id, name, cnpj, plan, modulesEnabled
   - Rotas conseguem acessar `req.tenant?.modulesEnabled`

## Fluxo Correto Agora

```
1. Login com email/senha
   ↓
2. Backend retorna JWT com tenantId (agora incluído)
   ↓
3. Frontend salva tokens + tenant_id no localStorage
   ↓
4. Frontend faz requisição
   ├─ Authorization header: Bearer <token>
   └─ x-tenant-id header: <tenant_id>
   ↓
5. Backend:
   - authenticateToken: extrai user.tenantId do JWT
   - optionalTenantMiddleware: busca tenant info no DB
   - req.tenant está preenchido
   ↓
6. Rotas conseguem acessar req.tenant.modulesEnabled
   ↓
7. validateModule middleware valida acesso correto
```

## Dados de Teste

**Tenant Demo**:
- CNPJ: `12345678000195`
- Email: `admin@farmaciademo.com.br`
- Senha: `admin123`
- Banco: `tenant_demo`

**Modules Habilitados** (conforme plan 'professional'):
- DASHBOARD
- PRODUCTS
- INVENTORY (não WAREHOUSE)
- ORDERS
- SALES
- QUOTES
- FINANCIAL
- DELIVERY
- NFE
- AUDIT
- COMPLIANCE

## Testes Esperados Após Fix

### ✅ Login
- [ ] Fazer login sem erros de CORS
- [ ] JWT contém `tenantId`
- [ ] localStorage salva `tenant_id`
- [ ] /auth/me retorna `tenant` com `modulesEnabled`

### ✅ Dashboard
- [ ] GET /warehouses → 200 (ou não-200 se não habilitado, mas sem ERR_EMPTY_RESPONSE)
- [ ] GET /dashboard/metrics → 200 (sem ERR_EMPTY_RESPONSE)
- [ ] GET /dashboard/predictive → 200 (sem ERR_EMPTY_RESPONSE)

### ✅ Module Validation
- [ ] Dashboard (habilitado): não mostra erro 403
- [ ] Warehouse (não habilitado para este tenant): mostra erro 403 com mensagem clara
- [ ] Sidebar filtra módulos corretamente

### ✅ Frontend
- [ ] AuthContext inicializa sem erros
- [ ] useAuth() retorna tenant com modulesEnabled
- [ ] ProtectedRoute redireciona se módulo não habilitado

## Status
- ✅ Backend build: Success
- ✅ Frontend build: Success
- ✅ Containers: All running
- ⏳ Teste de login: Pendente
- ⏳ Teste de dashboard: Pendente

## Próximas Etapas
1. Fazer login com credencial demo
2. Verificar console para debug logs
3. Verificar Network tab para request headers
4. Validar que 403 aparecem apenas para módulos não habilitados
5. Confirmar que ERR_EMPTY_RESPONSE foi resolvido
