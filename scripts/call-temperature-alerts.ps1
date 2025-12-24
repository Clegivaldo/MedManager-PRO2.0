param(
  [string]$Token,
  [string]$TenantId,
  [int]$Limit = 20
)

$apiUrl = "http://localhost:3333/api/v1/temperature/alerts?limit=$Limit"
$headers = @{ Authorization = "Bearer $Token"; "x-tenant-id" = $TenantId }
Write-Host "GET $apiUrl" -ForegroundColor Cyan

try {
  $resp = Invoke-RestMethod -Uri $apiUrl -Method GET -Headers $headers
  $resp | ConvertTo-Json -Depth 6 | Out-String
} catch {
  Write-Host "Error:" $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
