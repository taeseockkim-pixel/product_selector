@echo off
title CIMON Quote File Local Save Agent
cd /d "%~dp0.."

rem Check if port 8790 is already running
set "PORT_PID="
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r /c:":8790 .*LISTENING"') do set "PORT_PID=%%a"

if defined PORT_PID (
  echo ============================================================
  echo [NOTICE] CIMON Agent is ALREADY running on port 8790
  echo The background service is active and working normally
  echo No duplicate instance will be launched
  echo ============================================================
  echo Press any key to close this window
  pause >nul
  exit /b 0
)

rem Trust the corporate CA certificate exported to agent\corp-ca.pem (recommended)
if exist "agent\corp-ca.pem" set "NODE_EXTRA_CA_CERTS=%~dp0corp-ca.pem"

rem EMERGENCY ONLY: create an empty agent\allow-insecure-tls file to skip TLS checks
if exist "agent\allow-insecure-tls" set "NODE_TLS_REJECT_UNAUTHORIZED=0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install the LTS version from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [SETUP] Installing npm dependencies...
  call npm install
)

if not exist "agent\config.json" (
  echo [ERROR] agent\config.json not found.
  echo Copy agent\config.example.json to agent\config.json and fill in the values.
  pause
  exit /b 1
)

echo Starting CIMON quote file local save agent... (close this window or press Ctrl+C to stop)
call npm run agent
pause
