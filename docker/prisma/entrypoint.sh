#!/bin/sh

# Script de entrada para container Prisma
set -e

echo "Starting Prisma migrations..."

# Aguardar PostgreSQL ficar disponível
echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Executar migrações
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Gerar cliente Prisma
echo "Generating Prisma client..."
npx prisma generate

echo "Prisma setup completed!"

# Manter container ativo se necessário
if [ "$1" = "keep-alive" ]; then
    tail -f /dev/null
fi