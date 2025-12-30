# SUITE DE TESTES - MedManager PRO 2.0
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MEDMANAGER PRO 2.0 - TESTE COMPLETO  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3333/api/v1"
$passed = 0
$failed = 0

Write-Host "=== FASE 1: HEALTH CHECK ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3333/health" -Method GET
    Write-Host "[OK] Health Check" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[ERRO] Health Check: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "=== FASE 2: AUTENTICACAO ===" -ForegroundColor Yellow
$token = $null
try {
    $loginBody = @{
        email = "admin@medmanager.com.br"
        password = "admin123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $response.accessToken
    Write-Host "[OK] Login SuperAdmin" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[ERRO] Login SuperAdmin: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

if ($token) {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host ""
    Write-Host "=== FASE 3: GESTAO DE TENANTS ===" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/superadmin/tenants?page=1&limit=10" -Method GET -Headers $headers
        Write-Host "[OK] Listar Tenants" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "[ERRO] Listar Tenants: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
    Write-Host "=== FASE 4: GESTAO DE PLANOS ===" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/superadmin/plans" -Method GET -Headers $headers
        Write-Host "[OK] Listar Planos" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "[ERRO] Listar Planos: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
    Write-Host "=== FASE 5: DASHBOARD ===" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/superadmin/dashboard" -Method GET -Headers $headers
        Write-Host "[OK] Dashboard Metrics" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "[ERRO] Dashboard Metrics: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           RESUMO DOS TESTES            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$total = $passed + $failed
$rate = [math]::Round(($passed / $total) * 100, 2)
Write-Host "Total: $total" -ForegroundColor White
Write-Host "Passou: $passed" -ForegroundColor Green
Write-Host "Falhou: $failed" -ForegroundColor Red
Write-Host "Taxa de Sucesso: $rate%" -ForegroundColor $(if ($rate -ge 90) { "Green" } elseif ($rate -ge 70) { "Yellow" } else { "Red" })

if ($failed -eq 0) { exit 0 } else { exit 1 }
