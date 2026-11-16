@echo off
title CIMON Quote Agent Safe Restart
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install the LTS version from https://nodejs.org
  pause
  exit /b 1
)

if not exist "agent\config.json" (
  echo [ERROR] agent\config.json not found.
  pause
  exit /b 1
)

rem Keep TLS configuration consistent with start-agent.bat.
if exist "agent\corp-ca.pem" set "NODE_EXTRA_CA_CERTS=%~dp0corp-ca.pem"
if exist "agent\allow-insecure-tls" set "NODE_TLS_REJECT_UNAUTHORIZED=0"

echo This tool records local diagnostics and asks before terminating only the identified agent process tree.
echo It does not terminate unrelated Node.js or Excel processes.
node agent\agent-control.js restart
set "RESTART_RESULT=%ERRORLEVEL%"
if not "%RESTART_RESULT%"=="0" (
  echo.
  echo [WARNING] Safe restart did not complete. Review the diagnostic output above.
  pause
)
exit /b %RESTART_RESULT%
