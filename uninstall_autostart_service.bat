@echo off
setlocal
echo ====================================================================
echo   Removing EHS Dashboard Background Startup Service
echo ====================================================================
schtasks /Delete /TN "EHS_Dashboard_Silent_Server" /F >nul 2>nul
echo [OK] Background startup task removed.
echo.
pause

