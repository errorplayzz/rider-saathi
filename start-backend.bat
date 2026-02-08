@echo off
echo 🔍 Checking for existing backend processes...

REM Kill any existing node processes on port 5001
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do (
    echo ⚠️  Found process %%a using port 5001, killing it...
    taskkill /F /PID %%a >nul 2>&1
)

echo 🚀 Starting Rider Sathi Backend Server...
cd /d "E:\ERROR Codes\Rider Sathi 4.0\Rider Sathi 3.0\backend"
node "E:\ERROR Codes\Rider Sathi 4.0\Rider Sathi 3.0\backend\src\server.js"