param(
  [string]$Email = "admin@farmaciademo.com.br",
  [string]$Cnpj = "12345678000195",
  [string]$Password = "admin123"
)

$apiUrl = "http://localhost:3333/api/v1/auth/login-tenant"
$bodyObj = @{ email = $Email; cnpj = $Cnpj; password = $Password }
$bodyJson = $bodyObj | ConvertTo-Json
Write-Host "POST $apiUrl" -ForegroundColor Cyan
Write-Host "Body: $bodyJson" -ForegroundColor DarkGray

try {
  $resp = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $bodyJson
  $resp | ConvertTo-Json -Depth 6 | Out-String
} catch {
  Write-Host "Error:" $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
