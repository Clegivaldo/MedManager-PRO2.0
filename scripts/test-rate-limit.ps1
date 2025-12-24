Param(
  [string]$Url = "http://localhost:3333/health",
  [int]$Requests = 1200,
  [int]$Concurrency = 20
)

$script:errors = 0
$script:statusCounts = @{}
$throttle = [System.Threading.SemaphoreSlim]::new($Concurrency, $Concurrency)
$jobs = @()

function Invoke-Once($i) {
  $null = $throttle.Wait()
  try {
    $res = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $code = $res.StatusCode.Value__
  } catch {
    if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ } else { $code = 0; $script:errors++ }
  }
  $script:statusCounts[$code] = ($script:statusCounts[$code] + 1)
  $throttle.Release() | Out-Null
}

Write-Host "Disparando $Requests requests para $Url (concorrência: $Concurrency)..." -ForegroundColor Cyan
1..$Requests | ForEach-Object {
  $i = $_
  $jobs += [System.Threading.Tasks.Task]::Run([Action]{ Invoke-Once $i })
}

[System.Threading.Tasks.Task]::WaitAll($jobs)

Write-Host "Resumo:" -ForegroundColor Yellow
$script:statusCounts.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Host ("HTTP {0}: {1}" -f $_.Name, $_.Value) }
Write-Host ("Erros de transporte: {0}" -f $script:errors)

if ($script:statusCounts.ContainsKey(429)) { Write-Host "Rate limiting ATIVO (429 detectado)." -ForegroundColor Green } else { Write-Host "Rate limiting NÃO atingido." -ForegroundColor Red }
