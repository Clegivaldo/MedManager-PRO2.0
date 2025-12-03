Param(
  [Parameter(Mandatory=$true)][string]$TenantId,
  [Parameter(Mandatory=$true)][string]$ConnectionString,
  [string]$OutputDir = "$(Get-Location)\backups"
)

# Ensure output dir
if (-not (Test-Path -Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Parse connection string for pg_dump
# Expected format: postgres://user:pass@host:port/dbname
$uri = [System.Uri]$ConnectionString
$UserInfo = $uri.UserInfo
$User = $UserInfo.Split(':')[0]
$Pass = $UserInfo.Split(':')[1]
$Host = $uri.Host
$Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$Db   = $uri.Segments[-1]

$env:PGPASSWORD = $Pass

$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$filename = "${TenantId}-${Db}-${timestamp}.sql"
$outPath = Join-Path $OutputDir $filename

Write-Host "Backing up tenant '$TenantId' database '$Db' to '$outPath'"

# Verify pg_dump availability
$pgdump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgdump) {
  Write-Error "pg_dump not found in PATH. Please install PostgreSQL client tools."
  exit 1
}

# Run pg_dump
$cmd = "pg_dump";
$args = @("-h", $Host, "-p", $Port, "-U", $User, "-d", $Db, "-F", "p")

$process = Start-Process -FilePath $cmd -ArgumentList $args -RedirectStandardOutput $outPath -NoNewWindow -PassThru
$process.WaitForExit()

if ($process.ExitCode -ne 0) {
  Write-Error "pg_dump failed with exit code $($process.ExitCode)"
  exit $process.ExitCode
}

Write-Host "Backup completed: $outPath"

# Optional: compress
$zipPath = "$outPath.zip"
Compress-Archive -Path $outPath -DestinationPath $zipPath -Force

Write-Host "Compressed: $zipPath"