@echo off
title CIMON Quote File Local Save Agent
cd /d "%~dp0.."

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
