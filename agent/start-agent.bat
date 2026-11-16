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

rem Verify the live /health response and the process lock. A listener alone is not proof of health.
call node agent\agent-control.js preflight
set "PREFLIGHT_RESULT=%ERRORLEVEL%"
if "%PREFLIGHT_RESULT%"=="10" goto already_running
if "%PREFLIGHT_RESULT%"=="20" goto needs_recovery
if not "%PREFLIGHT_RESULT%"=="0" goto preflight_failed

echo Starting CIMON quote file local save agent... (close this window or press Ctrl+C to stop)
call npm run agent
set "AGENT_RESULT=%ERRORLEVEL%"
pause
exit /b %AGENT_RESULT%

:already_running
echo ============================================================
echo [NOTICE] CIMON Agent /health is responding; no second instance was started.
echo ============================================================
pause
exit /b 0

:needs_recovery
echo ============================================================
echo [WARNING] An agent process or port exists but /health is not responding.
echo Review the diagnosis, then use agent\restart-agent.bat to recover safely.
echo Do not launch another copy or end unrelated Node/Excel processes.
echo ============================================================
pause
exit /b 1

:preflight_failed
echo [ERROR] Agent preflight failed. Check agent\config.json and the console output.
pause
exit /b 1
