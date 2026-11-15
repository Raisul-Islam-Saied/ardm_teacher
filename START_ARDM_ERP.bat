@echo off
title ARDM Enterprise ERP - Launcher
color 0A

echo ===============================================================================
echo   ABDUR RAZZAQ DAKHIL MADRASAH - ENTERPRISE ERP SYSTEM
echo   Starting Backend Server (Port 5000) and Frontend Client (Port 5173)...
echo ===============================================================================
echo.

:: Detect Local LAN IPv4 Address for ZKTeco K40 ADMS Configuration
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
:ip_found
if defined LOCAL_IP set LOCAL_IP=%LOCAL_IP:~1%

echo [INFO] Local LAN IP for ZKTeco K40 ADMS Server: %LOCAL_IP% (Port: 5000)
echo.

:: Start Backend Server in a new window
if exist "%~dp0server\package.json" (
    echo [1/2] Starting Express + MongoDB Backend Server...
    start "ARDM ERP - Backend Server (Port 5000)" cmd /k "cd /d "%~dp0server" && npm run dev"
) else (
    echo [ERROR] server\package.json not found!
)

:: Wait 3 seconds before launching Frontend
timeout /t 3 /nobreak >nul

:: Start Frontend Vite Client in a new window
if exist "%~dp0client\package.json" (
    echo [2/2] Starting React + Vite Frontend Client...
    start "ARDM ERP - Frontend Client (Port 5173)" cmd /k "cd /d "%~dp0client" && npm run dev"
) else (
    echo [ERROR] client\package.json not found!
)

timeout /t 3 /nobreak >nul
echo.
echo [SUCCESS] Opening ARDM Enterprise ERP in default browser...
start http://localhost:5173

echo ===============================================================================
echo   System is now running! Keep the Server and Client terminal windows open.
echo ===============================================================================
timeout /t 5
exit
