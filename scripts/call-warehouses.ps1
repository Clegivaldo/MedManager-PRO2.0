param(
  [string]$Token,
  [string]$TenantId,
  [int]$Limit = 10
)

$apiUrl = "http://localhost:3333/api/v1/warehouses?limit=$Limit"
$headers = @{ Authorization = "Bearer $Token"; "x-tenant-id" = $TenantId }
Write-Host "GET $apiUrl" -ForegroundColor Cyan
Write-Host "Headers: x-tenant-id=$TenantId" -ForegroundColor DarkGray

try {
  $resp = Invoke-RestMethod -Uri $apiUrl -Method GET -Headers $headers
  $resp | ConvertTo-Json -Depth 6 | Out-String
} catch {
  Write-Host "Error:" $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
