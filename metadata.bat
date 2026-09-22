@echo off
setlocal
title DigiManager Metadata Editor
chcp 65001 >nul

set "APP_DIR=C:\xampp\htdocs\D\_DigiManager\DigiManager"
if exist "%~dp0package.json" set "APP_DIR=%~dp0"
if exist "%~dp0DigiManager\package.json" set "APP_DIR=%~dp0DigiManager"

cd /d "%APP_DIR%"

taskkill /F /IM digimanager.exe /IM DigiManager.exe >nul 2>&1
timeout /t 1 /nobreak >nul

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in your system PATH.
    pause
    exit /b 1
)

if not exist "node_modules\resedit" (
    echo [INFO] Installing required metadata library resedit...
    call npm i -D resedit
)

if "%~1"=="" goto RUN_DEFAULT
node scripts\edit-metadata.cjs "%~1"
goto FINISH

:RUN_DEFAULT
node scripts\edit-metadata.cjs
goto FINISH

:FINISH
pause
