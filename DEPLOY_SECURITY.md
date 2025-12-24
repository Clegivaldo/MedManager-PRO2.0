# 🔒 GUIA DE DEPLOYMENT - MELHORIAS DE SEGURANÇA

## 📋 RESUMO DAS ALTERAÇÕES

Este deployment implementa **melhorias críticas de segurança** identificadas no relatório de auditoria.

### ✅ Implementações Concluídas

1. **Criptografia de senhas de banco de dados dos tenants** (AES-256-GCM)
2. **Unificação do módulo de criptografia** (utils/encryption.ts)
3. **Remoção de chaves hardcoded** do docker-compose.yml
4. **Proteção CSRF** para requisições mutáveis
5. **Validação e sanitização de inputs** (express-validator)
6. **Script de migração** para criptografar senhas existentes

---

## 🚀 PASSO A PASSO PARA DEPLOY

### 1️⃣ PRÉ-REQUISITOS

```bash
# Instalar dependências adicionais
cd api
npm install cookie-parser express-validator
npm install --save-dev @types/cookie-parser
```

### 2️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

```bash
# Copiar template
cp .env.production.template .env.production

# Gerar secrets seguros
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Editar `.env.production`:**
```env
NODE_ENV=production
PORT=3333
DATABASE_URL=postgresql://user:password@host:5432/medmanager_master
JWT_SECRET=<VALOR_GERADO_ACIMA>
JWT_REFRESH_SECRET=<VALOR_GERADO_ACIMA>
ENCRYPTION_KEY=<VALOR_GERADO_ACIMA>
REDIS_URL=redis://redis:6379
CORS_ORIGINS=https://app.medmanager.com,https://medmanager.com
TRUST_PROXY=true
```

### 3️⃣ EXECUTAR MIGRAÇÃO DE SENHAS

**⚠️ ATENÇÃO: Execute ANTES de subir a nova versão**

```bash
# Backup do banco de dados
pg_dump medmanager_master > backup_before_migration_$(date +%Y%m%d).sql

# Executar script de migração
cd api
npx ts-node src/scripts/migrate-encrypt-passwords.ts

# Verificar logs
# Deve mostrar:
# ✅ Migrados: X
# ⏭️  Pulados: 0
# ❌ Erros: 0
```

### 4️⃣ BUILD E DEPLOY

```bash
# Build da aplicação
cd api
npm run build

# Testar localmente (opcional)
NODE_ENV=production npm start

# Deploy com Docker
cd ..
docker-compose -f docker-compose.yml --env-file .env.production up -d --build
```

### 5️⃣ VERIFICAÇÕES PÓS-DEPLOY

```bash
# 1. Health check
curl http://localhost:3333/health

# 2. Obter token CSRF
curl http://localhost:3333/api/csrf-token

# 3. Verificar logs
docker logs backend -f

# 4. Verificar que não há chaves hardcoded
docker inspect backend | grep -i "secret\|password\|key"
# Não deve mostrar valores reais
```

---

## 🔐 SEGURANÇA ADICIONAL

### Configurar WAF/CDN (Recomendado)

**Cloudflare:**
1. Adicionar domínio ao Cloudflare
2. Ativar modo "Under Attack" se necessário
3. Configurar Rate Limiting rules
4. Ativar Bot Fight Mode

**AWS WAF:**
```bash
# Criar regra de rate limiting
aws wafv2 create-web-acl \
  --name medmanager-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules RateLimitRule
```

### Rotação de Chaves

**Criar processo de rotação a cada 90 dias:**

```bash
# 1. Gerar novas chaves
NEW_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Manter chave antiga temporariamente para descriptografar dados
# 3. Re-criptografar todos os dados com nova chave
# 4. Atualizar variável de ambiente
# 5. Restart da aplicação
```

### Secrets Manager (Produção)

**AWS Secrets Manager:**
```bash
# Criar secret
aws secretsmanager create-secret \
  --name medmanager/encryption-key \
  --secret-string "$ENCRYPTION_KEY"

# Atualizar código para buscar do Secrets Manager
```

**HashiCorp Vault:**
```bash
# Armazenar no Vault
vault kv put secret/medmanager \
  encryption_key="$ENCRYPTION_KEY" \
  jwt_secret="$JWT_SECRET"
```

---

## 🛡️ VALIDAÇÕES DE SEGURANÇA

### Checklist Pós-Deploy

- [ ] Senhas de DB criptografadas no banco master
- [ ] Chaves não aparecem em `docker inspect`
- [ ] CSRF protection ativo (verificar headers)
- [ ] Rate limiting funcionando
- [ ] Helmet headers presentes
- [ ] Logs de auditoria registrando ações
- [ ] HTTPS ativo (certificado válido)
- [ ] CORS configurado corretamente
- [ ] Backup funcionando

### Testes de Segurança

```bash
# 1. Teste de SQL Injection (deve falhar)
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com OR 1=1--","password":"test"}'

# 2. Teste de CSRF (deve retornar 403 em produção)
curl -X POST http://localhost:3333/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'

# 3. Teste de Rate Limiting
for i in {1..10}; do
  curl http://localhost:3333/api/v1/auth/login
done
# Deve bloquear após 5 tentativas

# 4. Teste de XSS (deve ser escapado)
curl -X POST http://localhost:3333/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com"}'
```

---

## 📊 MONITORAMENTO

### Logs a Monitorar

```bash
# Tentativas de login falhadas
grep "Invalid credentials" /var/log/medmanager/app.log

# Rate limiting ativado
grep "Too many requests" /var/log/medmanager/app.log

# Erros de criptografia
grep "Failed to decrypt" /var/log/medmanager/app.log

# CSRF violations
grep "Invalid CSRF token" /var/log/medmanager/app.log
```

### Alertas Recomendados

1. **Mais de 10 tentativas de login falhadas** em 5 minutos
2. **Erro de descriptografia** (pode indicar chave incorreta)
3. **CSRF violations** acima de 5/hora
4. **Rate limiting** ativado com frequência

---

## 🔄 ROLLBACK (Se Necessário)

```bash
# 1. Restaurar backup do banco
psql medmanager_master < backup_before_migration_YYYYMMDD.sql

# 2. Voltar versão anterior do código
git checkout <commit_anterior>
docker-compose up -d --build

# 3. Verificar funcionamento
curl http://localhost:3333/health
```

---

## 📞 SUPORTE

### Em Caso de Problemas

1. **Verificar logs:** `docker logs backend -f`
2. **Verificar variáveis:** `docker exec backend env | grep -i secret`
3. **Testar conectividade DB:** `docker exec backend npx prisma db push`
4. **Verificar Redis:** `docker exec redis redis-cli ping`

### Contatos

- **Equipe DevOps:** devops@medmanager.com
- **Segurança:** security@medmanager.com
- **On-call:** +55 11 XXXX-XXXX

---

## 📚 REFERÊNCIAS

- [Relatório de Segurança](./RELATORIO_SEGURANCA.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management#security)

---

**Data:** Dezembro 2025  
**Versão:** 2.0 - Security Hardening  
**Status:** ✅ Pronto para Deploy
