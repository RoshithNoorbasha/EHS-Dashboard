' Greenko Pinnapuram Cluster EHS Dashboard - Silent Background Launcher
' Starts FastAPI backend and Vite frontend silently in the background (0 terminal windows).
' Git Auto-Sync runs automatically inside the backend.
' Cloudflare Quick Tunnel is generated on-demand by EHS Admin from the dashboard.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

backendScript = scriptDir & "\backend\run.bat"
frontendScript = scriptDir & "\frontend\run.bat"

' 1. Start FastAPI backend silently on port 8001
WshShell.Run """" & backendScript & """", 0, False

WScript.Sleep 2500

' 2. Start Vite frontend silently on port 5174
WshShell.Run """" & frontendScript & """", 0, False

WScript.Sleep 3500

' 3. Open default browser to EHS Dashboard
WshShell.Run "http://localhost:5174", 1, False
