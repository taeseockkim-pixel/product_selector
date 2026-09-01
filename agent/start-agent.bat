@echo off
chcp 65001 >nul
title CIMON 견적 파일 로컬 저장 에이전트
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [설정] 의존 패키지를 설치합니다...
  call npm install
)

if not exist "agent\config.json" (
  echo [오류] agent\config.json 파일이 없습니다. config.example.json을 복사해 설정해 주세요.
  pause
  exit /b 1
)

echo CIMON 견적 파일 로컬 저장 에이전트를 시작합니다. (종료: 창 닫기 또는 Ctrl+C)
call npm run agent
pause
