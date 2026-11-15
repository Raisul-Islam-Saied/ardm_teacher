@echo off
title ARDM ERP - GitHub Safe Upload
color 0B

echo ===============================================================================
echo   ARDM ENTERPRISE ERP - GITHUB SAFE SYNC AND UPLOAD WORKFLOW
echo ===============================================================================
echo.

:: Step 1: Verify Internet / GitHub Connectivity
echo [1/4] Checking network connection to github.com...
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Network connection failed! Please check your internet connection.
    pause
    exit /b 1
)
echo [OK] Network connection verified.
echo.

:: Step 2: Pull latest changes first to prevent two-PC conflict
echo [2/4] Pulling latest updates from remote repository...
git pull origin main
if errorlevel 1 (
    echo [NOTICE] Remote branch check completed or no upstream set yet.
)
echo.

:: Step 3: Stage and Commit all changes with timestamp
echo [3/4] Staging and committing project files...
git add .

for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)

set /p COMMIT_MSG="Enter commit message (Press Enter for auto-timestamp): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update ARDM ERP System (%mydate% %mytime%)

git commit -m "%COMMIT_MSG%"
echo.

:: Step 4: Push to GitHub
echo [4/4] Pushing changes to GitHub...
git push -u origin main
if errorlevel 1 (
    color 0C
    echo [ERROR] Git push failed! Verify repository URL or credentials.
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo   [SUCCESS] All changes have been safely uploaded to GitHub!
echo ===============================================================================
pause
