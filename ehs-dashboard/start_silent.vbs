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
WshShell.Run "cmd /c """ & backendScript & """", 0, False

WScript.Sleep 2500

' 2. Start Vite frontend silently on port 5174
WshShell.Run "cmd /c """ & frontendScript & """", 0, False

WScript.Sleep 3500

' 3. Detect Real Network IP (Wi-Fi / Ethernet LAN IP) to open directly instead of localhost
Function ResolveNetworkIP()
    Dim pyExe, oExec, line
    ResolveNetworkIP = "localhost"
    On Error Resume Next

    ' Check bundled venv python first (offline-safe UDP socket route detection)
    pyExe = ""
    If fso.FileExists(scriptDir & "\backend\venv\Scripts\python.exe") Then
        pyExe = scriptDir & "\backend\venv\Scripts\python.exe"
    ElseIf fso.FileExists(scriptDir & "\ehs-dashboard\backend\venv\Scripts\python.exe") Then
        pyExe = scriptDir & "\ehs-dashboard\backend\venv\Scripts\python.exe"
    Else
        pyExe = "python"
    End If

    Set oExec = WshShell.Exec("""" & pyExe & """ -c ""import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); print(s.getsockname()[0]); s.close()""")
    If Err.Number = 0 And Not oExec Is Nothing Then
        Do While oExec.Status = 0
            WScript.Sleep 50
        Loop
        line = Trim(oExec.StdOut.ReadLine())
        If Len(line) >= 7 And InStr(line, ".") > 0 And Left(line, 4) <> "127." Then
            ResolveNetworkIP = line
            Exit Function
        End If
    End If

    ' Fallback to PowerShell Get-NetIPAddress
    Err.Clear
    Set oExec = WshShell.Exec("powershell -NoProfile -ExecutionPolicy Bypass -Command ""try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' }).IPAddress[0] } catch {}""")
    If Err.Number = 0 And Not oExec Is Nothing Then
        Do While oExec.Status = 0
            WScript.Sleep 50
        Loop
        line = Trim(oExec.StdOut.ReadLine())
        If Len(line) >= 7 And InStr(line, ".") > 0 And Left(line, 4) <> "127." Then
            ResolveNetworkIP = line
            Exit Function
        End If
    End If
End Function

netIP = ResolveNetworkIP()

' 4. Open default browser directly to the Network IP (e.g. http://192.168.1.xxx:5174 or http://10.xxx:5174)
WshShell.Run "http://" & netIP & ":5174", 1, False
