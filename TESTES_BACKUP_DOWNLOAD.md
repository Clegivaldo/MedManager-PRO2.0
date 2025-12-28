# Testes - Endpoint de Download de Backup

## 📋 Descrição
Testes para validar o novo endpoint de download de backup que foi implementado em `GET /api/v1/backup/download/:tenantId/:backupFileName`.

## 🚀 Pré-requisitos

1. **Backend rodando** em `http://localhost:3333`
2. **Postgres rodando** com tenants criados
3. **Token JWT válido** (obter via login)
4. **Arquivos de backup** existentes em `./backups/{tenantId}/`

## 🔐 1. Autenticar e Obter Token

```bash
# Login como admin
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "34.028.316/0001-07",
    "email": "admin@medmanager.com",
    "password": "Admin@123"
  }'
```

**Resposta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "user": {
    "userId": "user-id-123",
    "email": "admin@medmanager.com",
    "role": "ADMIN",
    "permissions": ["backup_download", ...]
  }
}
```

**Guardar em variável:**
```bash
TOKEN="seu_token_aqui"
TENANT_ID="sua-tenant-id-aqui"
```

## 📋 2. Listar Backups Disponíveis

```bash
# Listar backups do tenant
curl -X GET "http://localhost:3333/api/v1/backup/list/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "items": [
    {
      "name": "backup_20250101_120000.sql.gz",
      "size": 5242880,
      "modifiedAt": "2025-01-01T12:00:00.000Z",
      "path": "/path/to/backup"
    }
  ]
}
```

## ⬇️ 3. Testar Download de Backup

```bash
# Download do backup
curl -X GET "http://localhost:3333/api/v1/backup/download/$TENANT_ID/backup_20250101_120000.sql.gz" \
  -H "Authorization: Bearer $TOKEN" \
  -o "backup_downloaded.sql.gz" \
  -v
```

**Headers de resposta esperados:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="backup_20250101_120000.sql.gz"
Content-Length: 5242880
```

**Validar arquivo:**
```bash
# Verificar tamanho
ls -lh backup_downloaded.sql.gz

# Descompactar para validar
gunzip -t backup_downloaded.sql.gz

# Se tudo OK:
gunzip backup_downloaded.sql.gz
file backup_downloaded.sql
```

## 🔒 4. Testar Proteção contra Path Traversal

**Deve FALHAR com 400:**
```bash
curl -X GET "http://localhost:3333/api/v1/backup/download/$TENANT_ID/../../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Invalid backup file path"
}
```

## 🚫 5. Testar Falta de Permissão

**Criar usuário com role VIEWER (sem BACKUP_DOWNLOAD):**

```bash
# Login como viewer
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "34.028.316/0001-07",
    "email": "viewer@medmanager.com",
    "password": "Viewer@123"
  }'
```

**Tentar download sem permissão (deve FALHAR com 403):**
```bash
curl -X GET "http://localhost:3333/api/v1/backup/download/$TENANT_ID/backup.sql.gz" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

## 📁 6. Testar Arquivo Inexistente

**Deve FALHAR com 404:**
```bash
curl -X GET "http://localhost:3333/api/v1/backup/download/$TENANT_ID/backup_nao_existe.sql.gz" \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Backup file not found"
}
```

## 🧪 7. Testar Tenant Inválido

**Deve FALHAR com 404:**
```bash
curl -X GET "http://localhost:3333/api/v1/backup/download/tenant-inexistente/backup.sql.gz" \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Tenant not found"
}
```

## ✅ Checklist de Validação

- [ ] Download bem-sucedido retorna arquivo compactado válido
- [ ] Content-Type é `application/octet-stream`
- [ ] Content-Disposition inclui nome do arquivo
- [ ] Content-Length está correto
- [ ] Path traversal é bloqueado (400)
- [ ] Permissão BACKUP_DOWNLOAD é verificada (403 sem permissão)
- [ ] Arquivo inexistente retorna 404
- [ ] Tenant inexistente retorna 404
- [ ] Arquivo descompactado é um SQL válido
- [ ] Logs registram downloads com tenantId e filename

## 📊 Resultado

Se todos os testes passarem, o endpoint está pronto para **PRODUÇÃO** ✅

## 🔗 Próximos Passos

1. **Adicionar Encriptação de Backups** (AES-256-GCM)
2. **Implementar Guia 33 Service** (validação de prescrições)
3. **NF-e Real Signing** (integração SEFAZ)
4. **E2E Test Suite** (Vitest)
