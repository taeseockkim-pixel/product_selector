@echo off
title CIMON Quote File Local Save Agent
cd /d "%~dp0.."

rem 중복 실행 방지: 포트 8790이 이미 LISTENING 상태이면 기존 에이전트가 돌고 있으므로 새 창 자동 종료
netstat -ano | findstr ":8790 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo ============================================================
  echo [안내] CIMON 견적 에이전트가 이미 실행 중입니다. (포트 8790)
  echo 중복 실행을 방지하기 위해 이 창을 3초 후 자동으로 닫습니다.
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
