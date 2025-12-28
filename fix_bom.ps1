$path = "C:\Users\Clegivaldo\Desktop\MedManager-PRO2.0\schema.prisma"
$lines = Get-Content $path
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($path, $lines, $utf8NoBom)
Write-Host "BOM removed from $path"
