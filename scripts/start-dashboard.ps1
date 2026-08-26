param(
    [Parameter(Position = 0)]
    [string]$Email = "dantedev22@gmail.com"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path (Split-Path -Parent $ProjectRoot) "eldojo-backend-api"
$DefaultEmail = "dantedev22@gmail.com"
$DevPort = 8088

Write-Host "=== ElDojo Dev Dashboard (auto-login) ===" -ForegroundColor Cyan
Write-Host "Email autologin : $Email"
Write-Host "Puerto servidor : $DevPort  (evita conflicto con admin estandar en 8082)"
Write-Host "Proyecto        : $ProjectRoot"
Write-Host ""

$apiBase = $env:EXPO_PUBLIC_API_URL
if (-not $apiBase) {
    $apiBase = "http://localhost:8000/api/v1"
}
$healthUrl = $apiBase -replace "/api/v1$", "/api/v1/health"

Write-Host "[1/3] Verificando backend API en $healthUrl ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "      OK: Backend respondiendo." -ForegroundColor Green
    } else {
        Write-Warning "      Backend devolvio status $($response.StatusCode). Continuando de todos modos."
    }
} catch {
    Write-Warning "      No se pudo alcanzar el backend."
    Write-Host "      Asegurate de haber ejecutado 'make start' en eldojo-backend-api" -ForegroundColor Yellow
    Write-Host "      (o deja esta ventana abierta y arrancalo en paralelo)." -ForegroundColor Yellow
}

$existing = netstat -ano | Select-String ":$DevPort\s" | Select-String "LISTENING"
if ($existing) {
    Write-Warning ""
    Write-Warning "      El puerto $DevPort ya esta ocupado:"
    $existing | ForEach-Object { Write-Warning "         $_" }
    Write-Host "      Para liberarlo ejecuta en otra terminal:" -ForegroundColor Yellow
    Write-Host "         make kill-web-dev  (desde eldojo-mobile)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "[2/3] Configurando variable EXPO_PUBLIC_DEV_AUTOLOGIN_EMAIL ..." -ForegroundColor Yellow
$env:EXPO_PUBLIC_DEV_AUTOLOGIN_EMAIL = $Email
Write-Host "      Establecida a: $Email" -ForegroundColor Green

$env:FAST_REFRESH = "true"
$env:CHOKIDAR_USEPOLLING = "true"
$env:WATCHPACK_POLLING = "true"

Write-Host ""
Write-Host "[3/3] Iniciando Expo Web Admin en puerto $DevPort ..." -ForegroundColor Yellow
Write-Host "      Abre el navegador en:  http://localhost:$DevPort" -ForegroundColor Cyan
Write-Host "      Presiona Ctrl+C en esta ventana para detener." -ForegroundColor DarkGray
Write-Host ""

Set-Location $ProjectRoot
& npx expo start --web --port $DevPort
