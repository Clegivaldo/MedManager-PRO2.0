#!/usr/bin/env pwsh
# Script de teste para validar login após correções

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE LOGIN - MedManager PRO 2.0  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuração
$API_URL = "http://localhost:3333/api/v1"
$TENANT_EMAIL = "admin@farmaciademo.com.br"
$TENANT_CNPJ = "12345678000195"
$PASSWORD = "admin123"

Write-Host "[1/3] Testando login com tenant..." -ForegroundColor Yellow

$loginBody = @{
    email = $TENANT_EMAIL
    cnpj = $TENANT_CNPJ
    password = $PASSWORD
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/auth/login-tenant" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if ($response.success) {
        Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
        Write-Host "   - Usuário: $($response.data.user.name)" -ForegroundColor Gray
        Write-Host "   - Email: $($response.data.user.email)" -ForegroundColor Gray
        Write-Host "   - Tenant: $($response.data.tenant.name)" -ForegroundColor Gray
        Write-Host "   - Token: $($response.data.tokens.accessToken.Substring(0, 30))..." -ForegroundColor Gray
        
        $token = $response.data.tokens.accessToken
        $tenantId = $response.data.tenant.id
        
        Write-Host ""
        Write-Host "[2/3] Testando requisição autenticada (GET /auth/me)..." -ForegroundColor Yellow
        
        $headers = @{
            Authorization = "Bearer $token"
            "x-tenant-id" = $tenantId
        }
        
        $meResponse = Invoke-RestMethod -Uri "$API_URL/auth/me" `
            -Method GET `
            -Headers $headers
            
        if ($meResponse.success) {
            Write-Host "✅ Requisição autenticada OK!" -ForegroundColor Green
            Write-Host "   - User ID: $($meResponse.data.user.id)" -ForegroundColor Gray
            Write-Host "   - Tenant ID: $($meResponse.data.user.tenantId)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "[3/3] Testando requisição a recurso protegido (GET /warehouses)..." -ForegroundColor Yellow
        
        $warehouseResponse = Invoke-RestMethod -Uri "$API_URL/warehouses?limit=10" `
            -Method GET `
            -Headers $headers
            
        if ($warehouseResponse.success) {
            Write-Host "✅ Requisição a warehouses OK!" -ForegroundColor Green
            Write-Host "   - Total: $($warehouseResponse.data.pagination.total)" -ForegroundColor Gray
            Write-Host "   - Warehouses retornados: $($warehouseResponse.data.warehouses.Count)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  ✅ TODOS OS TESTES PASSARAM!         " -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Falha no login!" -ForegroundColor Red
        Write-Host $response
    }
} catch {
    Write-Host "❌ Erro durante o teste!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
