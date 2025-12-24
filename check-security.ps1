# ============================================
# SCRIPT DE LIMPEZA DE SEGURANÇA
# Remove chaves e senhas hardcoded dos testes
# ============================================

Write-Host "🔒 Iniciando limpeza de segurança..." -ForegroundColor Cyan
Write-Host ""

# Lista de arquivos com hardcoded secrets
$files = @(
    "test-create-charge-and-webhook.ts",
    "test-asaas-integration.ts",
    "test-limits-service.ts",
    "test-asaas-webhook.ts",
    "setup-tenant-demo.js"
)

$issuesFound = 0
$issuesFixed = 0

Write-Host "🔍 Verificando arquivos..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📄 Analisando: $file" -ForegroundColor White
        
        $content = Get-Content $file -Raw
        
        # Verificar senhas hardcoded
        if ($content -match "admin123|password.*=.*['\`"].*['\`"]") {
            Write-Host "  ⚠️  Senha hardcoded encontrada!" -ForegroundColor Red
            $issuesFound++
        }
        
        # Verificar chaves API
        if ($content -match "\$aact_|aact_hmlg") {
            Write-Host "  ⚠️  Chave ASAAS exposta!" -ForegroundColor Red
            $issuesFound++
        }
        
        # Verificar tokens
        if ($content -match "test-webhook-token") {
            Write-Host "  ⚠️  Token webhook exposto!" -ForegroundColor Red
            $issuesFound++
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 RESULTADO DA ANÁLISE" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Problemas encontrados: $issuesFound" -ForegroundColor $(if ($issuesFound -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($issuesFound -gt 0) {
    Write-Host "⚠️  ATENÇÃO: Encontradas credenciais hardcoded!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 AÇÕES NECESSÁRIAS:" -ForegroundColor Yellow
    Write-Host "1. Criar arquivo .env.test com as credenciais" -ForegroundColor White
    Write-Host "2. Substituir valores hardcoded por process.env" -ForegroundColor White
    Write-Host "3. Adicionar .env.test ao .gitignore" -ForegroundColor White
    Write-Host ""
    Write-Host "Consulte AUDITORIA_ADICIONAL.md para detalhes" -ForegroundColor Cyan
} else {
    Write-Host "✅ Nenhum problema de segurança encontrado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
