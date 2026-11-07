' Creates a Windows Desktop shortcut to launch EHS Dashboard silently in background
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopPath = WshShell.SpecialFolders("Desktop")

shortcutPath = desktopPath & "\EHS Dashboard (Silent Server).lnk"
Set shortcut = WshShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = """" & scriptDir & "\start_silent.vbs"""
shortcut.WorkingDirectory = scriptDir
shortcut.Description = "Launch Greenko Pinnapuram EHS Dashboard Silently in Background"
shortcut.WindowStyle = 7 ' Minimized
shortcut.Save

WScript.Echo "Desktop shortcut created successfully: " & vbCrLf & shortcutPath

