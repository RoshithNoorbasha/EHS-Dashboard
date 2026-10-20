@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Handle command argument
if "%1"=="" goto default_action
if /i "%1"=="install" goto install
if /i "%1"=="run" goto run
if /i "%1"=="silent" goto run_silent
if /i "%1"=="status" goto show_status
if /i "%1"=="tunnel" goto tunnel_only
if /i "%1"=="local" goto run_local
if /i "%1"=="stop" goto stop_all
goto usage

:default_action
if not exist "backend\venv" goto install
if not exist "frontend\node_modules" goto install
goto run

:usage
echo.
echo   Usage:
echo     start.bat            - Start backend, frontend, and Cloudflare Quick Tunnel
echo     start.bat run        - Start backend, frontend, and Cloudflare Quick Tunnel (with windows)
echo     start.bat silent     - Start EVERYTHING silently in the BACKGROUND (no terminal windows!)
echo     start.bat status     - Check server status, ports, and Cloudflare tunnel URL
echo     start.bat local      - Start backend and frontend only (no Cloudflare tunnel)
echo     start.bat tunnel     - Start Cloudflare Quick Tunnel only
echo     start.bat stop       - Stop all background dashboard and tunnel processes
echo     start.bat install    - Set up Python venv and install all dependencies
echo.
goto end

:find_cloudflared
set "CF_EXE="
where cloudflared >nul 2>nul
if not errorlevel 1 set "CF_EXE=cloudflared"

if "!CF_EXE!"=="" (
    if exist "%USERPROFILE%\bin\cloudflared.exe" set "CF_EXE=%USERPROFILE%\bin\cloudflared.exe"
)
if "!CF_EXE!"=="" (
    if exist "%LOCALAPPDATA%\cloudflared\cloudflared.exe" set "CF_EXE=%LOCALAPPDATA%\cloudflared\cloudflared.exe"
)
if "!CF_EXE!"=="" (
    if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF_EXE=%ProgramFiles%\cloudflared\cloudflared.exe"
)
if "!CF_EXE!"=="" (
    if exist "%~dp0cloudflared.exe" set "CF_EXE=%~dp0cloudflared.exe"
)

if "!CF_EXE!"=="" (
    echo.
    echo [INFO] Cloudflared was not found. Downloading cloudflared automatically...
    if not exist "%USERPROFILE%\bin" mkdir "%USERPROFILE%\bin"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%USERPROFILE%\bin\cloudflared.exe' -UseBasicParsing"
    if exist "%USERPROFILE%\bin\cloudflared.exe" (
        set "CF_EXE=%USERPROFILE%\bin\cloudflared.exe"
        echo [OK] Cloudflared downloaded to %USERPROFILE%\bin\cloudflared.exe
    ) else (
        echo [WARNING] Automatic cloudflared download failed. Proceeding without tunnel.
    )
)
exit /b 0

:install
echo.
echo === Checking prerequisites ===
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python was not found on PATH. Install Python 3.11+ from https://www.python.org/downloads/ and re-run.
    goto end
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js/npm was not found on PATH. Install Node 18+ from https://nodejs.org/ and re-run.
    goto end
)

echo.
echo === Setting up backend (Python venv) ===
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat
python --version
pip install --upgrade pip setuptools wheel >nul
pip install --prefer-binary -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Backend dependency install failed - see above.
    echo If pip tried to COMPILE pandas from source (mentions ninja/meson/Cython),
    echo it means no pre-built wheel exists for your Python version yet.
    echo Fix: install Python 3.11 or 3.12 from https://www.python.org/downloads/
    echo      then delete the "backend\venv" folder and re-run "start.bat install".
    cd ..
    goto end
)
echo Seeding sample data...
python seed.py
call venv\Scripts\deactivate.bat
cd ..

echo.
echo === Setting up frontend (npm) ===
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend dependency install failed.
    cd ..
    goto end
)
cd ..

call :find_cloudflared

echo.
echo === Install complete ===
echo Run "start.bat run" or double-click "start.bat" to launch the dashboard.
goto end

:run_local
if not exist "backend\venv" (
    echo [ERROR] Backend not installed yet. Run "start.bat install" first.
    goto end
)
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend not installed yet. Run "start.bat install" first.
    goto end
)

echo.
echo === Starting backend on http://0.0.0.0:8001 (Local ^& Network) ===
start "EHS Dashboard - Backend (FastAPI)" cmd /k "title EHS Dashboard - Backend (FastAPI) && cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8001"

ping 127.0.0.1 -n 3 >nul

echo === Starting frontend on http://0.0.0.0:5174 (Local ^& Network) ===
start "EHS Dashboard - Frontend (Vite)" cmd /k "title EHS Dashboard - Frontend (Vite) && cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5174"

ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:5174"

echo.
echo ====================================================================
echo   Both servers are running in separate windows.
echo   Local access:       http://localhost:5174
for /f "tokens=*" %%i in ('python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do (
    echo   Same Wi-Fi Access:  http://%%i:5174  (Share with other devices!)
)
echo   Backend API:        http://localhost:8001
echo   API docs:           http://localhost:8001/docs
echo.
echo   * NOTE: If other devices on Wi-Fi cannot connect, run: allow_firewall.bat
echo ====================================================================
goto end

:tunnel_only
call :find_cloudflared
if "!CF_EXE!"=="" (
    echo [ERROR] Cloudflared is not available.
    goto end
)
if exist "%TEMP%\ehs_cf.log" del /f /q "%TEMP%\ehs_cf.log" >nul 2>nul
if exist "%~dp0tunnel_url.txt" del /f /q "%~dp0tunnel_url.txt" >nul 2>nul

echo.
echo === Starting Cloudflare Quick Tunnel ===
start "EHS Dashboard - Cloudflare Quick Tunnel" "!CF_EXE!" tunnel --url http://127.0.0.1:5174 --logfile "%TEMP%\ehs_cf.log"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get_tunnel_url.ps1"
goto end

:run
if not exist "backend\venv" (
    echo [ERROR] Backend not installed yet. Run "start.bat install" first.
    goto end
)
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend not installed yet. Run "start.bat install" first.
    goto end
)

call :find_cloudflared

echo.
echo ====================================================================
echo   Starting EHS Dashboard with Cloudflare Quick Tunnel
echo ====================================================================

echo [1/3] Starting backend API on http://0.0.0.0:8001...
start "EHS Dashboard - Backend (FastAPI)" cmd /k "title EHS Dashboard - Backend (FastAPI) && cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8001"

ping 127.0.0.1 -n 3 >nul

echo [2/3] Starting frontend Vite server on http://0.0.0.0:5174...
start "EHS Dashboard - Frontend (Vite)" cmd /k "title EHS Dashboard - Frontend (Vite) && cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5174"

ping 127.0.0.1 -n 3 >nul

if "!CF_EXE!"=="" goto skip_tunnel

echo [3/3] Launching Cloudflare Quick Tunnel on port 5174...
if exist "%TEMP%\ehs_cf.log" del /f /q "%TEMP%\ehs_cf.log" >nul 2>nul
if exist "%~dp0tunnel_url.txt" del /f /q "%~dp0tunnel_url.txt" >nul 2>nul
start "EHS Dashboard - Cloudflare Quick Tunnel" "!CF_EXE!" tunnel --url http://127.0.0.1:5174 --logfile "%TEMP%\ehs_cf.log"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get_tunnel_url.ps1"
goto after_tunnel

:skip_tunnel
echo [3/3] Cloudflare tunnel skipped (cloudflared not available).

:after_tunnel
ping 127.0.0.1 -n 2 >nul
start "" "http://localhost:5174"

echo.
echo ====================================================================
echo   EHS DASHBOARD ACCESS POINTS:
echo ====================================================================
echo   This PC (Localhost):    http://localhost:5174
for /f "tokens=*" %%i in ('python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do (
    echo   Same Wi-Fi Access:      http://%%i:5174  (Share with other devices!)
)
if exist "%~dp0tunnel_url.txt" (
    for /f "usebackq delims=" %%u in ("%~dp0tunnel_url.txt") do (
        echo   Cloudflare Remote:      %%u  (Public access from anywhere)
    )
)
echo   Backend API:            http://localhost:8001
echo   API Docs:               http://localhost:8001/docs
echo.
echo   * NOTE: If other devices on Wi-Fi cannot connect, run: allow_firewall.bat
echo ====================================================================
echo.
echo All services are running in separate windows.
echo To stop everything: run "start.bat stop" or close the console windows.
echo.
goto end

:run_silent
if not exist "backend\venv" (
    echo [ERROR] Backend not installed yet. Run "start.bat install" first.
    goto end
)
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend not installed yet. Run "start.bat install" first.
    goto end
)

echo.
echo ====================================================================
echo   Launching EHS Dashboard Silently in the Background
echo ====================================================================
echo   - No terminal command prompt windows will be shown.
echo   - Services will run in the background quietly.
echo.

wscript "%~dp0start_silent.vbs"

echo [OK] Background processes dispatched.
echo Waiting 5 seconds for initialization...
ping 127.0.0.1 -n 6 >nul

goto show_status

:show_status
echo.
echo ====================================================================
echo   EHS Dashboard Server Status
echo ====================================================================
echo.
netstat -aon | findstr :8001 | findstr LISTENING >nul
if not errorlevel 1 (
    echo   [UP] Backend API:       http://localhost:8001  (Listening on port 8001)
) else (
    echo   [DOWN] Backend API:     Offline (Port 8001 not listening)
)

netstat -aon | findstr :5174 | findstr LISTENING >nul
if not errorlevel 1 (
    echo   [UP] Frontend UI:       http://localhost:5174  (Listening on port 5174)
) else (
    echo   [DOWN] Frontend UI:     Offline (Port 5174 not listening)
)

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr /I "cloudflared.exe" >nul
if not errorlevel 1 (
    if exist "%~dp0tunnel_url.txt" (
        for /f "usebackq delims=" %%u in ("%~dp0tunnel_url.txt") do (
            echo   [UP] Cloudflare Tunnel: %%u  (Active)
        )
    ) else (
        echo   [UP] Cloudflare Tunnel: Active (Acquiring URL...)
    )
) else (
    echo   [DOWN] Cloudflare Tunnel: Inactive
)
echo.
echo To stop everything at any time, run: start.bat stop
echo.
goto end

:stop_all
echo.
echo ====================================================================
echo   Stopping all EHS Dashboard background services
echo ====================================================================
echo [1/3] Stopping Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>nul

echo [2/3] Closing active console windows...
taskkill /F /FI "WINDOWTITLE eq EHS Dashboard*" >nul 2>nul

echo [3/3] Terminating any silent background listeners on ports 8001 and 5174...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)

if exist "%~dp0tunnel_url.txt" del /f /q "%~dp0tunnel_url.txt" >nul 2>nul
echo [OK] All dashboard services stopped cleanly.
goto end

:end
endlocal

