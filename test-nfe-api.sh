#!/bin/bash

# Script para testar emissão de NFe completa

TENANT_ID="e9675bde-126b-429a-a150-533e055e7cc0"
API_URL="http://localhost:3333/api/v1"

echo "🧪 Iniciando teste de emissão de NFe..."
echo ""

# Teste 1: Fazer login
echo "1️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@farmaciademo.com.br",
    "password": "Abc@1234"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  echo $LOGIN_RESPONSE
  exit 1
fi
echo "✅ Login realizado: Token obtido"
echo ""

# Teste 2: Criar cliente de teste
echo "2️⃣ Criando cliente de teste..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente NFe Teste",
    "email": "cliente@teste.com.br",
    "phone": "11999999999",
    "cpfCnpj": "07434011000175",
    "address": {
      "street": "Rua Teste",
      "number": "123",
      "district": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310100"
    }
  }')

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$CUSTOMER_ID" ]; then
  echo "⚠️  Aviso ao criar cliente (pode já existir)"
  CUSTOMER_ID="test-customer-$(date +%s)"
else
  echo "✅ Cliente criado: $CUSTOMER_ID"
fi
echo ""

# Teste 3: Criar fatura de teste
echo "3️⃣ Criando fatura de teste..."
INVOICE_RESPONSE=$(curl -s -X POST "$API_URL/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'"$CUSTOMER_ID"'",
    "items": [
      {
        "productId": "test-product-001",
        "productName": "Produto Teste NFe",
        "quantity": 1,
        "unitPrice": 100.00,
        "total": 100.00
      }
    ],
    "paymentMethod": "DINHEIRO"
  }')

INVOICE_ID=$(echo $INVOICE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$INVOICE_ID" ]; then
  echo "❌ Erro ao criar fatura"
  echo $INVOICE_RESPONSE
  exit 1
fi
echo "✅ Fatura criada: $INVOICE_ID"
echo ""

# Teste 4: Emitir NFe
echo "4️⃣ Emitindo NFe em homologação..."
NFE_RESPONSE=$(curl -s -X POST "$API_URL/fiscal/nfe/emit/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📋 Resposta da Sefaz:"
echo $NFE_RESPONSE | jq '.' 2>/dev/null || echo $NFE_RESPONSE
echo ""

# Verificar resultado
if echo $NFE_RESPONSE | grep -q '"success":true\|"status":"authorized"'; then
  echo "✅ NFe emitida com sucesso!"
  echo ""
  echo "📊 Detalhes:"
  echo $NFE_RESPONSE | jq '.nfeNumber, .accessKey, .protocol, .status' 2>/dev/null || true
else
  echo "❌ Erro na emissão de NFe"
  exit 1
fi
