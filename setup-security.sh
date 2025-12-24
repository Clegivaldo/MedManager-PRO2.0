#!/bin/bash

# ============================================
# COMANDOS RÁPIDOS - MELHORIAS DE SEGURANÇA
# ============================================
# Execute estes comandos na ordem apresentada
# ============================================

echo "🔒 Iniciando configuração de segurança..."
echo ""

# ============================================
# 1. INSTALAR DEPENDÊNCIAS
# ============================================
echo "📦 1/5 - Instalando dependências..."
cd api
npm install cookie-parser express-validator
npm install --save-dev @types/cookie-parser
echo "✅ Dependências instaladas"
echo ""

# ============================================
# 2. GERAR SECRETS
# ============================================
echo "🔑 2/5 - Gerando secrets seguros..."
echo ""
echo "Cole estes valores no seu arquivo .env.production:"
echo "=================================================="
echo ""
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "=================================================="
echo ""
read -p "Pressione ENTER após copiar os valores acima..."

# ============================================
# 3. CONFIGURAR .ENV
# ============================================
echo "⚙️  3/5 - Configurando ambiente..."
cd ..
if [ ! -f .env.production ]; then
    cp .env.production.template .env.production
    echo "✅ Arquivo .env.production criado"
    echo "⚠️  EDITE .env.production com os valores gerados acima!"
    read -p "Pressione ENTER após editar .env.production..."
else
    echo "⚠️  .env.production já existe"
fi
echo ""

# ============================================
# 4. BACKUP DO BANCO (OPCIONAL)
# ============================================
echo "💾 4/5 - Backup do banco de dados..."
read -p "Deseja fazer backup do banco? (s/n): " backup
if [ "$backup" = "s" ]; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Executando backup para $BACKUP_FILE..."
    # Ajuste a connection string conforme necessário
    pg_dump $DATABASE_URL > $BACKUP_FILE
    echo "✅ Backup salvo em $BACKUP_FILE"
else
    echo "⏭️  Backup pulado"
fi
echo ""

# ============================================
# 5. BUILD E TESTES
# ============================================
echo "🏗️  5/5 - Build e validação..."
cd api
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso"
else
    echo "❌ Erro no build"
    exit 1
fi
echo ""

# ============================================
# PRÓXIMOS PASSOS
# ============================================
echo "============================================"
echo "✅ CONFIGURAÇÃO INICIAL CONCLUÍDA!"
echo "============================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Executar migração de senhas:"
echo "   cd api"
echo "   npx ts-node src/scripts/migrate-encrypt-passwords.ts"
echo ""
echo "2. Deploy com Docker:"
echo "   cd .."
echo "   docker-compose --env-file .env.production up -d --build"
echo ""
echo "3. Verificar health:"
echo "   curl http://localhost:3333/health"
echo ""
echo "4. Consulte DEPLOY_SECURITY.md para detalhes completos"
echo ""
echo "============================================"
echo "⚠️  IMPORTANTE:"
echo "- NUNCA commite .env.production no Git"
echo "- Guarde backup das chaves em local seguro"
echo "- Rotacione chaves a cada 90 dias"
echo "============================================"
