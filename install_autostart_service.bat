@echo off
setlocal
cd /d "%~dp0"
set "TASK_NAME=EHS_Dashboard_Silent_Server"
set "VBS_PATH=%~dp0start_silent.vbs"

echo ====================================================================
echo   Registering EHS Dashboard Silent Background Service
echo ====================================================================
echo.
echo Server launcher: %VBS_PATH%
echo Trigger: Runs silently at Windows login (0 terminal windows)
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "wscript.exe \"%VBS_PATH%\"" /SC ONLOGON /F >nul 2>nul
if errorlevel 1 (
    echo [INFO] Registering standard user login task...
    schtasks /Create /TN "%TASK_NAME%" /TR "wscript.exe \"%VBS_PATH%\"" /SC ONLOGON /F
)

echo.
echo [OK] EHS Dashboard is now registered to start automatically in the background.
echo On every PC reboot or sign-in, the server runs quietly with NO terminal windows.
echo.
pause

