param(
    [string]$LogFile = "$env:TEMP\ehs_cf.log",
    [string]$OutputFile = "$PSScriptRoot\tunnel_url.txt",
    [int]$TimeoutSeconds = 30
)

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$foundUrl = $null

Write-Host "Connecting to Cloudflare Quick Tunnel..." -ForegroundColor Cyan

while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    if (Test-Path $LogFile) {
        $content = Get-Content -Path $LogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $match = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
            if ($match.Success) {
                $foundUrl = $match.Value
                break
            }
        }
    }
    Start-Sleep -Milliseconds 800
}

if ($foundUrl) {
    $foundUrl | Set-Content -Path $OutputFile -Force
    try {
        Set-Clipboard -Value $foundUrl
        $copied = $true
    } catch {
        $copied = $false
    }
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "  CLOUDFLARE QUICK TUNNEL LIVE!" -ForegroundColor Green
    Write-Host "  Public URL: $foundUrl" -ForegroundColor Yellow
    if ($copied) {
        Write-Host "  Status: Link automatically copied to clipboard! (Ctrl+V)" -ForegroundColor Cyan
    }
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[WARNING] Cloudflare URL took longer than expected to appear." -ForegroundColor Yellow
    Write-Host "Check the 'EHS Dashboard - Cloudflare Quick Tunnel' window for status." -ForegroundColor Gray
}
