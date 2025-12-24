# Script de setup para emissão de NF-e (Windows)
# Execução: .\setup-nfe.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Setup de Emissão de NF-e - MedManager PRO 2.0        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar variáveis de ambiente
Write-Host "📋 Verificando variáveis de ambiente..." -ForegroundColor Yellow
Write-Host ""

$encryptionKey = [Environment]::GetEnvironmentVariable("ENCRYPTION_KEY")
if ([string]::IsNullOrEmpty($encryptionKey)) {
    Write-Host "❌ ERRO: ENCRYPTION_KEY não está configurada" -ForegroundColor Red
    Write-Host "   Adicione ao .env: ENCRYPTION_KEY=sua-chave-256-bits-base64"
    exit 1
}
Write-Host "✅ ENCRYPTION_KEY configurada" -ForegroundColor Green

$certEncKey = [Environment]::GetEnvironmentVariable("CERTIFICATE_ENCRYPTION_KEY")
if ([string]::IsNullOrEmpty($certEncKey)) {
    Write-Host "❌ ERRO: CERTIFICATE_ENCRYPTION_KEY não está configurada" -ForegroundColor Red
    Write-Host "   Adicione ao .env: CERTIFICATE_ENCRYPTION_KEY=sua-chave-256-bits-base64"
    exit 1
}
Write-Host "✅ CERTIFICATE_ENCRYPTION_KEY configurada" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
Write-Host ""

# 2. Verificar Node.js
$nodeVersion = node -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js não está instalado" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green

# 3. Verificar pnpm
$pnpmVersion = pnpm -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ pnpm não está instalado" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g pnpm"
    exit 1
}
Write-Host "✅ pnpm instalado: $pnpmVersion" -ForegroundColor Green

# 4. Ir para pasta API
Write-Host ""
Write-Host "📂 Entrando na pasta api..." -ForegroundColor Yellow
Set-Location api

# 5. Instalar dependências se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    pnpm install
} else {
    Write-Host "✅ Dependências já instaladas" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔐 Criptografando senhas de certificado existentes..." -ForegroundColor Yellow
Write-Host ""

# 6. Executar script de criptografia
pnpm ts-node src/scripts/encrypt-certificate-passwords.ts

Write-Host ""
Write-Host "🧪 Testando emissão de NF-e..." -ForegroundColor Yellow
Write-Host ""

# 7. Executar teste
$testTenantId = [Environment]::GetEnvironmentVariable("TEST_TENANT_ID")
if ([string]::IsNullOrEmpty($testTenantId)) {
    $testTenantId = "e9675bde-126b-429a-a150-533e055e7cc0"
    [Environment]::SetEnvironmentVariable("TEST_TENANT_ID", $testTenantId)
    Write-Host "📌 Usando tenant padrão: $testTenantId" -ForegroundColor Cyan
}

pnpm ts-node src/scripts/test-nfe-emission.ts

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Setup concluído com sucesso!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Revisar: GUIA_RAPIDO_NFE.md"
Write-Host "   2. Detalhes: NFE_EMISSAO_SEGURA.md"
Write-Host "   3. Checklist: CHECKLIST_NFE_EMISSAO.md"
Write-Host ""
Write-Host "🚀 Para emitir NF-e via API:" -ForegroundColor Cyan
Write-Host "   POST /api/v1/invoices/{id}/emit"
Write-Host "   Authorization: Bearer {token}"
Write-Host ""
