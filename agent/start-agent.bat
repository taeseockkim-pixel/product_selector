@echo off
chcp 65001 >nul
title CIMON Quote File Local Save Agent

rem Auto-elevate to administrator privileges
net session >nul 2>&1
if not %errorlevel% == 0 (
  echo [ELEVATING] Restarting with administrator privileges...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
  exit /b
)

cd /d "%~dp0.."

rem Prevent duplicate execution: check if port 8790 is already listening
netstat -ano | findstr ":8790 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo ============================================================
  echo [INFO] CIMON Agent is already running on port 8790.
  echo Closing this window in 3 seconds to avoid duplicate process...
  echo ============================================================
  timeout /t 3 >nul
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
