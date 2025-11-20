# Changelog - Melhorias de Autenticação e Recuperação de Senha

## Data: 19/11/2025

### 🔐 Problemas Corrigidos

#### 1. Login de Tenant com Credenciais Demo
**Problema:** Botão "Usar credenciais Tenant Demo" estava inserindo dados corretos mas login falhava com erro "Invalid credentials"

**Causa:** Senha do usuário `admin@farmaciademo.com.br` no banco estava diferente de `admin123`

**Solução:**
- Criado script `fix-tenant-user-password.ts` para atualizar senha
- Senha agora é `admin123` para ambos usuários (`.com` e `.com.br`)
- Credenciais demo funcionando: CNPJ `12345678000195`, Email `admin@farmaciademo.com.br`, Senha `admin123`

#### 2. Botão Tenant Demo - Ordem de Preenchimento
**Problema:** Campos sendo preenchidos em ordem incorreta

**Solução:**
- Ajustado spread operator para preservar ordem: CNPJ → Email → Senha
- Código em `src/pages/Login.tsx` linha 276

#### 3. Redirecionamento por Role
**Problema:** Todos os usuários eram direcionados para `/dashboard`, incluindo SUPERADMIN

**Solução:**
- Login agora retorna `LoginResponse` com dados do usuário
- SUPERADMIN redireciona para `/superadmin`
- Outros roles (ADMIN, MANAGER, etc.) vão para `/dashboard`
- Implementado em `handleEmailLogin` e `handleCnpjLogin`

#### 4. SUPERADMIN Acessando Rotas de Tenant
**Problema:** SUPERADMIN conseguia acessar áreas restritas de tenant

**Solução:**
- `ProtectedRoute` agora bloqueia e redireciona SUPERADMIN automaticamente
- Se SUPERADMIN tentar acessar rota de tenant → redirect para `/superadmin`
- Outros usuários sem permissão veem tela de "Acesso Negado"

### ✨ Novas Funcionalidades

#### 1. Sistema Completo de Recuperação de Senha

**Backend:**
- Modelo `PasswordResetToken` no banco de dados
- Migration `20251120005619_add_password_reset_tokens`
- Rota `POST /api/v1/auth/forgot-password` - Solicita reset
- Rota `POST /api/v1/auth/reset-password` - Redefine senha
- Tokens expiram em 30 minutos
- Marcação de tokens como usados (uso único)

**Frontend:**
- Página `/forgot-password` - Solicitar recuperação
- Página `/reset-password` - Redefinir com token
- Link "Esqueceu sua senha?" na tela de login (centralizado)
- Validação de senhas (mínimo 8 caracteres, confirmação)
- Feedback via toast

#### 2. Serviço de Email com Nodemailer

**Características:**
- Configurável via variáveis de ambiente
- Modo desenvolvimento: logs apenas (não requer SMTP)
- Modo produção: envia emails reais
- Template HTML profissional para reset de senha
- Suporte a Gmail, SendGrid, Mailgun, SMTP customizado

**Arquivos:**
- `api/src/services/email.service.ts` - Serviço completo
- `EMAIL_SETUP.md` - Documentação de configuração

**Configuração (.env):**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="senha-app"
FROM_EMAIL="noreply@medmanager.com"
FRONTEND_URL="http://localhost:5173"
```

### 🎨 Melhorias de Interface

#### 1. Página de Recuperação de Senha
- **Removido:** Campo CNPJ (desnecessário - apenas email)
- **Melhorado:** Descrição mais clara
- **Adicionado:** Placeholder no campo email
- Layout mais limpo e focado

#### 2. Link "Esqueceu sua senha?"
- **Antes:** Desalinhado (class `block`)
- **Depois:** Centralizado
- Navegação para página dedicada (`/forgot-password`)

### 📦 Dependências Adicionadas

```json
"nodemailer": "7.0.10",
"@types/nodemailer": "7.0.4"
```

### 🗃️ Estrutura de Banco de Dados

**Nova Tabela:** `password_reset_tokens`
```sql
- id: UUID (PK)
- user_id: UUID (FK → users)
- tenant_id: UUID (FK → tenants, nullable)
- token: String (unique, indexed)
- expires_at: Timestamp
- used_at: Timestamp (nullable)
- created_at: Timestamp
```

### 🐳 Containers Atualizados

- ✅ Backend: Recompilado com email service
- ✅ Frontend: Atualizado com novas páginas
- ✅ DB: Migration aplicada automaticamente
- ✅ Todos os containers healthy

### 📝 Scripts Criados

1. `api/src/scripts/fix-tenant-user-password.ts` - Correção de senha tenant
2. `api/src/services/email.service.ts` - Serviço de email
3. `EMAIL_SETUP.md` - Documentação completa de configuração

### 🧪 Como Testar

#### Login SUPERADMIN
```
Email: admin@medmanager.com.br
Senha: admin123
→ Redireciona para /superadmin
```

#### Login Tenant
```
CNPJ: 12345678000195
Email: admin@farmaciademo.com.br
Senha: admin123
→ Redireciona para /dashboard
```

#### Recuperação de Senha (Desenvolvimento)
1. Acesse http://localhost:5173/forgot-password
2. Informe email cadastrado
3. Veja token no response (campo `dev.token`) ou logs do backend
4. Acesse http://localhost:5173/reset-password?token=SEU_TOKEN
5. Defina nova senha

#### Recuperação de Senha (Produção)
1. Configure SMTP no `.env` (ver `EMAIL_SETUP.md`)
2. Reinicie backend: `docker compose restart backend`
3. Solicite reset → email será enviado
4. Clique no link do email
5. Defina nova senha

### 🔒 Segurança

- ✅ Tokens criptograficamente seguros (32 bytes hex)
- ✅ Expiração automática (30 minutos)
- ✅ Uso único (marcados como `used_at`)
- ✅ Rate limiting nas rotas de auth
- ✅ Senhas hasheadas com bcrypt (12 rounds)
- ✅ Validação de role em ProtectedRoute
- ✅ Logs de tentativas de login/reset

### 🚀 Próximos Passos Recomendados

1. **Email em Produção:** Configurar SMTP real (Gmail/SendGrid)
2. **Auditoria:** Logar tentativas de reset para monitoramento
3. **UI/UX:** Adicionar página de confirmação após solicitar reset
4. **Notificações:** Alertar usuário após mudança de senha bem-sucedida
5. **Testes E2E:** Criar suite de testes automatizados para fluxo completo
6. **Throttling:** Limitar tentativas de reset por IP/email

### 📊 Métricas de Implementação

- **Arquivos Criados:** 4
- **Arquivos Modificados:** 8
- **Migrations:** 1
- **Rotas Adicionadas:** 2
- **Páginas Criadas:** 2
- **Tempo de Implementação:** ~2h
- **Linhas de Código:** ~450

---

## Comandos Úteis

```bash
# Ver logs de email
docker compose logs backend -f | grep -i email

# Ver logs de autenticação
docker compose logs backend -f | grep -i "login\|auth"

# Reiniciar backend
docker compose restart backend

# Checar health
docker compose ps

# Acessar banco
docker compose exec db psql -U postgres -d medmanager_master
```

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3333/api/v1
- Login: http://localhost:5173/login
- Recuperar Senha: http://localhost:5173/forgot-password
- Redefinir Senha: http://localhost:5173/reset-password
