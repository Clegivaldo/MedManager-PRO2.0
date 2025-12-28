$sourcePath = "C:\Users\Clegivaldo\Desktop\MedManager-PRO2.0\schema.prisma"
$destPath = "C:\Users\Clegivaldo\Desktop\MedManager-PRO2.0\api\prisma\schema.prisma"

# Ler conteúdo
$lines = Get-Content $sourcePath

# Gravar sem BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($destPath, $lines, $utf8NoBom)

Write-Host "Schema copiado sem BOM para $destPath"
