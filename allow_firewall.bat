@echo off
setlocal
cd /d "%~dp0"

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ====================================================================
    echo   [ELEVATION REQUIRED] Requesting Administrator Permission...
    echo ====================================================================
    echo.
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ====================================================================
echo   Greenko Pinnapuram EHS Dashboard - Windows Firewall Setup
echo ====================================================================
echo.
echo [1/2] Allowing Frontend port 5174 through Windows Firewall...
netsh advfirewall firewall delete rule name="EHS Dashboard (Vite 5174)" >nul 2>&1
netsh advfirewall firewall add rule name="EHS Dashboard (Vite 5174)" dir=in action=allow protocol=TCP localport=5174 profile=any

echo [2/2] Allowing Backend port 8001 through Windows Firewall...
netsh advfirewall firewall delete rule name="EHS Dashboard (API 8001)" >nul 2>&1
netsh advfirewall firewall add rule name="EHS Dashboard (API 8001)" dir=in action=allow protocol=TCP localport=8001 profile=any

echo.
echo ====================================================================
echo   SUCCESS! Firewall rules have been added.
echo.
echo   Other devices (phones, laptops, tablets) on the same Wi-Fi
echo   can now open:
python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print('   -> http://' + s.getsockname()[0] + ':5174'); s.close()" 2>nul
echo ====================================================================
echo.
pause
