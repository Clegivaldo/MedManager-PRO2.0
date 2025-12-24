#!/bin/bash
# Script de setup para emissão de NF-e
# Execução: bash setup-nfe.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 Setup de Emissão de NF-e - MedManager PRO 2.0        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar variáveis de ambiente
echo "📋 Verificando variáveis de ambiente..."
echo ""

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ ERRO: ENCRYPTION_KEY não está configurada"
    echo "   Adicione ao .env: ENCRYPTION_KEY=sua-chave-256-bits-base64"
    exit 1
fi
echo "✅ ENCRYPTION_KEY configurada"

if [ -z "$CERTIFICATE_ENCRYPTION_KEY" ]; then
    echo "❌ ERRO: CERTIFICATE_ENCRYPTION_KEY não está configurada"
    echo "   Adicione ao .env: CERTIFICATE_ENCRYPTION_KEY=sua-chave-256-bits-base64"
    exit 1
fi
echo "✅ CERTIFICATE_ENCRYPTION_KEY configurada"

echo ""
echo "📦 Verificando dependências..."
echo ""

# 2. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi
echo "✅ Node.js instalado: $(node -v)"

# 3. Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm não está instalado"
    echo "   Instale com: npm install -g pnpm"
    exit 1
fi
echo "✅ pnpm instalado: $(pnpm -v)"

# 4. Ir para pasta API
echo ""
echo "📂 Entrando na pasta api..."
cd api

# 5. Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    pnpm install
else
    echo "✅ Dependências já instaladas"
fi

echo ""
echo "🔐 Criptografando senhas de certificado existentes..."
echo ""

# 6. Executar script de criptografia
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts

echo ""
echo "🧪 Testando emissão de NF-e..."
echo ""

# 7. Executar teste
if [ -z "$TEST_TENANT_ID" ]; then
    export TEST_TENANT_ID="e9675bde-126b-429a-a150-533e055e7cc0"
    echo "📌 Usando tenant padrão: $TEST_TENANT_ID"
fi

pnpm ts-node src/scripts/test-nfe-emission.ts

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ Setup concluído com sucesso!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Próximos passos:"
echo "   1. Revisar: GUIA_RAPIDO_NFE.md"
echo "   2. Detalhes: NFE_EMISSAO_SEGURA.md"
echo "   3. Checklist: CHECKLIST_NFE_EMISSAO.md"
echo ""
echo "🚀 Para emitir NF-e via API:"
echo "   POST /api/v1/invoices/{id}/emit"
echo "   Authorization: Bearer {token}"
echo ""
