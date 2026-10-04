param(
  [string]$MysqlBin = 'C:\xampp\mysql\bin',
  [string]$Database = 'restaurante_pedidos',
  [string]$User = 'root',
  [string]$Password = '',
  [string]$OutputDirectory = 'C:\xampp\backups\restaurante'
)

$ErrorActionPreference = 'Stop'
$dump = Join-Path $MysqlBin 'mysqldump.exe'
if (-not (Test-Path -LiteralPath $dump)) { throw "No se encontró mysqldump.exe en $MysqlBin" }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$file = Join-Path $OutputDirectory "$Database`_$stamp.sql"
& $dump --protocol=tcp --host=127.0.0.1 --port=3306 --user=$User --password=$Password --single-transaction --routines --events --triggers $Database | Set-Content -LiteralPath $file -Encoding UTF8
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue; throw "mysqldump terminó con código $LASTEXITCODE" }
Write-Output "Respaldo creado: $file"
