@echo off
setlocal enabledelayedexpansion
title Video Clipper Installer & Launcher

echo ===================================================
echo     PRE-FLIGHT SYSTEM CHECK & AUTO-INSTALLER       
echo ===================================================
echo.

:: Ensure the script runs relative to its folder location
cd /d "%~dp0"

:: Create the bins directory if it does not exist yet
if not exist "bins" (
    echo [INFO] Creating "bins" folder structure...
    mkdir "bins"
)

:: ---------------------------------------------------
:: 1. CHECK NODE.JS RUNTIME
:: ---------------------------------------------------
echo [CHECK] Verifying Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js runtime environment was NOT detected!
    echo [INFO] Fetching Node.js v20 LTS Installer...
    curl -L "https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi" -o "node_installer.msi"
    
    echo ---------------------------------------------------
    echo ATTENTION: Opening the official Node.js installation wizard.
    echo Please complete the wizard setup. Once completely installed, 
    echo close this terminal window and launch this batch file again!
    echo ---------------------------------------------------
    start /wait node_installer.msi
    del node_installer.msi
    pause
    exit
) else (
    echo [OK] Node.js is actively available.
)

:: ---------------------------------------------------
:: 2. CHECK FFMPEG EXEC
:: ---------------------------------------------------
echo [CHECK] Checking for bins\ffmpeg.exe...
if not exist "bins\ffmpeg.exe" (
    echo [WARN] ffmpeg.exe is missing from the local /bins folder.
    echo [INFO] Downloading pre-compiled static FFmpeg binary...
    curl -L "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-win-64.zip" -o "bins\ffmpeg.zip"
    
    echo [INFO] Unpacking core components via native tar...
    tar -xf "bins\ffmpeg.zip" -C "bins"
    del "bins\ffmpeg.zip"
    
    if exist "bins\ffmpeg.exe" (
        echo [OK] ffmpeg.exe has been extracted successfully to /bins.
    ) else (
        echo [ERROR] Critical error handling FFmpeg payload.
    )
) else (
    echo [OK] ffmpeg.exe is ready.
)

:: ---------------------------------------------------
:: 3. CHECK YT-DLP EXEC
:: ---------------------------------------------------
echo [CHECK] Checking for bins\yt-dlp.exe...
if not exist "bins\yt-dlp.exe" (
    echo [WARN] yt-dlp.exe is missing from the local /bins folder.
    echo [INFO] Pulling the latest standalone build from GitHub...
    curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o "bins\yt-dlp.exe"
    
    if exist "bins\yt-dlp.exe" (
        echo [OK] yt-dlp.exe has been saved successfully to /bins.
    ) else (
        echo [ERROR] High priority breakdown downloading yt-dlp.exe.
    )
) else (
    echo [OK] yt-dlp.exe is ready.
)

:: ---------------------------------------------------
:: 4. CHECK NODE MODULE PACKAGES
:: ---------------------------------------------------
echo [CHECK] Auditing frontend framework dependencies...
if not exist "node_modules" (
    echo [WARN] node_modules folder missing. Constructing web dependency tree...
    echo [INFO] Executing npm install...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Network timeout or syntax fault inside package.json tree.
        pause
        exit /b
    )
    echo [OK] Core packages fully synced from registry.
) else (
    echo [OK] Dependencies matching node_modules footprint.
)

:: ---------------------------------------------------
:: 5. INITIALIZE APP ENGINE
:: ---------------------------------------------------
echo.
echo ===================================================
echo     ENVIRONMENT VERIFIED! BOOTING APPLICATION      
echo ===================================================
echo.

call npm run dev
pause