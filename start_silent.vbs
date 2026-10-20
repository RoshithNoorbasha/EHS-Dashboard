Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
targetVbs = scriptDir & "\ehs-dashboard\start_silent.vbs"
WshShell.Run "wscript """ & targetVbs & """", 0, False
