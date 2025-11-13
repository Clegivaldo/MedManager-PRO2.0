#!/bin/bash

# Script de backup automatizado para PostgreSQL
# Suporta backup individual por tenant

set -e
set -u

# Configurações
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres123}
BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_RETENTION=${BACKUP_RETENTION:-30}

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Função para realizar backup de um banco
create_backup() {
    local database=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${database}_${timestamp}.sql.gz"
    
    echo "Creating backup for database: $database"
    
    # Realizar backup com pg_dump
    PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
        -h $POSTGRES_HOST \
        -U $POSTGRES_USER \
        -d $database \
        --clean \
        --if-exists \
        --create \
        --verbose \
        --no-owner \
        --no-privileges \
        --compress=6 \
        --file="$backup_file"
    
    if [ $? -eq 0 ]; then
        echo "Backup created successfully: $backup_file"
        
        # Criar arquivo de manifesto com informações do backup
        cat > "${backup_file}.manifest" <<EOF
{
    "database": "$database",
    "timestamp": "$timestamp",
    "created_at": "$(date -Iseconds)",
    "file_size": $(stat -c%s "$backup_file" 2>/dev/null || echo 0),
    "retention_days": $BACKUP_RETENTION
}
EOF
        
        return 0
    else
        echo "Error creating backup for database: $database"
        return 1
    fi
}

# Função para limpar backups antigos
cleanup_old_backups() {
    echo "Cleaning up old backups (older than $BACKUP_RETENTION days)"
    
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$BACKUP_RETENTION -delete
    find "$BACKUP_DIR" -name "*.manifest" -type f -mtime +$BACKUP_RETENTION -delete
    
    echo "Cleanup completed"
}

# Função para listar bancos de dados (excluindo templates)
list_databases() {
    PGPASSWORD=$POSTGRES_PASSWORD psql \
        -h $POSTGRES_HOST \
        -U $POSTGRES_USER \
        -t \
        -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template0', 'template1') ORDER BY datname;"
}

# Função principal
main() {
    echo "Starting backup process at $(date)"
    
    # Obter lista de bancos de dados
    databases=$(list_databases)
    
    if [ -z "$databases" ]; then
        echo "No databases found for backup"
        exit 0
    fi
    
    # Realizar backup para cada banco
    backup_count=0
    success_count=0
    
    while IFS= read -r database; do
        database=$(echo "$database" | xargs) # trim whitespace
        if [ ! -z "$database" ]; then
            ((backup_count++))
            if create_backup "$database"; then
                ((success_count++))
            fi
        fi
    done <<< "$databases"
    
    # Limpar backups antigos
    cleanup_old_backups
    
    echo "Backup process completed at $(date)"
    echo "Total databases: $backup_count, Successful: $success_count"
    
    # Verificar se algum backup falhou
    if [ $success_count -lt $backup_count ]; then
        echo "WARNING: Some backups failed"
        exit 1
    fi
    
    exit 0
}

# Executar função principal
main