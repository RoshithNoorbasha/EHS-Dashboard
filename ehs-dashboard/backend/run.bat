@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: 1. Auto-repair pyvenv.cfg if python on this PC is at a different location
set "LOCAL_PY="
for /f "delims=" %%p in ('where python 2^>nul') do (
    if not defined LOCAL_PY set "LOCAL_PY=%%p"
)

if defined LOCAL_PY (
    for %%i in ("!LOCAL_PY!") do set "LOCAL_PYDIR=%%~dpi"
    if "!LOCAL_PYDIR:~-1!"=="\" set "LOCAL_PYDIR=!LOCAL_PYDIR:~0,-1!"
    if exist "venv\pyvenv.cfg" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$cfg = 'venv\pyvenv.cfg'; if (Test-Path $cfg) { $c = Get-Content $cfg; $p = (Get-Command python -ErrorAction SilentlyContinue).Source; if ($p) { $d = Split-Path $p; $c = $c -replace '^home\s*=.*', ('home = ' + $d); $c = $c -replace '^executable\s*=.*', ('executable = ' + $p); Set-Content $cfg $c } }" >nul 2>nul
    )
)

:: 2. Choose executable: venv\Scripts\python.exe if working, otherwise system python with venv PYTHONPATH
set "PY_CMD="
if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" -c "import sys" >nul 2>nul
    if not errorlevel 1 (
        set "PY_CMD="%~dp0venv\Scripts\python.exe""
    )
)

if not defined PY_CMD (
    set "PY_CMD=python"
    set "PYTHONPATH=%~dp0venv\Lib\site-packages;!PYTHONPATH!"
)

:: 3. Launch Uvicorn
!PY_CMD! -m uvicorn --app-dir "%~dp0." --reload-dir "%~dp0." main:app --reload --host 0.0.0.0 --port 8001
