$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3333/api/v1"

Write-Host ""
Write-Host "=== Testando API do Tenant Demo ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "[1] Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@farmaciademo.com.br"
    password = "Admin@123"
    tenantCnpj = "12345678000195"
}

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body ($loginBody | ConvertTo-Json) `
        -ContentType "application/json"
    
    $token = $loginResponse.data.tokens.accessToken
    $tenantId = $loginResponse.data.tenant.id
    
    Write-Host "OK - Login bem-sucedido" -ForegroundColor Green
    Write-Host "  Tenant: $($loginResponse.data.tenant.name)" -ForegroundColor Gray
    Write-Host "  Usuario: $($loginResponse.data.user.name)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha no login" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = $tenantId
}

# Produtos
Write-Host "[2] Listando produtos..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/products?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $productsResponse.data.products.Count
    Write-Host "OK - $count produtos encontrados" -ForegroundColor Green
    
    if ($count -gt 0) {
        $p = $productsResponse.data.products[0]
        Write-Host "  Exemplo: $($p.name)" -ForegroundColor Gray
        Write-Host "    NCM: $($p.ncm)" -ForegroundColor Gray
        Write-Host "    CFOP: $($p.cfop)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar produtos" -ForegroundColor Red
    Write-Host ""
}

# Clientes
Write-Host "[3] Listando clientes..." -ForegroundColor Yellow
try {
    $customersResponse = Invoke-RestMethod -Uri "$baseUrl/customers?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $customersResponse.data.customers.Count
    Write-Host "OK - $count clientes encontrados" -ForegroundColor Green
    
    if ($count -gt 0) {
        $c = $customersResponse.data.customers[0]
        Write-Host "  Exemplo: $($c.companyName)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar clientes" -ForegroundColor Red
    Write-Host ""
}

# Estoque
Write-Host "[4] Listando estoque..." -ForegroundColor Yellow
try {
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/stock?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $stockResponse.data.stock.Count
    Write-Host "OK - $count itens de estoque" -ForegroundColor Green
    
    if ($count -gt 0) {
        $s = $stockResponse.data.stock[0]
        Write-Host "  Quantidade: $($s.availableQuantity)" -ForegroundColor Gray
        Write-Host "  Local: $($s.location)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar estoque" -ForegroundColor Red
    Write-Host ""
}

# Cotacoes
Write-Host "[5] Listando cotacoes..." -ForegroundColor Yellow
try {
    $quotesResponse = Invoke-RestMethod -Uri "$baseUrl/quotes?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $quotesResponse.data.quotes.Count
    Write-Host "OK - $count cotacoes encontradas" -ForegroundColor Green
    
    if ($count -gt 0) {
        $q = $quotesResponse.data.quotes[0]
        Write-Host "  Numero: $($q.quoteNumber)" -ForegroundColor Gray
        Write-Host "  Total: R$ $($q.totalAmount)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar cotacoes" -ForegroundColor Red
    Write-Host ""
}

# Pedidos
Write-Host "[6] Listando pedidos..." -ForegroundColor Yellow
try {
    $ordersResponse = Invoke-RestMethod -Uri "$baseUrl/orders?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $ordersResponse.data.orders.Count
    Write-Host "OK - $count pedidos encontrados" -ForegroundColor Green
    
    if ($count -gt 0) {
        $o = $ordersResponse.data.orders[0]
        Write-Host "  Total: R$ $($o.totalValue)" -ForegroundColor Gray
        Write-Host "  Status: $($o.status)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar pedidos" -ForegroundColor Red
    Write-Host ""
}

# Depositos
Write-Host "[7] Listando depositos..." -ForegroundColor Yellow
try {
    $warehousesResponse = Invoke-RestMethod -Uri "$baseUrl/warehouses?limit=10" `
        -Method GET `
        -Headers $headers
    
    $count = $warehousesResponse.data.warehouses.Count
    Write-Host "OK - $count depositos encontrados" -ForegroundColor Green
    
    foreach ($wh in $warehousesResponse.data.warehouses) {
        Write-Host "  - $($wh.name) ($($wh.code))" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "ERRO - Falha ao listar depositos" -ForegroundColor Red
    Write-Host ""
}

Write-Host "=== Teste concluido ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse o sistema em: http://localhost:5173" -ForegroundColor Green
Write-Host "Credenciais: admin@farmaciademo.com.br / Admin@123" -ForegroundColor Green
Write-Host ""
