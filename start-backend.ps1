# Rider Sathi Backend Starter Script
Write-Host "🔍 Checking for existing backend processes..." -ForegroundColor Cyan

# Kill any existing processes on port 5001
$port = 5001
$pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)

if ($pids) {
    Write-Host "⚠️  Found process(es) $($pids -join ', ') using port $port, killing them..." -ForegroundColor Yellow
    Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ Port $port is free" -ForegroundColor Green
}

Write-Host "🚀 Starting Rider Sathi Backend Server..." -ForegroundColor Green

# Change to backend directory and start server
Set-Location "E:\ERROR Codes\Rider Sathi 4.0\Rider Sathi 3.0\backend"
& node "E:\ERROR Codes\Rider Sathi 4.0\Rider Sathi 3.0\backend\src\server.js"