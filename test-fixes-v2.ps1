# PowerShell script to test the three main fixes
Write-Host "=== Testing Three Main Fixes ===" -ForegroundColor Cyan
Write-Host ""

$SUPERADMIN_EMAIL = "admin@farmaciademo.com.br"
$SUPERADMIN_PASSWORD = "admin123"
$LOGIN_URL = "http://localhost:3333/api/v1/auth/login"
$SUPERADMIN_URL = "http://localhost:3333/api/v1/superadmin"

# 1. Login as superadmin
Write-Host "1. Authenticating superadmin..." -ForegroundColor Yellow

$loginBody = @{
    email = $SUPERADMIN_EMAIL
    password = $SUPERADMIN_PASSWORD
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $LOGIN_URL -Method Post -Body $loginBody -ContentType "application/json"
    $TOKEN = $response.data.tokens.accessToken
    Write-Host "OK: Superadmin authenticated" -ForegroundColor Green
    Write-Host "   Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Failed to authenticate superadmin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check payment configuration
Write-Host "2. Checking payment gateway configuration..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/payment-providers" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $activeGateway = $response.data.activeGateway
    $asaasKey = $response.data.asaasApiKeyMasked
    
    if ($asaasKey -and $asaasKey -ne "Nao configurado") {
        Write-Host "OK: Payment configuration found" -ForegroundColor Green
        Write-Host "   Active Gateway: $activeGateway" -ForegroundColor Gray
        Write-Host "   Asaas Key (masked): $asaasKey" -ForegroundColor Gray
    } else {
        Write-Host "WARNING: No payment configuration saved (expected on first run)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Failed to check configuration: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Test tenant listing
Write-Host "3. Testing tenant listing..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/tenants?page=1&limit=10" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $totalTenants = $response.pagination.total
    $tenantCount = $response.tenants.Count
    
    if ($totalTenants -gt 0 -or $tenantCount -gt 0) {
        Write-Host "OK: Tenants found: $totalTenants total" -ForegroundColor Green
        Write-Host "   Showing on page 1: $tenantCount tenants" -ForegroundColor Gray
        if ($response.tenants) {
            foreach ($tenant in $response.tenants[0..1]) {
                Write-Host "   - $($tenant.name) (ID: $($tenant.id))" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "ERROR: No tenants found!" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Failed to list tenants: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. Test charges listing
Write-Host "4. Testing charges listing..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/charges?page=1&limit=10" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $totalCharges = $response.pagination.total
    $chargeCount = $response.charges.Count
    
    if ($totalCharges -gt 0 -or $chargeCount -gt 0) {
        Write-Host "OK: Charges found: $totalCharges total" -ForegroundColor Green
        Write-Host "   Showing on page 1: $chargeCount charges" -ForegroundColor Gray
        if ($response.charges) {
            foreach ($charge in $response.charges[0..2]) {
                Write-Host "   - ID: $($charge.chargeId) | Amount: R$ $($charge.amount) | Status: $($charge.status)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "INFO: No charges found (expected if none were created)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ERROR: Failed to list charges: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests Completed ===" -ForegroundColor Cyan
