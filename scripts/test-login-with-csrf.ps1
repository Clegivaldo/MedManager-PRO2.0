Param(
  [string]$BaseUrl = "http://localhost:3333",
  [string]$ApiVersion = "v1",
  [string]$Email = $env:TEST_EMAIL,
  [string]$Password = $env:TEST_PASSWORD
)

if (-not $Email -or -not $Password) {
  Write-Host "Forneça credenciais via parâmetros ou variáveis de ambiente TEST_EMAIL/TEST_PASSWORD." -ForegroundColor Yellow
  exit 1
}

$csrfUrl = "$BaseUrl/api/csrf-token"
$loginUrl = "$BaseUrl/api/$ApiVersion/auth/login"

Write-Host "[1/3] Obtendo CSRF token..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri $csrfUrl -Method GET -SessionVariable sess -Headers @{ "Accept" = "application/json" }
$body = $response.Content | ConvertFrom-Json
$csrfToken = $body.csrfToken

if (-not $csrfToken) {
  Write-Error "Falha ao obter CSRF token."; exit 1
}

# Extrai cookie 'csrf' da sessão
$cookie = ($sess.Cookies.GetCookies($csrfUrl) | Where-Object { $_.Name -eq 'csrf' })
if (-not $cookie) { Write-Warning "Cookie CSRF não encontrado; prosseguindo com header apenas." }

Write-Host "[2/3] Realizando login (POST /auth/login)..." -ForegroundColor Cyan
$payload = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress

# Envia cookie e header X-CSRF-Token
$headers = @{ 'Content-Type' = 'application/json'; 'X-CSRF-Token' = $csrfToken }
if ($cookie) { $headers['Cookie'] = "csrf=" + $cookie.Value }

try {
  $loginRes = Invoke-RestMethod -Uri $loginUrl -Method Post -Headers $headers -Body $payload -ErrorAction Stop
  Write-Host "[3/3] Login OK" -ForegroundColor Green
  $loginRes | ConvertTo-Json -Depth 5
} catch {
  Write-Host "[3/3] Login falhou" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.Content) {
    $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object IO.StreamReader($stream); $text = $reader.ReadToEnd();
    Write-Output $text
  } else { Write-Output $_ }
  exit 2
}
