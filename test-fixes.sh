#!/usr/bin/env bash
# Script para testar as três correções principais

echo "=== Teste de Três Correções Principais ==="
echo ""

SUPERADMIN_EMAIL="admin@farmaciademo.com"
SUPERADMIN_PASSWORD="admin123"
LOGIN_URL="http://localhost:3000/api/v1/auth/login"
SUPERADMIN_URL="http://localhost:3000/api/v1/superadmin"

# 1. Fazer login como superadmin
echo "1. Autenticando superadmin..."
TOKEN=$(curl -s -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$SUPERADMIN_EMAIL\", \"password\": \"$SUPERADMIN_PASSWORD\"}" | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Erro ao autenticar superadmin"
  exit 1
fi
echo "✅ Superadmin autenticado: $TOKEN"
echo ""

# 2. Verificar se configuração de pagamento foi salva (Payment Providers)
echo "2. Verificando configuração de gateways de pagamento..."
PAYMENT_CONFIG=$(curl -s -X GET "$SUPERADMIN_URL/payment-providers" \
  -H "Authorization: Bearer $TOKEN")

ACTIVE_GATEWAY=$(echo $PAYMENT_CONFIG | jq -r '.data.activeGateway')
ASAAS_KEY=$(echo $PAYMENT_CONFIG | jq -r '.data.asaasApiKeyMasked')

if [ "$ASAAS_KEY" != "null" ] && [ "$ASAAS_KEY" != "Não configurado" ]; then
  echo "✅ Configuração de pagamento encontrada (Asaas Key: $ASAAS_KEY)"
else
  echo "⚠️  Nenhuma configuração de pagamento salva (esperado na primeira execução)"
fi
echo ""

# 3. Testar listagem de tenants
echo "3. Testando listagem de tenants..."
TENANTS=$(curl -s -X GET "$SUPERADMIN_URL/tenants?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_TENANTS=$(echo $TENANTS | jq -r '.pagination.total')
TENANT_COUNT=$(echo $TENANTS | jq -r '.tenants | length')

if [ "$TOTAL_TENANTS" != "null" ] && [ "$TENANT_COUNT" -gt 0 ]; then
  echo "✅ Tenants encontrados: $TOTAL_TENANTS total, $TENANT_COUNT na página 1"
  echo "   Primeiros tenants:"
  echo $TENANTS | jq -r '.tenants[0:2] | .[] | "   - \(.name) (ID: \(.id))"'
else
  echo "❌ Nenhum tenant encontrado (problema!)"
fi
echo ""

# 4. Testar listagem de cobranças
echo "4. Testando listagem de cobranças..."
CHARGES=$(curl -s -X GET "$SUPERADMIN_URL/charges?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_CHARGES=$(echo $CHARGES | jq -r '.pagination.total')
CHARGE_COUNT=$(echo $CHARGES | jq -r '.charges | length')

if [ "$TOTAL_CHARGES" != "null" ] && [ "$TOTAL_CHARGES" -gt 0 ]; then
  echo "✅ Cobranças encontradas: $TOTAL_CHARGES total, $CHARGE_COUNT na página 1"
  echo "   Primeiras cobranças:"
  echo $CHARGES | jq -r '.charges[0:3] | .[] | "   - ID: \(.chargeId) | Valor: \(.amount) | Status: \(.status)"'
else
  echo "ℹ️  Nenhuma cobrança encontrada (esperado se nenhuma foi criada)"
fi
echo ""

echo "=== Testes Concluídos ==="
