#!/bin/bash
# Script para testar o middleware de validação de módulos

BASE_URL="http://localhost:3333/api/v1"
TENANT_ID="e9675bde-126b-429a-a150-533e055e7cc0"
TOKEN="your_token_here"

# Função para testar um endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local module=$4
    
    echo ""
    echo "=========================================="
    echo "Testing: $method $endpoint"
    echo "Module: $module"
    echo "=========================================="
    
    if [ -z "$data" ]; then
        curl -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -v
    else
        curl -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -v
    fi
}

# Teste dos endpoints
echo "Testing Warehouse endpoint (WAREHOUSE module - NOT enabled)"
test_endpoint "GET" "/warehouses" "" "WAREHOUSE"

echo ""
echo "Testing Quotes endpoint (QUOTES module - NOT enabled)"
test_endpoint "GET" "/quotes" "" "QUOTES"

echo ""
echo "Testing Orders endpoint (ORDERS module - NOT enabled)"
test_endpoint "GET" "/orders" "" "ORDERS"

echo ""
echo "Testing Products endpoint (PRODUCTS module - ENABLED)"
test_endpoint "GET" "/products" "" "PRODUCTS"
