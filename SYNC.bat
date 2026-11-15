@echo off
title ARDM ERP - GitHub Pre-Work Sync
color 0E

echo ===============================================================================
echo   ARDM ENTERPRISE ERP - PRE-WORK GITHUB PULL & SYNC
echo ===============================================================================
echo.

echo [1/2] Checking internet connection...
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Offline! Cannot sync latest changes from GitHub. Halting to prevent conflict.
    pause
    exit /b 1
)

echo [2/2] Pulling latest code from GitHub...
git pull origin main
if errorlevel 1 (
    color 0C
    echo [ERROR] Git pull encountered a conflict or error. Resolve before editing.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Workspace is 100%% synced and ready for work!
timeout /t 4
