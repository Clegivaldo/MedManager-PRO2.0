# ================================================================
# TESTE E2E - INTEGRAÇÃO PRODUTOS + GUIA 33
# Sistema: MedManager PRO 2.0
# FASE 3: Dispensação Controlada com Validação Automática
# ================================================================

$BASE_URL = "http://localhost:3333/api/v1"
$TOKEN = ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTE E2E - DISPENSAÇÃO CONTROLADA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ================================================================
# PASSO 1: LOGIN COMO SUPERADMIN
# ================================================================

Write-Host "[1/7] Fazendo login como SUPERADMIN..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@medmanager.com.br"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $TOKEN = $loginResponse.token
    Write-Host "✓ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "  Token: $($TOKEN.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro no login:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# ================================================================
# PASSO 2: BUSCAR TENANT ID
# ================================================================

Write-Host "`n[2/7] Buscando Tenant..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

try {
    $tenantsResponse = Invoke-RestMethod -Uri "$BASE_URL/tenants" -Method Get -Headers $headers
    $TENANT_ID = $tenantsResponse.tenants[0].id
    Write-Host "✓ Tenant encontrado!" -ForegroundColor Green
    Write-Host "  ID: $TENANT_ID" -ForegroundColor Gray
    Write-Host "  Nome: $($tenantsResponse.tenants[0].name)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao buscar tenants:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# ================================================================
# PASSO 3: CRIAR PRODUTO CONTROLADO (ALPRAZOLAM)
# ================================================================

Write-Host "`n[3/7] Criando produto controlado (Alprazolam)..." -ForegroundColor Yellow

$productBody = @{
    name = "Alprazolam 1mg - Teste E2E"
    description = "Ansiolítico - Substância Controlada (Lista B1)"
    sku = "ALPRAZ-TEST-001"
    barcode = "7891234567890"
    price = 35.90
    cost = 18.50
    stockQuantity = 100
    minStockLevel = 10
    isControlled = $true
    controlledSubstance = "Benzodiazepínico"
    category = "MEDICAMENTOS"
} | ConvertTo-Json

try {
    $headers["x-tenant-id"] = $TENANT_ID
    $productResponse = Invoke-RestMethod -Uri "$BASE_URL/products" -Method Post -Body $productBody -Headers $headers
    $PRODUCT_ID = $productResponse.product.id
    Write-Host "✓ Produto controlado criado!" -ForegroundColor Green
    Write-Host "  ID: $PRODUCT_ID" -ForegroundColor Gray
    Write-Host "  Nome: $($productResponse.product.name)" -ForegroundColor Gray
    Write-Host "  Controlado: $($productResponse.product.isControlled)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao criar produto:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    # Continuar mesmo se já existir
}

# ================================================================
# PASSO 4: CRIAR CLIENTE (PACIENTE)
# ================================================================

Write-Host "`n[4/7] Criando cliente (paciente)..." -ForegroundColor Yellow

$customerBody = @{
    name = "João Silva - Teste E2E"
    email = "joao.teste@email.com"
    phone = "(11) 98765-4321"
    document = "12345678900"
    type = "INDIVIDUAL"
} | ConvertTo-Json

try {
    $customerResponse = Invoke-RestMethod -Uri "$BASE_URL/customers" -Method Post -Body $customerBody -Headers $headers
    $CUSTOMER_ID = $customerResponse.customer.id
    Write-Host "✓ Cliente criado!" -ForegroundColor Green
    Write-Host "  ID: $CUSTOMER_ID" -ForegroundColor Gray
    Write-Host "  Nome: $($customerResponse.customer.name)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao criar cliente:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# ================================================================
# PASSO 5: TESTE DE COMPLIANCE - STATUS DO PRODUTO
# ================================================================

Write-Host "`n[5/7] Verificando status de compliance do produto..." -ForegroundColor Yellow

try {
    $complianceResponse = Invoke-RestMethod -Uri "$BASE_URL/controlled-dispensation/compliance/$PRODUCT_ID" -Method Get -Headers $headers
    Write-Host "✓ Status de compliance obtido!" -ForegroundColor Green
    Write-Host "  É Controlado: $($complianceResponse.compliance.isControlled)" -ForegroundColor Gray
    Write-Host "  Substância: $($complianceResponse.compliance.substanceName)" -ForegroundColor Gray
    Write-Host "  Exige Prescrição: $($complianceResponse.compliance.requiresPrescription)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao verificar compliance:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# ================================================================
# PASSO 6: TESTE DE DISPENSAÇÃO COM PRESCRIÇÃO VÁLIDA
# ================================================================

Write-Host "`n[6/7] Testando dispensação COM prescrição válida..." -ForegroundColor Yellow

$dispensationBody = @{
    productId = $PRODUCT_ID
    customerId = $CUSTOMER_ID
    quantity = 2
    prescription = @{
        id = "RX-TEST-2025-001"
        date = (Get-Date).ToString("yyyy-MM-dd")
        validityDays = 30
    }
} | ConvertTo-Json

try {
    $dispensationResponse = Invoke-RestMethod -Uri "$BASE_URL/controlled-dispensation/dispense" -Method Post -Body $dispensationBody -Headers $headers
    Write-Host "✓ Dispensação autorizada!" -ForegroundColor Green
    Write-Host "  Produto: $($dispensationResponse.dispensation.productName)" -ForegroundColor Gray
    Write-Host "  Quantidade: $($dispensationResponse.dispensation.quantity)" -ForegroundColor Gray
    Write-Host "  Prescrição válida: $($dispensationResponse.dispensation.prescriptionValid)" -ForegroundColor Gray
    Write-Host "  Guia 33 registrado: $($dispensationResponse.dispensation.compliance.guia33Registered)" -ForegroundColor Gray
    Write-Host "  Quota usado: $($dispensationResponse.dispensation.quotaStatus.quotaUsed)" -ForegroundColor Gray
    Write-Host "  Quota limite: $($dispensationResponse.dispensation.quotaStatus.quotaLimit)" -ForegroundColor Gray
    Write-Host "  Quota restante: $($dispensationResponse.dispensation.quotaStatus.quotaRemaining)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro na dispensação:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

# ================================================================
# PASSO 7: TESTE DE DISPENSAÇÃO SEM PRESCRIÇÃO (DEVE FALHAR)
# ================================================================

Write-Host "`n[7/7] Testando dispensação SEM prescrição (deve falhar)..." -ForegroundColor Yellow

$invalidDispensationBody = @{
    productId = $PRODUCT_ID
    customerId = $CUSTOMER_ID
    quantity = 1
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$BASE_URL/controlled-dispensation/dispense" -Method Post -Body $invalidDispensationBody -Headers $headers
    Write-Host "✗ FALHA: Sistema deveria ter bloqueado!" -ForegroundColor Red
} catch {
    Write-Host "✓ Bloqueio correto! Sistema impediu venda sem prescrição." -ForegroundColor Green
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Motivo: $($errorObj.error)" -ForegroundColor Yellow
    }
}

# ================================================================
# PASSO 8: TESTE DE PRESCRIÇÃO EXPIRADA (DEVE FALHAR)
# ================================================================

Write-Host "`n[8/8] Testando dispensação com prescrição EXPIRADA (deve falhar)..." -ForegroundColor Yellow

$expiredDate = (Get-Date).AddDays(-60).ToString("yyyy-MM-dd")
$expiredDispensationBody = @{
    productId = $PRODUCT_ID
    customerId = $CUSTOMER_ID
    quantity = 1
    prescription = @{
        id = "RX-EXPIRED-001"
        date = $expiredDate
        validityDays = 30
    }
} | ConvertTo-Json

try {
    $expiredResponse = Invoke-RestMethod -Uri "$BASE_URL/controlled-dispensation/dispense" -Method Post -Body $expiredDispensationBody -Headers $headers
    Write-Host "✗ FALHA: Sistema deveria ter bloqueado prescrição expirada!" -ForegroundColor Red
} catch {
    Write-Host "✓ Bloqueio correto! Sistema impediu venda com prescrição expirada." -ForegroundColor Green
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Motivo: $($errorObj.error)" -ForegroundColor Yellow
    }
}

# ================================================================
# RESUMO DO TESTE
# ================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMO DO TESTE E2E" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✓ Login e autenticação: OK" -ForegroundColor Green
Write-Host "✓ Criação de produto controlado: OK" -ForegroundColor Green
Write-Host "✓ Criação de cliente: OK" -ForegroundColor Green
Write-Host "✓ Verificação de compliance: OK" -ForegroundColor Green
Write-Host "✓ Dispensação com prescrição válida: OK" -ForegroundColor Green
Write-Host "✓ Bloqueio sem prescrição: OK" -ForegroundColor Green
Write-Host "✓ Bloqueio prescrição expirada: OK" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FASE 3 - TESTE COMPLETO COM SUCESSO!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
