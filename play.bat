@echo off
title TURBO VELOCITY 4K & NITRO TYPIST 3D
echo ====================================================================
echo   🏎️  TURBO VELOCITY 4K & NITRO TYPIST 3D RACER
echo   Launching game in your default browser at http://localhost:3000...
echo ====================================================================
timeout /t 1 >nul
start "" "http://localhost:3000"
node server.js
pause
