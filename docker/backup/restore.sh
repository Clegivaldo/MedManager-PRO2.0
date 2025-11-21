#!/bin/bash
#
# Script de Restore do PostgreSQL para MedManager PRO
# 
# Uso:
#   ./restore.sh <arquivo_backup.sql.gz>
#   ./restore.sh <arquivo_backup.sql.gz> <nome_banco_destino>
#
# Exemplo:
#   ./restore.sh /backups/medmanager_backup_20251120_020000.sql.gz
#

set -euo pipefail

# ==========================================
# CONFIGURAÇÕES
# ==========================================

POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
PGPASSWORD="$POSTGRES_PASSWORD"
export PGPASSWORD

# ==========================================
# FUNÇÕES
# ==========================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

usage() {
    cat << EOF
Uso: $0 <arquivo_backup.sql.gz> [nome_banco_destino]

Exemplos:
  $0 /backups/medmanager_backup_20251120.sql.gz
  $0 /backups/tenant_12345678000195_20251120.sql.gz tenant_restored

Opções:
  arquivo_backup.sql.gz    Caminho para o arquivo de backup compactado
  nome_banco_destino       (Opcional) Nome do banco de destino para restore

ATENÇÃO: Este script irá SOBRESCREVER o banco de dados de destino!
EOF
    exit 1
}

confirm() {
    local prompt="$1"
    read -p "$prompt (digite 'yes' para confirmar): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Operação cancelada pelo usuário"
        exit 0
    fi
}

# ==========================================
# VALIDAÇÕES
# ==========================================

if [ $# -lt 1 ]; then
    usage
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-}"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "Arquivo de backup não encontrado: $BACKUP_FILE"
fi

# Verificar se arquivo está compactado
if [[ ! "$BACKUP_FILE" =~ \.gz$ ]]; then
    error "O arquivo deve estar compactado (.gz)"
fi

# Verificar integridade do arquivo
log "Verificando integridade do arquivo..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    error "Arquivo de backup está corrompido ou não é um arquivo gzip válido"
fi

log "✓ Arquivo válido"

# ==========================================
# CONFIRMAÇÃO
# ==========================================

log "=== RESTORE DO POSTGRESQL ==="
log "Arquivo: $BACKUP_FILE"
log "Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"

if [ -n "$TARGET_DB" ]; then
    log "Banco destino: $TARGET_DB"
    confirm "⚠️  ATENÇÃO: Todos os dados do banco '$TARGET_DB' serão SUBSTITUÍDOS!"
else
    log "Banco destino: TODOS (pg_dumpall)"
    confirm "⚠️  ATENÇÃO: TODOS os bancos de dados serão SUBSTITUÍDOS!"
fi

# ==========================================
# RESTORE
# ==========================================

log "Iniciando restore..."

if [ -n "$TARGET_DB" ]; then
    # Restore de banco específico
    log "Descompactando e restaurando banco '$TARGET_DB'..."
    
    # Dropar e recriar banco (se existir)
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $TARGET_DB;" postgres || true
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "CREATE DATABASE $TARGET_DB;" postgres
    
    # Restaurar backup
    gunzip -c "$BACKUP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TARGET_DB"
    
else
    # Restore completo (pg_dumpall)
    log "Descompactando e restaurando todos os bancos..."
    
    # CUIDADO: Isso vai sobrescrever TUDO
    gunzip -c "$BACKUP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" postgres
fi

if [ $? -eq 0 ]; then
    log "✓ Restore concluído com sucesso!"
    
    # Verificar bancos disponíveis
    log ""
    log "Bancos de dados disponíveis:"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "\l" postgres | grep -E "^\s\w"
    
else
    error "Falha durante o restore"
fi

# ==========================================
# PÓS-RESTORE
# ==========================================

log ""
log "=== Restore concluído ==="
log ""
log "Próximos passos recomendados:"
log "1. Verificar integridade dos dados"
log "2. Testar acesso à aplicação"
log "3. Verificar logs para erros"

if [ -n "$TARGET_DB" ]; then
    log "4. Executar migrations se necessário:"
    log "   docker compose exec backend npx prisma migrate deploy"
fi

exit 0
