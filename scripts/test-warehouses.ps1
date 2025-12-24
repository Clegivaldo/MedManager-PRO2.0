$Email = "admin@farmaciademo.com.br"
$Cnpj = "12345678000195"
$Password = "admin123"

$loginScript = Join-Path $PSScriptRoot "call-login-tenant.ps1"
$wareScript = Join-Path $PSScriptRoot "call-warehouses.ps1"

$loginJson = & $loginScript -Email $Email -Cnpj $Cnpj -Password $Password
$loginObj = $loginJson | ConvertFrom-Json

$token = $loginObj.data.tokens.accessToken
$tenantId = $loginObj.data.tenant.id

Write-Host "Token obtido: $($token.Substring(0,30))..." -ForegroundColor DarkGray
Write-Host "Tenant ID: $tenantId" -ForegroundColor DarkGray

& $wareScript -Token $token -TenantId $tenantId -Limit 10
