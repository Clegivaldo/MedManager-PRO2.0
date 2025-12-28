# Script para testar endpoints da API do tenant
# Confirma que produtos, clientes e permissões estão acessíveis

$baseUrl = "http://localhost:3333/api/v1"
$loginUrl = "$baseUrl/auth/login"

Write-Host "`n=== Testando API do Tenant Demo ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1] Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@farmaciademo.com.br"
    password = "Admin@123"
    tenantCnpj = "12345678000195"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✓ Login bem-sucedido. Token obtido." -ForegroundColor Green
} catch {
    Write-Host "✗ Erro no login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "demo-tenant"
}

# 2. Listar produtos
Write-Host "`n[2] Listando produtos..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/products?limit=10" -Method GET -Headers $headers
    $productCount = $productsResponse.data.products.Count
    Write-Host "✓ Produtos encontrados: $productCount" -ForegroundColor Green
    
    if ($productCount -gt 0) {
        $firstProduct = $productsResponse.data.products[0]
        Write-Host "  Produto exemplo:" -ForegroundColor Gray
        Write-Host "  - Nome: $($firstProduct.name)" -ForegroundColor Gray
        Write-Host "  - Código: $($firstProduct.internalCode)" -ForegroundColor Gray
        Write-Host "  - NCM: $($firstProduct.ncm)" -ForegroundColor Gray
        Write-Host "  - CEST: $($firstProduct.cest)" -ForegroundColor Gray
        Write-Host "  - CFOP: $($firstProduct.cfop)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar produtos: $_" -ForegroundColor Red
}

# 3. Listar clientes
Write-Host "`n[3] Listando clientes..." -ForegroundColor Yellow
try {
    $customersResponse = Invoke-RestMethod -Uri "$baseUrl/customers?limit=10" -Method GET -Headers $headers
    $customerCount = $customersResponse.data.customers.Count
    Write-Host "✓ Clientes encontrados: $customerCount" -ForegroundColor Green
    
    if ($customerCount -gt 0) {
        $firstCustomer = $customersResponse.data.customers[0]
        Write-Host "  Cliente exemplo:" -ForegroundColor Gray
        Write-Host "  - Nome: $($firstCustomer.companyName)" -ForegroundColor Gray
        Write-Host "  - CNPJ/CPF: $($firstCustomer.cnpjCpf)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar clientes: $_" -ForegroundColor Red
}

# 4. Listar estoque
Write-Host "`n[4] Listando estoque..." -ForegroundColor Yellow
try {
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/stock?limit=10" -Method GET -Headers $headers
    $stockCount = $stockResponse.data.stock.Count
    Write-Host "✓ Itens de estoque encontrados: $stockCount" -ForegroundColor Green
    
    if ($stockCount -gt 0) {
        $firstStock = $stockResponse.data.stock[0]
        Write-Host "  Estoque exemplo:" -ForegroundColor Gray
        Write-Host "  - Produto ID: $($firstStock.productId)" -ForegroundColor Gray
        Write-Host "  - Quantidade: $($firstStock.availableQuantity)" -ForegroundColor Gray
        Write-Host "  - Local: $($firstStock.location)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar estoque: $_" -ForegroundColor Red
}

# 5. Listar cotações
Write-Host "`n[5] Listando cotações..." -ForegroundColor Yellow
try {
    $quotesResponse = Invoke-RestMethod -Uri "$baseUrl/quotes?limit=10" -Method GET -Headers $headers
    $quoteCount = $quotesResponse.data.quotes.Count
    Write-Host "✓ Cotações encontradas: $quoteCount" -ForegroundColor Green
    
    if ($quoteCount -gt 0) {
        $firstQuote = $quotesResponse.data.quotes[0]
        Write-Host "  Cotação exemplo:" -ForegroundColor Gray
        Write-Host "  - Número: $($firstQuote.quoteNumber)" -ForegroundColor Gray
        Write-Host "  - Total: R$ $($firstQuote.totalAmount)" -ForegroundColor Gray
        Write-Host "  - Status: $($firstQuote.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar cotações: $_" -ForegroundColor Red
}

# 6. Listar pedidos
Write-Host "`n[6] Listando pedidos..." -ForegroundColor Yellow
try {
    $ordersResponse = Invoke-RestMethod -Uri "$baseUrl/orders?limit=10" -Method GET -Headers $headers
    $orderCount = $ordersResponse.data.orders.Count
    Write-Host "✓ Pedidos encontrados: $orderCount" -ForegroundColor Green
    
    if ($orderCount -gt 0) {
        $firstOrder = $ordersResponse.data.orders[0]
        Write-Host "  Pedido exemplo:" -ForegroundColor Gray
        Write-Host "  - Total: R$ $($firstOrder.totalValue)" -ForegroundColor Gray
        Write-Host "  - Status: $($firstOrder.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar pedidos: $_" -ForegroundColor Red
}

# 7. Buscar dados do usuário atual (incluindo permissões)
Write-Host "`n[7] Buscando perfil do usuário..." -ForegroundColor Yellow
try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    $user = $profileResponse.data.user
    Write-Host "✓ Usuário: $($user.name)" -ForegroundColor Green
    Write-Host "  - Email: $($user.email)" -ForegroundColor Gray
    Write-Host "  - Role: $($user.role)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao buscar perfil: $_" -ForegroundColor Red
}

# 8. Listar depósitos
Write-Host "`n[8] Listando depósitos..." -ForegroundColor Yellow
try {
    $warehousesResponse = Invoke-RestMethod -Uri "$baseUrl/warehouses?limit=10" -Method GET -Headers $headers
    $warehouseCount = $warehousesResponse.data.warehouses.Count
    Write-Host "✓ Depósitos encontrados: $warehouseCount" -ForegroundColor Green
    
    if ($warehouseCount -gt 0) {
        foreach ($wh in $warehousesResponse.data.warehouses) {
            Write-Host "  - $($wh.name) ($($wh.code))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Erro ao listar depósitos: $_" -ForegroundColor Red
}

Write-Host "`n=== Teste concluído ===" -ForegroundColor Cyan
Write-Host "`nAcesse o sistema em: http://localhost:5173" -ForegroundColor Green
Write-Host "Credenciais: admin@farmaciademo.com.br / Admin@123`n" -ForegroundColor Green
