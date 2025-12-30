# 🧪 SUITE DE TESTES - MedManager PRO 2.0
# Script de teste completo para validar todas as funcionalidades

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MEDMANAGER PRO 2.0 - TESTE COMPLETO  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3333/api/v1"
$results = @()

# Função auxiliar para fazer requisições
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    Write-Host "[ TESTANDO ] $Name..." -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host " ✅ PASSOU" -ForegroundColor Green
        return @{ success = $true; name = $Name; response = $response }
    }
    catch {
        Write-Host " ❌ FALHOU" -ForegroundColor Red
        Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
        return @{ success = $false; name = $Name; error = $_.Exception.Message }
    }
}

Write-Host "=== FASE 1: HEALTH CHECK ===" -ForegroundColor Yellow
Write-Host ""

# 1. Health check
$result = Test-Endpoint -Name "Health Check" -Method "GET" -Url "$baseUrl/../health"
$results += $result

Write-Host ""
Write-Host "=== FASE 2: AUTENTICAÇÃO ===" -ForegroundColor Yellow
Write-Host ""

# 2. Login SuperAdmin
$loginBody = @{
    email = "admin@medmanager.com"
    password = "admin123"
}
$loginResult = Test-Endpoint -Name "Login SuperAdmin" -Method "POST" -Url "$baseUrl/auth/login" -Body $loginBody
$results += $loginResult

if ($loginResult.success) {
    $token = $loginResult.response.accessToken
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host ""
    Write-Host "=== FASE 3: GESTÃO DE TENANTS ===" -ForegroundColor Yellow
    Write-Host ""
    
    # 3. Listar Tenants
    $result = Test-Endpoint -Name "Listar Tenants" -Method "GET" -Url "$baseUrl/superadmin/tenants?page=1&limit=10" -Headers $headers
    $results += $result
    
    # 4. Criar Tenant (Teste)
    $newTenant = @{
        name = "Farmácia Teste Automático"
        cnpj = "12345678000195"
        plan = "starter"
    }
    $result = Test-Endpoint -Name "Criar Tenant" -Method "POST" -Url "$baseUrl/superadmin/tenants" -Headers $headers -Body $newTenant
    $results += $result
    
    if ($result.success) {
        $tenantId = $result.response.tenant.id
        
        # 5. Obter detalhes do tenant
        $result = Test-Endpoint -Name "Detalhes do Tenant" -Method "GET" -Url "$baseUrl/superadmin/tenants/$tenantId" -Headers $headers
        $results += $result
        
        Write-Host ""
        Write-Host "=== FASE 4: GESTÃO DE PLANOS ===" -ForegroundColor Yellow
        Write-Host ""
        
        # 6. Listar Planos
        $result = Test-Endpoint -Name "Listar Planos" -Method "GET" -Url "$baseUrl/superadmin/plans" -Headers $headers
        $results += $result
        
        Write-Host ""
        Write-Host "=== FASE 5: GESTÃO DE MÓDULOS ===" -ForegroundColor Yellow
        Write-Host ""
        
        # 7. Listar Módulos do Tenant
        $result = Test-Endpoint -Name "Listar Módulos" -Method "GET" -Url "$baseUrl/superadmin/modules/$tenantId" -Headers $headers
        $results += $result
        
        # 8. Habilitar Módulo
        $moduleBody = @{
            modules = @("DASHBOARD", "PRODUCTS", "INVENTORY")
        }
        $result = Test-Endpoint -Name "Habilitar Módulos" -Method "PUT" -Url "$baseUrl/superadmin/modules/$tenantId" -Headers $headers -Body $moduleBody
        $results += $result
        
        Write-Host ""
        Write-Host "=== FASE 6: BACKUP ===" -ForegroundColor Yellow
        Write-Host ""
        
        # 9. Criar Backup
        $result = Test-Endpoint -Name "Criar Backup" -Method "POST" -Url "$baseUrl/backup/db/$tenantId" -Headers $headers
        $results += $result
        
        # 10. Listar Backups
        $result = Test-Endpoint -Name "Listar Backups" -Method "GET" -Url "$baseUrl/backup/list/$tenantId" -Headers $headers
        $results += $result
        
        Write-Host ""
        Write-Host "=== FASE 7: SYSTEM HEALTH ===" -ForegroundColor Yellow
        Write-Host ""
        
        # 11. Dashboard Metrics
        $result = Test-Endpoint -Name "Dashboard Metrics" -Method "GET" -Url "$baseUrl/superadmin/dashboard/metrics" -Headers $headers
        $results += $result
        
        # 12. System Overview
        $result = Test-Endpoint -Name "System Overview" -Method "GET" -Url "$baseUrl/superadmin/dashboard" -Headers $headers
        $results += $result
        
        Write-Host ""
        Write-Host "=== FASE 8: LIMPEZA ===" -ForegroundColor Yellow
        Write-Host ""
        
        # 13. Deletar Tenant de Teste
        $result = Test-Endpoint -Name "Deletar Tenant" -Method "DELETE" -Url "$baseUrl/superadmin/tenants/$tenantId" -Headers $headers
        $results += $result
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           RESUMO DOS TESTES            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$passedTests = ($results | Where-Object { $_.success -eq $true }).Count
$failedTests = $totalTests - $passedTests

Write-Host "Total de Testes: $totalTests" -ForegroundColor White
Write-Host "Passou: $passedTests" -ForegroundColor Green
Write-Host "Falhou: $failedTests" -ForegroundColor Red
Write-Host ""

if ($failedTests -gt 0) {
    Write-Host "TESTES QUE FALHARAM:" -ForegroundColor Red
    $results | Where-Object { $_.success -eq $false } | ForEach-Object {
        Write-Host "  - $($_.name): $($_.error)" -ForegroundColor Red
    }
    Write-Host ""
}

$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
Write-Host "Taxa de Sucesso: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Retornar código de saída baseado no resultado
if ($failedTests -eq 0) {
    exit 0
} else {
    exit 1
}
