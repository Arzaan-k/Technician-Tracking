# Kill all browser processes
Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 1

# Clear Chrome cache
Remove-Item -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\*" -Recurse -Force -ErrorAction SilentlyContinue

# Clear Edge cache  
Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Browser caches cleared"

# Try Chrome first, fallback to Edge
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromePath) {
    Start-Process $chromePath -ArgumentList "--incognito","--disable-cache","--disable-application-cache","--disable-offline-load-stale-cache","--disk-cache-size=0","http://localhost:5173"
    Write-Host "✅ Opened in Chrome Incognito (no cache mode)"
} else {
    Start-Process msedge.exe -ArgumentList "-inprivate","http://localhost:5173"
    Write-Host "✅ Opened in Edge InPrivate"
}

Write-Host ""
Write-Host "==================================="
Write-Host "🔐 LOGIN CREDENTIALS:"
Write-Host "==================================="
Write-Host "Email: tech@test.com"
Write-Host "Password: test123"
Write-Host "==================================="
Write-Host ""

