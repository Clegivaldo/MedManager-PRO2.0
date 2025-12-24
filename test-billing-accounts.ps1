# PowerShell script to test the billing accounts feature

Write-Host "=== Testing Billing Accounts Feature ===" -ForegroundColor Cyan
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
} catch {
    Write-Host "ERROR: Failed to authenticate superadmin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Test billing accounts listing
Write-Host "2. Testing billing accounts endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPERADMIN_URL/billing-accounts?page=1&limit=10" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    if ($response.accounts) {
        Write-Host "OK: Billing accounts retrieved" -ForegroundColor Green
        
        $totalPending = $response.stats.totalPending
        $totalPaid = $response.stats.totalPaid
        $totalOverdue = $response.stats.totalOverdue
        
        Write-Host "   Stats:" -ForegroundColor Gray
        Write-Host "   - Total Pending: R$ $totalPending" -ForegroundColor Yellow
        Write-Host "   - Total Paid: R$ $totalPaid" -ForegroundColor Green
        Write-Host "   - Total Overdue: R$ $totalOverdue" -ForegroundColor Red
        Write-Host "   - Average Days to Payment: $($response.stats.averageDaysToPayment) days" -ForegroundColor Cyan
        Write-Host ""
        
        $accountCount = $response.accounts.Count
        Write-Host "   Accounts showing: $accountCount" -ForegroundColor Gray
        
        if ($response.accounts -and $accountCount -gt 0) {
            Write-Host "   Sample accounts:" -ForegroundColor Gray
            foreach ($account in $response.accounts[0..2]) {
                Write-Host "   - $($account.tenantName) | R$ $($account.amount) | Status: $($account.status) | Due: $($account.dueDate)" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "   Payment by Month:" -ForegroundColor Gray
        if ($response.stats.paymentByMonth) {
            foreach ($month in $response.stats.paymentByMonth[0..2]) {
                Write-Host "   - $($month.month): R$ $($month.amount) ($($month.count) contas)" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "   Payment by Tenant:" -ForegroundColor Gray
        if ($response.stats.paymentByTenant) {
            foreach ($tenant in $response.stats.paymentByTenant[0..2]) {
                Write-Host "   - $($tenant.tenantName): Pend: R$ $($tenant.pending) | Paid: R$ $($tenant.paid)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "INFO: No billing accounts found yet" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ERROR: Failed to retrieve billing accounts: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Completed ===" -ForegroundColor Cyan
