# Teste completo de fluxo de assinatura expirada
Write-Host "`n=== TESTE DE FLUXO DE ASSINATURA EXPIRADA ===" -ForegroundColor Cyan

# Ler tenant expirado
$tenantFile = ".\tenant-expired.json"
if (-not (Test-Path $tenantFile)) {
    Write-Host "Arquivo tenant-expired.json nao encontrado!" -ForegroundColor Red
    Write-Host "Execute: cd api; npx tsx src/scripts/create-expired-subscription.ts" -ForegroundColor Yellow
    exit 1
}

$tenantData = Get-Content $tenantFile | ConvertFrom-Json
$tenantId = $tenantData.tenantId
$cnpj = $tenantData.cnpj

Write-Host "`nTenant ID: $tenantId" -ForegroundColor Green
Write-Host "CNPJ: $cnpj" -ForegroundColor Green

# 1. Login do tenant
Write-Host "`n--- PASSO 1: Login do Tenant ---" -ForegroundColor Yellow
$loginBody = @{
    cnpj = $cnpj
    email = 'user@tenantdemo.com'
    password = 'tenant123'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Method POST -Uri 'http://localhost:3333/api/v1/auth/login-tenant' `
        -Headers @{'Content-Type'='application/json'} -Body $loginBody
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $accessToken = $loginData.data.tokens.accessToken
    Write-Host "Login bem-sucedido" -ForegroundColor Green
    Write-Host "  User: $($loginData.data.user.email)" -ForegroundColor Gray
    Write-Host "  Tenant: $($loginData.data.tenant.name)" -ForegroundColor Gray
} catch {
    Write-Host "Falha no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Verificar informacoes da assinatura
Write-Host "`n--- PASSO 2: Verificar Informacoes da Assinatura ---" -ForegroundColor Yellow
try {
    $subInfoResponse = Invoke-WebRequest -Method GET -Uri 'http://localhost:3333/api/v1/subscriptions/info' `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
            'x-tenant-id' = $tenantId
        }
    $subInfo = $subInfoResponse.Content | ConvertFrom-Json
    Write-Host "Assinatura obtida" -ForegroundColor Green
    Write-Host "  Status: $($subInfo.data.status)" -ForegroundColor $(if ($subInfo.data.status -eq 'expired') { 'Red' } else { 'Yellow' })
    Write-Host "  Plano: $($subInfo.data.plan.name)" -ForegroundColor Gray
    Write-Host "  Data Expiracao: $($subInfo.data.endDate)" -ForegroundColor Gray
} catch {
    Write-Host "Falha ao obter info da assinatura: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Verificar endpoint de uso (deve funcionar mesmo expirado)
Write-Host "`n--- PASSO 3: Verificar Uso (deve funcionar mesmo expirado) ---" -ForegroundColor Yellow
try {
    $usageResponse = Invoke-WebRequest -Method GET -Uri 'http://localhost:3333/api/v1/subscriptions/usage' `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
            'x-tenant-id' = $tenantId
        }
    $usage = $usageResponse.Content | ConvertFrom-Json
    Write-Host "Uso obtido com sucesso (status $($usageResponse.StatusCode))" -ForegroundColor Green
    Write-Host "  Usuarios: $($usage.data.usage.users) / $($usage.data.plan.maxUsers)" -ForegroundColor Gray
    Write-Host "  Produtos: $($usage.data.usage.products) / $($usage.data.plan.maxProducts)" -ForegroundColor Gray
} catch {
    Write-Host "Falha ao obter uso: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Testar rota protegida /products (deve retornar 403)
Write-Host "`n--- PASSO 4: Testar Rota Protegida /products (deve retornar 403) ---" -ForegroundColor Yellow
try {
    $productsResponse = Invoke-WebRequest -Method GET -Uri 'http://localhost:3333/api/v1/products' `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
            'x-tenant-id' = $tenantId
        }
    Write-Host "Falha: Produtos retornou status $($productsResponse.StatusCode) ao inves de 403!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Rota bloqueada corretamente (403 LICENSE_EXPIRED)" -ForegroundColor Green
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "  Codigo: $($errorBody.code)" -ForegroundColor Gray
            Write-Host "  Mensagem: $($errorBody.error)" -ForegroundColor Gray
        } catch {
            Write-Host "  (Detalhes nao disponiveis)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Erro inesperado: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# 5. Testar rota protegida /customers (deve retornar 403)
Write-Host "`n--- PASSO 5: Testar Rota Protegida /customers (deve retornar 403) ---" -ForegroundColor Yellow
try {
    $customersResponse = Invoke-WebRequest -Method GET -Uri 'http://localhost:3333/api/v1/customers' `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
            'x-tenant-id' = $tenantId
        }
    Write-Host "Falha: Customers retornou status $($customersResponse.StatusCode) ao inves de 403!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Rota bloqueada corretamente (403)" -ForegroundColor Green
    } else {
        Write-Host "Erro inesperado: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# 6. Login como SUPERADMIN e testar bypass
Write-Host "`n--- PASSO 6: Login SUPERADMIN (deve ter bypass) ---" -ForegroundColor Yellow
$adminLoginBody = @{
    email = 'admin@medmanager.com.br'
    password = 'admin123'
} | ConvertTo-Json

try {
    $adminLoginResponse = Invoke-WebRequest -Method POST -Uri 'http://localhost:3333/api/v1/auth/login' `
        -Headers @{'Content-Type'='application/json'} -Body $adminLoginBody
    $adminLoginData = $adminLoginResponse.Content | ConvertFrom-Json
    $adminToken = $adminLoginData.data.tokens.accessToken
    Write-Host "Login SUPERADMIN bem-sucedido" -ForegroundColor Green
    
    # Testar acesso com SUPERADMIN ao tenant expirado
    Write-Host "`n   Testando acesso SUPERADMIN a tenant expirado..." -ForegroundColor Cyan
    try {
        $adminProductsResponse = Invoke-WebRequest -Method GET -Uri 'http://localhost:3333/api/v1/products' `
            -Headers @{
                'Authorization' = "Bearer $adminToken"
                'x-tenant-id' = $tenantId
            }
        Write-Host "   SUPERADMIN tem bypass (status $($adminProductsResponse.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "   SUPERADMIN foi bloqueado (nao deveria): $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Falha no login SUPERADMIN: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTE CONCLUIDO ===" -ForegroundColor Cyan
