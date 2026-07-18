@echo off
setlocal
title Connect ISHS ARENA to GitHub

echo.
echo This window connects this computer to GitHub.
echo A browser page will open with a one-time code.
echo Sign in as: leejuhan-1214
echo.
git credential-manager github login --username leejuhan-1214 --device

echo.
echo If you see a success message, GitHub is connected.
echo You can close this window and return to Codex.
pause
