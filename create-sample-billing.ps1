# PowerShell script to create sample billing accounts for testing

Write-Host "=== Creating Sample Billing Accounts ===" -ForegroundColor Cyan
Write-Host ""

$SUPERADMIN_EMAIL = "admin@farmaciademo.com.br"
$SUPERADMIN_PASSWORD = "admin123"
$LOGIN_URL = "http://localhost:3333/api/v1/auth/login"

# 1. Login
Write-Host "1. Authenticating superadmin..." -ForegroundColor Yellow

$loginBody = @{
    email = $SUPERADMIN_EMAIL
    password = $SUPERADMIN_PASSWORD
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $LOGIN_URL -Method Post -Body $loginBody -ContentType "application/json"
    $TOKEN = $response.data.tokens.accessToken
    Write-Host "OK: Authenticated" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to authenticate: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Get list of tenants
Write-Host "2. Fetching tenants list..." -ForegroundColor Yellow

try {
    $tenantsResponse = Invoke-RestMethod -Uri "http://localhost:3333/api/v1/superadmin/tenants?page=1&limit=100" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $tenants = $tenantsResponse.tenants
    Write-Host "OK: Found $($tenants.Count) tenants" -ForegroundColor Green
    
    foreach ($tenant in $tenants) {
        Write-Host "   - $($tenant.name) (ID: $($tenant.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR: Failed to fetch tenants: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Create billing accounts via direct database insertion (via API would require additional endpoint)
Write-Host "3. Billing accounts status:" -ForegroundColor Yellow
Write-Host "   Note: Billing accounts need to be created through the payment system" -ForegroundColor Cyan
Write-Host "   When tenants are charged via Asaas/payment gateway, they create:" -ForegroundColor Cyan
Write-Host "   - Payment records (for payment processing)" -ForegroundColor Cyan
Write-Host "   - BillingAccount records (for accounting tracking)" -ForegroundColor Cyan
Write-Host ""
Write-Host "   To create sample billing accounts, you can:" -ForegroundColor Gray
Write-Host "   1. Use the superadmin Charges page to create new charges" -ForegroundColor Gray
Write-Host "   2. Or seed the database directly with sample data" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Completed ===" -ForegroundColor Cyan
