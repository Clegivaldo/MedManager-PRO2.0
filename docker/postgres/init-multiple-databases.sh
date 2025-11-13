#!/bin/bash

# Script para criar múltiplos bancos de dados no PostgreSQL
# Baseado na variável de ambiente POSTGRES_MULTIPLE_DATABASES

set -e
set -u

function create_user_and_database() {
    local database=$1
    echo "Creating user and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE USER $database WITH PASSWORD '$database';
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi

# Criar schema de auditoria no banco master
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "medmanager_master" <<-EOSQL
    -- Habilitar extensões necessárias
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";
    
    -- Criar schema para multitenancy
    CREATE SCHEMA IF NOT EXISTS multitenancy;
    
    -- Tabela de controle de tenants
    CREATE TABLE IF NOT EXISTS multitenancy.tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(14) UNIQUE NOT NULL,
        database_name VARCHAR(100) NOT NULL,
        database_user VARCHAR(100) NOT NULL,
        database_password VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL DEFAULT 'starter',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
    );
    
    -- Tabela de planos e limites
    CREATE TABLE IF NOT EXISTS multitenancy.plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        max_users INTEGER NOT NULL,
        max_products INTEGER NOT NULL,
        max_monthly_transactions INTEGER NOT NULL,
        max_storage_gb INTEGER NOT NULL,
        max_api_calls_per_minute INTEGER NOT NULL,
        features JSONB DEFAULT '[]',
        price_monthly DECIMAL(10,2) NOT NULL,
        price_annual DECIMAL(10,2) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Tabela de auditoria global (cross-tenant)
    CREATE TABLE IF NOT EXISTS multitenancy.audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES multitenancy.tenants(id),
        user_id UUID,
        table_name VARCHAR(100) NOT NULL,
        record_id UUID,
        operation VARCHAR(20) NOT NULL,
        old_data JSONB,
        new_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON multitenancy.tenants(cnpj);
    CREATE INDEX IF NOT EXISTS idx_tenants_status ON multitenancy.tenants(status);
    CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON multitenancy.audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON multitenancy.audit_log(created_at);
    
    -- Inserir planos padrão
    INSERT INTO multitenancy.plans (name, max_users, max_products, max_monthly_transactions, max_storage_gb, max_api_calls_per_minute, features, price_monthly, price_annual) VALUES
    ('starter', 3, 1000, 500, 10, 100, '["basic_features", "email_support"]', 299.00, 2990.00),
    ('professional', 10, 10000, 5000, 50, 500, '["all_features", "priority_support", "api_access"]', 799.00, 7990.00),
    ('enterprise', NULL, NULL, NULL, 200, NULL, '["unlimited", "dedicated_support", "custom_features"]', 2499.00, 24990.00);
    
    -- Criar função para atualizar timestamp
    CREATE OR REPLACE FUNCTION multitenancy.update_updated_at_column()
    RETURNS TRIGGER AS \$\$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    \$\$ language 'plpgsql';
    
    -- Criar triggers para updated_at
    CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON multitenancy.tenants
        FOR EACH ROW EXECUTE FUNCTION multitenancy.update_updated_at_column();
EOSQL

echo "PostgreSQL initialization completed"