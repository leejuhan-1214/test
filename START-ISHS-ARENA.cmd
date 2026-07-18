@echo off
setlocal
cd /d "%~dp0"
title ISHS ARENA SERVER

where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING

echo.
echo ISHS ARENA server is starting.
echo Keep this window open while playing.
echo Open this address in Chrome: http://localhost:4173
echo.
if not defined ISHS_ADMIN_PASSWORD (
  set /p ISHS_ADMIN_PASSWORD=Enter the monster-dex admin password: 
)
node server.js
echo.
echo The server has stopped.
pause
exit /b 0

:NODE_MISSING
echo.
echo Node.js 20 or newer is not installed.
echo Install Node.js from https://nodejs.org/
echo Then run this file again.
echo.
pause
exit /b 1
