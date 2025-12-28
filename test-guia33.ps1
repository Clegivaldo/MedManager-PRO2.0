# Script de Teste - Guia 33 Endpoints
# Data: 2025-12-28

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMzcwMDhmNi02OTgyLTRiZjMtYjgzMS03YjQ2NTE1ZTU2OWUiLCJlbWFpbCI6ImFkbWluQG1lZG1hbmFnZXIuY29tLmJyIiwicm9sZSI6IlNVUEVSQURNSU4iLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc2Njk2Mzc5MSwiZXhwIjoxNzY3MDUwMTkxLCJhdWQiOiJtZWRtYW5hZ2VyLWFwcCIsImlzcyI6Im1lZG1hbmFnZXItYXBpIn0.NYrzkttaOSLSpI2f3v4AX8SYE9VkHefejOaU8GQ0a5Q"
$tenantId = "e9675bde-126b-429a-a150-533e055e7cc0"
$baseUrl = "http://localhost:3333/api/v1/guia33"
$headers = @{
    Authorization = "Bearer $token"
    "x-tenant-id" = $tenantId
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTES - GUIA 33 API ENDPOINTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Teste 1: Validação de Prescrição
Write-Host "🧪 TESTE 1: Validação de Prescrição" -ForegroundColor Yellow
try {
    $body = @{
        prescriptionDate = "2025-12-28"
        validityDays = 30
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/validate-prescription" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCESSO - Válida: $($result.validation.valid), Dias restantes: $($result.validation.daysRemaining)" -ForegroundColor Green
    Write-Host "   Mensagem: $($result.validation.message)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 2: Validação de Prescrição Expirada
Write-Host "🧪 TESTE 2: Validação de Prescrição Expirada" -ForegroundColor Yellow
try {
    $body = @{
        prescriptionDate = "2024-01-01"
        validityDays = 30
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/validate-prescription" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCESSO - Válida: $($result.validation.valid), Dias expirados: $($result.validation.daysElapsed)" -ForegroundColor Green
    Write-Host "   Mensagem: $($result.validation.message)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 3: Registro de Movimentação
Write-Host "🧪 TESTE 3: Registro de Movimentação (ISSUE)" -ForegroundColor Yellow
try {
    $body = @{
        substanceId = "SUBSTANCE-001"
        patientId = "PATIENT-001"
        patientName = "João Silva"
        quantity = 2
        operationType = "ISSUE"
        prescriptionId = "RX-2025-001"
        prescriptionDate = "2025-12-28"
        registeredBy = "admin@medmanager.com.br"
        notes = "Dispensação de medicamento controlado - Teste"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/record-movement" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCESSO - Movimentação registrada!" -ForegroundColor Green
    Write-Host "   ID: $($result.movement.id)" -ForegroundColor Gray
    Write-Host "   Tipo: $($result.movement.operationType), Quantidade: $($result.movement.quantity)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 4: Validação de Quota
Write-Host "🧪 TESTE 4: Validação de Quota de Paciente" -ForegroundColor Yellow
try {
    $body = @{
        substanceId = "SUBSTANCE-001"
        patientId = "PATIENT-001"
        quantity = 5
        period = "daily"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/validate-quota" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCESSO - Dentro da quota: $($result.validation.withinLimit)" -ForegroundColor Green
    Write-Host "   Consumido: $($result.validation.consumed), Limite: $($result.validation.limit)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 5: Listar Movimentações
Write-Host "🧪 TESTE 5: Listar Movimentações" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/movements/SUBSTANCE-001?limit=10" -Method GET -Headers $headers
    Write-Host "✅ SUCESSO - $($result.movements.Count) movimentações encontradas`n" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 6: Estatísticas
Write-Host "🧪 TESTE 6: Estatísticas da Substância" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/stats/SUBSTANCE-001" -Method GET -Headers $headers
    Write-Host "✅ SUCESSO - Estatísticas obtidas" -ForegroundColor Green
    Write-Host "   Total movimentações: $($result.stats.totalMovements)" -ForegroundColor Gray
    Write-Host "   Total emitido: $($result.stats.totalIssued), Total recebido: $($result.stats.totalReceived)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Teste 7: Gerar Relatório Guia 33
Write-Host "🧪 TESTE 7: Gerar Relatório Guia 33" -ForegroundColor Yellow
try {
    $body = @{
        substanceId = "SUBSTANCE-001"
        startDate = "2025-12-01"
        endDate = "2025-12-31"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/generate-report" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCESSO - Relatório gerado!" -ForegroundColor Green
    Write-Host "   Período: $($result.report.period.start) até $($result.report.period.end)" -ForegroundColor Gray
    Write-Host "   Total emitido: $($result.report.totalIssued), Saldo: $($result.report.balance)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTES CONCLUÍDOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
