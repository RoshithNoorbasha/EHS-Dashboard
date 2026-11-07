@echo off
cd /d "%~dp0"
"%~dp0venv\Scripts\python.exe" -m uvicorn --app-dir "%~dp0." --reload-dir "%~dp0." main:app --reload --host 0.0.0.0 --port 8001
