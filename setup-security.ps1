# ============================================
# COMANDOS RÁPIDOS - MELHORIAS DE SEGURANÇA
# ============================================
# Execute este script no PowerShell
# ============================================

Write-Host "🔒 Iniciando configuração de segurança..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. INSTALAR DEPENDÊNCIAS
# ============================================
Write-Host "📦 1/5 - Instalando dependências..." -ForegroundColor Yellow
Set-Location api
npm install cookie-parser express-validator
npm install --save-dev @types/cookie-parser
Write-Host "✅ Dependências instaladas" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. GERAR SECRETS
# ============================================
Write-Host "🔑 2/5 - Gerando secrets seguros..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Cole estes valores no seu arquivo .env.production:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$jwt_secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwt_refresh = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$encryption_key = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "JWT_SECRET=$jwt_secret" -ForegroundColor White
Write-Host "JWT_REFRESH_SECRET=$jwt_refresh" -ForegroundColor White
Write-Host "ENCRYPTION_KEY=$encryption_key" -ForegroundColor White
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione ENTER após copiar os valores acima"

# ============================================
# 3. CONFIGURAR .ENV
# ============================================
Write-Host "⚙️  3/5 - Configurando ambiente..." -ForegroundColor Yellow
Set-Location ..
if (-Not (Test-Path .env.production)) {
    Copy-Item .env.production.template .env.production
    Write-Host "✅ Arquivo .env.production criado" -ForegroundColor Green
    Write-Host "⚠️  EDITE .env.production com os valores gerados acima!" -ForegroundColor Red
    Read-Host "Pressione ENTER após editar .env.production"
} else {
    Write-Host "⚠️  .env.production já existe" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 4. BACKUP DO BANCO (OPCIONAL)
# ============================================
Write-Host "💾 4/5 - Backup do banco de dados..." -ForegroundColor Yellow
$backup = Read-Host "Deseja fazer backup do banco? (s/n)"
if ($backup -eq "s") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    Write-Host "⚠️  Configure a connection string e execute manualmente:" -ForegroundColor Yellow
    Write-Host "pg_dump `$env:DATABASE_URL > $backupFile" -ForegroundColor White
} else {
    Write-Host "⏭️  Backup pulado" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# 5. BUILD E TESTES
# ============================================
Write-Host "🏗️  5/5 - Build e validação..." -ForegroundColor Yellow
Set-Location api
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build concluído com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# PRÓXIMOS PASSOS
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURAÇÃO INICIAL CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Executar migração de senhas:" -ForegroundColor White
Write-Host "   cd api" -ForegroundColor Gray
Write-Host "   npx ts-node src/scripts/migrate-encrypt-passwords.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy com Docker:" -ForegroundColor White
Write-Host "   cd .." -ForegroundColor Gray
Write-Host "   docker-compose --env-file .env.production up -d --build" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar health:" -ForegroundColor White
Write-Host "   curl http://localhost:3333/health" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Consulte DEPLOY_SECURITY.md para detalhes completos" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "- NUNCA commite .env.production no Git" -ForegroundColor Yellow
Write-Host "- Guarde backup das chaves em local seguro" -ForegroundColor Yellow
Write-Host "- Rotacione chaves a cada 90 dias" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location ..
