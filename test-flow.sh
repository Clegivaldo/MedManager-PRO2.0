#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3333/api/v1"

echo -e "${YELLOW}🔐 Testando fluxo de login completo${NC}"
echo ""

# 1. Login
echo -e "${YELLOW}1️⃣  Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "12345678000195",
    "email": "admin@farmaciademo.com.br",
    "password": "admin123"
  }')

# Extrair token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tokens', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Falha no login!${NC}"
  echo "Resposta: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login bem-sucedido!${NC}"
echo "Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 2. Decodificar JWT
echo -e "${YELLOW}2️⃣  Decodificando JWT...${NC}"
DECODED=$(echo $ACCESS_TOKEN | python3 -c "
import sys, json, base64
token = sys.stdin.read().strip()
parts = token.split('.')
if len(parts) == 3:
    payload_b64 = parts[1]
    padding = 4 - (len(payload_b64) % 4)
    if padding != 4:
        payload_b64 += '=' * padding
    decoded = base64.urlsafe_b64decode(payload_b64)
    payload = json.loads(decoded)
    print(json.dumps(payload, indent=2))
")

echo "$DECODED"
echo ""

# 3. Testar dashboard
echo -e "${YELLOW}3️⃣  Testando GET /api/v1/dashboard/metrics...${NC}"
DASH_RESPONSE=$(curl -s -X GET "${API_URL}/dashboard/metrics" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$DASH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DASH_RESPONSE"
echo ""

# 4. Verificar tenant
TENANT_ID=$(echo "$DECODED" | grep -o '"tenantId": "[^"]*"' | cut -d'"' -f4)
if [ -n "$TENANT_ID" ]; then
  echo -e "${GREEN}✅ Tenant ID encontrado no JWT: $TENANT_ID${NC}"
else
  echo -e "${RED}❌ Tenant ID NÃO encontrado no JWT${NC}"
fi
