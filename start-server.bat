@echo off
title Asaph Servers [Port 8080]
echo ----------------------------------------------------
echo 🪐 Starting Asaph Legacy 2017 Server Stack...
echo ----------------------------------------------------

:: 1. Validate if Bun runtime is installed on the system
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Bun runtime engine is missing!
    echo Please install it using PowerShell or visit https://bun.sh
    pause
    exit /b
)

:: 2. Cache background package modules if missing
if not exist node_modules (
    echo [📦] Downloading missing runtime dependencies...
    call bun install
)

:: 3. Launch the server loop
echo [🌐] Initializing server loops on ports 3000 and 8080...
call bun run start
pause
