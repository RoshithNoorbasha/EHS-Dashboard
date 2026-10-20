' Greenko Pinnapuram Cluster EHS Dashboard - Silent Background Launcher
' Starts FastAPI backend, Vite frontend, and Cloudflare Quick Tunnel in the background (0 windows).

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Start FastAPI backend silently on port 8001
backendCmd = "cmd /c cd /d """ & scriptDir & "\backend"" && call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8001"
WshShell.Run backendCmd, 0, False

WScript.Sleep 2500

' 2. Start Vite frontend silently on port 5174
frontendCmd = "cmd /c cd /d """ & scriptDir & "\frontend"" && npm run dev -- --host 0.0.0.0 --port 5174"
WshShell.Run frontendCmd, 0, False

WScript.Sleep 2500

' 3. Start Cloudflare Quick Tunnel if cloudflared exists
userProfile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%")
tempDir = WshShell.ExpandEnvironmentStrings("%TEMP%")

cfExe = ""
If fso.FileExists(userProfile & "\bin\cloudflared.exe") Then
    cfExe = userProfile & "\bin\cloudflared.exe"
ElseIf fso.FileExists(scriptDir & "\cloudflared.exe") Then
    cfExe = scriptDir & "\cloudflared.exe"
End If

If cfExe <> "" Then
    If fso.FileExists(tempDir & "\ehs_cf.log") Then
        fso.DeleteFile tempDir & "\ehs_cf.log", True
    End If
    If fso.FileExists(scriptDir & "\tunnel_url.txt") Then
        fso.DeleteFile scriptDir & "\tunnel_url.txt", True
    End If
    
    cfCmd = "cmd /c """"" & cfExe & """ tunnel --url http://127.0.0.1:5174 --logfile """ & tempDir & "\ehs_cf.log""""
    WshShell.Run cfCmd, 0, False
    
    ' Poll for tunnel URL quietly
    WScript.Sleep 4000
    psCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\get_tunnel_url.ps1"""
    WshShell.Run psCmd, 0, False
End If
