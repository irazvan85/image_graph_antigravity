@echo off
setlocal enabledelayedexpansion

:: ImageGraph Robust Startup Script
echo ==========================================
echo       Starting ImageGraph Ecosystem
echo ==========================================

set BACKEND_PORT=8001
set FRONTEND_PORT=5173

echo [0/3] Checking for existing processes on ports %BACKEND_PORT% and %FRONTEND_PORT%...

:: Use PowerShell to cleanly kill processes on ports - MUCH MORE ROBUST than Batch loops
powershell -Command "Get-NetTCPConnection -LocalPort %BACKEND_PORT%, %FRONTEND_PORT% -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '[!] Cleaned up process on port' $_.LocalPort }"

:: 1. Start backend in a new window
echo [1/3] Launching Backend API (Port %BACKEND_PORT%)...
start "ImageGraph Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && set PYTHONPATH=.&& uvicorn app.main:app --port %BACKEND_PORT% --log-level info"

:: 2. Start frontend in a new window
echo [2/3] Launching Frontend UI (Port %FRONTEND_PORT%)...
start "ImageGraph Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 3. Wait and open browser
echo [3/3] Waiting for servers to initialize...
timeout /t 10 /nobreak > nul

echo Opening ImageGraph in your browser...
start http://localhost:%FRONTEND_PORT%

echo.
echo ImageGraph is running!
echo Keep the backend and frontend windows open.
echo.
pause
