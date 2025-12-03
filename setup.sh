#!/bin/bash

echo "========================================"
echo "MedManager-PRO2.0 - Setup Automatizado"
echo "========================================"
echo ""

echo "[1/7] Instalando dependências do frontend..."
npm install react-hook-form @hookform/resolvers react-input-mask recharts
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências do frontend"
    exit 1
fi

echo ""
echo "[2/7] Instalando dependências de tipos..."
npm install --save-dev @types/react-input-mask
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências de tipos"
    exit 1
fi

echo ""
echo "[3/7] Instalando multer para upload de arquivos..."
cd api
npm install multer
npm install --save-dev @types/multer
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar multer"
    exit 1
fi
cd ..

echo ""
echo "[4/7] Gerando cliente Prisma..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao gerar cliente Prisma"
    exit 1
fi

echo ""
echo "[5/7] Criando diretórios de upload..."
mkdir -p uploads/tenants
mkdir -p certificates
echo "Diretórios criados com sucesso!"

echo ""
echo "[6/7] Verificando arquivo .env..."
if [ ! -f ".env" ]; then
    echo "AVISO: Arquivo .env não encontrado!"
    echo "Por favor, crie o arquivo .env com a variável ENCRYPTION_KEY"
    echo "Execute: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo "Para gerar uma chave segura."
else
    if ! grep -q "ENCRYPTION_KEY" .env; then
        echo "AVISO: ENCRYPTION_KEY não encontrada no .env"
        echo "Adicione: ENCRYPTION_KEY=sua-chave-de-32-caracteres"
    else
        echo "ENCRYPTION_KEY encontrada no .env"
    fi
fi

echo ""
echo "[7/7] Executando migrations do Prisma..."
echo "IMPORTANTE: Certifique-se de que o schema.prisma foi atualizado!"
echo "Pressione Enter para continuar ou Ctrl+C para cancelar..."
read
npx prisma migrate dev --name add-tenant-settings
if [ $? -ne 0 ]; then
    echo "AVISO: Migration falhou. Verifique se o schema foi atualizado."
fi

echo ""
echo "========================================"
echo "Setup concluído!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "1. Verifique se as rotas foram registradas no app principal"
echo "2. Reinicie o servidor backend"
echo "3. Teste as páginas no frontend"
echo ""
