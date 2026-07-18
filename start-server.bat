@echo off
setlocal
cd /d "%~dp0"
title ISHS ARENA Server - DO NOT CLOSE
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ISHS ARENA] Node.js 20 이상이 필요합니다.
  echo https://nodejs.org/ 에서 Node.js를 설치한 뒤 다시 실행하세요.
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

echo.
echo [ISHS ARENA] 서버를 시작합니다.
echo 이 검은 창은 게임을 하는 동안 닫지 마세요.
echo 접속 주소: http://localhost:4173
echo.

if not defined ISHS_ADMIN_PASSWORD (
  set /p ISHS_ADMIN_PASSWORD=Enter the monster-dex admin password: 
)
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:4173'"
node server.js

echo.
echo 서버가 종료되었습니다.
pause
