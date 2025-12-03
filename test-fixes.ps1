# PowerShell script to test the three main fixes

Write-Host "=== Teste de Três Correções Principais ===" -ForegroundColor Cyan
Write-Host ""

$SUPERADMIN_EMAIL = "admin@farmaciademo.com"
$SUPERADMIN_PASSWORD = "admin123"
$LOGIN_URL = "http://localhost:3000/api/v1/auth/login"
$SUPERADMIN_URL = "http://localhost:3000/api/v1/superadmin"

# 1. Login as superadmin
Write-Host "1. Autenticando superadmin..." -ForegroundColor Yellow

$loginBody = @{
    email = $SUPERADMIN_EMAIL
    password = $SUPERADMIN_PASSWORD
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $LOGIN_URL -Method Post -Body $loginBody -ContentType "application/json"
    $TOKEN = $response.data.accessToken
    Write-Host "✅ Superadmin autenticado" -ForegroundColor Green
    Write-Host "   Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao autenticar superadmin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check payment configuration
Write-Host "2. Verificando configuração de gateways de pagamento..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/payment-providers" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $activeGateway = $response.data.activeGateway
    $asaasKey = $response.data.asaasApiKeyMasked
    
    if ($asaasKey -and $asaasKey -ne "Não configurado") {
        Write-Host "✅ Configuração de pagamento encontrada" -ForegroundColor Green
        Write-Host "   Gateway Ativo: $activeGateway" -ForegroundColor Gray
        Write-Host "   Asaas Key: $asaasKey" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Nenhuma configuração de pagamento salva (esperado na primeira execução)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao verificar configuração: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Test tenant listing
Write-Host "3. Testando listagem de tenants..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/tenants?page=1&limit=10" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $totalTenants = $response.pagination.total
    $tenantCount = $response.tenants.Count
    
    if ($totalTenants -gt 0 -or $tenantCount -gt 0) {
        Write-Host "✅ Tenants encontrados: $totalTenants total" -ForegroundColor Green
        Write-Host "   Exibindo na página 1: $tenantCount tenants" -ForegroundColor Gray
        if ($response.tenants) {
            foreach ($tenant in $response.tenants[0..1]) {
                Write-Host "   - $($tenant.name) (ID: $($tenant.id))" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "❌ Nenhum tenant encontrado!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao listar tenants: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. Test charges listing
Write-Host "4. Testando listagem de cobranças..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/charges?page=1&limit=10" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $totalCharges = $response.pagination.total
    $chargeCount = $response.charges.Count
    
    if ($totalCharges -gt 0 -or $chargeCount -gt 0) {
        Write-Host "✅ Cobranças encontradas: $totalCharges total" -ForegroundColor Green
        Write-Host "   Exibindo na página 1: $chargeCount cobranças" -ForegroundColor Gray
        if ($response.charges) {
            foreach ($charge in $response.charges[0..2]) {
                Write-Host "   - ID: $($charge.chargeId) | Valor: $($charge.amount) | Status: $($charge.status)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "ℹ️  Nenhuma cobrança encontrada (esperado se nenhuma foi criada)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erro ao listar cobranças: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Testes Concluidos ===" -ForegroundColor Cyan
