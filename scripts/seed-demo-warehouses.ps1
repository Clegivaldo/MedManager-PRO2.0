param(
  [string]$Email = "admin@farmaciademo.com.br",
  [string]$Cnpj = "12345678000195",
  [string]$Password = "admin123"
)

$baseUrl = "http://localhost:3333/api/v1"

function Login-Tenant {
  param([string]$Email, [string]$Cnpj, [string]$Password)
  $loginUrl = "$baseUrl/auth/login-tenant"
  $bodyJson = @{ email = $Email; cnpj = $Cnpj; password = $Password } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri $loginUrl -Method POST -ContentType "application/json" -Body $bodyJson
  return $resp.data
}

function Create-Warehouse {
  param([string]$Token, [string]$TenantId, [hashtable]$Warehouse)
  $url = "$baseUrl/warehouses"
  $headers = @{ Authorization = "Bearer $Token"; "x-tenant-id" = $TenantId }
  $body = $Warehouse | ConvertTo-Json
  return Invoke-RestMethod -Uri $url -Method POST -Headers $headers -ContentType "application/json" -Body $body
}

function Record-Temperature {
  param([string]$Token, [string]$TenantId, [hashtable]$Reading)
  $url = "$baseUrl/temperature"
  $headers = @{ Authorization = "Bearer $Token"; "x-tenant-id" = $TenantId }
  $body = $Reading | ConvertTo-Json
  return Invoke-RestMethod -Uri $url -Method POST -Headers $headers -ContentType "application/json" -Body $body
}

try {
  Write-Host "Login no tenant..." -ForegroundColor Cyan
  $auth = Login-Tenant -Email $Email -Cnpj $Cnpj -Password $Password
  $token = $auth.tokens.accessToken
  $tenantId = $auth.tenant.id
  Write-Host "Token: $($token.Substring(0,24))..." -ForegroundColor DarkGray
  Write-Host "Tenant: $tenantId" -ForegroundColor DarkGray

  Write-Host "Criando armazens demo..." -ForegroundColor Cyan
  $w1 = @{ name = "Cold Room A"; code = "CR-A"; description = "Camara fria"; address = "Setor 1"; temperatureMin = 2; temperatureMax = 8 }
  $w2 = @{ name = "Warehouse B"; code = "WH-B"; description = "Armazem seco"; address = "Setor 2"; temperatureMin = 15; temperatureMax = 25 }

  $r1 = Create-Warehouse -Token $token -TenantId $tenantId -Warehouse $w1
  $r2 = Create-Warehouse -Token $token -TenantId $tenantId -Warehouse $w2
  $id1 = $r1.data.id
  $id2 = $r2.data.id
  Write-Host "Criados: $id1, $id2" -ForegroundColor Green

  Write-Host "Registrando leituras..." -ForegroundColor Cyan
  # Leituras para Cold Room A
  Record-Temperature -Token $token -TenantId $tenantId -Reading @{ warehouseId = $id1; temperature = 5; humidity = 60; recordedBy = "seed" } | Out-Null
  Record-Temperature -Token $token -TenantId $tenantId -Reading @{ warehouseId = $id1; temperature = 9; humidity = 58; recordedBy = "seed" } | Out-Null
  Record-Temperature -Token $token -TenantId $tenantId -Reading @{ warehouseId = $id1; temperature = 1; humidity = 62; recordedBy = "seed" } | Out-Null

  # Leituras para Warehouse B
  Record-Temperature -Token $token -TenantId $tenantId -Reading @{ warehouseId = $id2; temperature = 20; humidity = 45; recordedBy = "seed" } | Out-Null
  Record-Temperature -Token $token -TenantId $tenantId -Reading @{ warehouseId = $id2; temperature = 26; humidity = 40; recordedBy = "seed" } | Out-Null

  Write-Host "Seed concluido" -ForegroundColor Green
} catch {
  Write-Host ("Erro: {0}" -f $_.Exception.Message) -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
  exit 1
}
