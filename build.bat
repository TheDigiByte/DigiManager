@echo off
setlocal enabledelayedexpansion
title DigiManager - Build Launcher
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
if exist "%ROOT_DIR%DigiManager\package.json" (
    cd /d "%ROOT_DIR%DigiManager"
) else if exist "%ROOT_DIR%package.json" (
    cd /d "%ROOT_DIR%"
) else (
    echo [ERROR] Cannot find DigiManager project directory!
    pause
    exit /b 1
)

REM Kill running instance if any and wait for file lock release
taskkill /F /IM digimanager.exe /IM DigiManager.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Get current version using set-version script
for /f "delims=" %%v in ('node scripts/set-version.cjs') do set "CUR_VER=%%v"
if "%CUR_VER%"=="" set "CUR_VER=0.1.0"

echo.
echo ================================================================
echo               DIGIMANAGER - BUILD LAUNCHER
echo ================================================================
echo.
echo  Working Directory : %CD%
echo  Current Version   : v%CUR_VER%
echo ================================================================
echo.
set /p "TARGET_VER=Enter build version (Press Enter to keep %CUR_VER%): "

if not "%TARGET_VER%"=="" (
    for /f "tokens=1,2 delims=:" %%a in ('node scripts/set-version.cjs "%TARGET_VER%"') do (
        if "%%a"=="UPDATED" (
            set "CUR_VER=%%b"
            echo.
            echo [OK] Version updated to v%%b across all configs:
            echo      - package.json
            echo      - src-tauri\tauri.conf.json
            echo      - src-tauri\Cargo.toml
            echo      - src\config.ts
            echo.
        )
    )
)

echo.
echo  Selected Target Version: v%CUR_VER%
echo.
echo  [1] Build Portable Application (.exe) - Fast and Recommended
echo  [2] Build Complete MSI Installer (.msi bundle)
echo  [3] Build Frontend Only (Vite + TypeScript)
echo  [4] Run in Development Mode (npm run tauri dev)
echo  [5] Edit Application Metadata & Version Info
echo.
set /p "CHOICE=Select an option [1-5] (Default: 1): "

if "%CHOICE%"=="" set "CHOICE=1"

if "%CHOICE%"=="1" goto BUILD_PORTABLE
if "%CHOICE%"=="2" goto BUILD_MSI
if "%CHOICE%"=="3" goto BUILD_FRONTEND
if "%CHOICE%"=="4" goto RUN_DEV
if "%CHOICE%"=="5" goto EDIT_METADATA

echo Invalid choice. Defaulting to Option 1.
goto BUILD_PORTABLE

:EDIT_METADATA
node scripts/edit-metadata.cjs
pause
exit /b 0

:BUILD_FRONTEND
echo.
echo ================================================================
echo  [Step 1/1] Building Frontend (TypeScript + Vite)...
echo ================================================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend build failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [SUCCESS] Frontend built successfully in /dist
echo.
pause
exit /b 0

:RUN_DEV
echo.
echo ================================================================
echo  Starting DigiManager in Development Mode...
echo ================================================================
call npm run tauri dev
pause
exit /b 0

:BUILD_PORTABLE
echo.
echo ================================================================
echo  [Step 1/2] Building Frontend (TypeScript + Vite)...
echo ================================================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend build failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================================================
echo  [Step 2/2] Building Standalone Portable .exe...
echo ================================================================
call npx @tauri-apps/cli build --no-bundle
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================================================
echo                 [BUILD COMPLETED SUCCESSFULLY]
echo ================================================================
echo.
if exist "src-tauri\target\release\DigiManager.exe" (
    echo  Executable Location:
    echo  %CD%\src-tauri\target\release\DigiManager.exe
    echo.
) else if exist "src-tauri\target\release\digimanager.exe" (
    echo  Executable Location:
    echo  %CD%\src-tauri\target\release\digimanager.exe
    echo.
)
pause
exit /b 0

:BUILD_MSI
echo.
echo ================================================================
echo  [Step 1/2] Building Frontend (TypeScript + Vite)...
echo ================================================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend build failed with exit code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================================================
echo  [Step 2/2] Building Full MSI Installer Bundle...
echo ================================================================
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] MSI Bundle build failed with exit code %ERRORLEVEL%
    echo [TIP] If "Access is denied", please close any running DigiManager or installer window.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================================================
echo                 [BUILD COMPLETED SUCCESSFULLY]
echo ================================================================
echo.
if exist "src-tauri\target\release\bundle\msi" (
    echo  MSI Installer Location:
    echo  %CD%\src-tauri\target\release\bundle\msi\
    echo.
)
if exist "src-tauri\target\release\DigiManager.exe" (
    echo  Executable Location:
    echo  %CD%\src-tauri\target\release\DigiManager.exe
    echo.
) else if exist "src-tauri\target\release\digimanager.exe" (
    echo  Executable Location:
    echo  %CD%\src-tauri\target\release\digimanager.exe
    echo.
)
pause
exit /b 0
