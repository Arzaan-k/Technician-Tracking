# Start Both Servers Script
# This script starts both Service Hub and Technician Tracking servers

Write-Host "🚀 Starting Centralized Authentication System" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Service Hub directory exists
if (-not (Test-Path "c:\Users\user\Downloads\service-hub")) {
    Write-Host "❌ Service Hub directory not found!" -ForegroundColor Red
    Write-Host "   Expected: c:\Users\user\Downloads\service-hub" -ForegroundColor White
    exit 1
}

# Check if Technician Tracking directory exists
if (-not (Test-Path "c:\Users\user\Downloads\Technician-Tracking")) {
    Write-Host "❌ Technician Tracking directory not found!" -ForegroundColor Red
    Write-Host "   Expected: c:\Users\user\Downloads\Technician-Tracking" -ForegroundColor White
    exit 1
}

Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "   This script will open TWO terminal windows:" -ForegroundColor White
Write-Host "   1. Service Hub (Port 5000)" -ForegroundColor White
Write-Host "   2. Technician Tracking (Port 3000)" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   - Keep BOTH terminal windows open" -ForegroundColor White
Write-Host "   - Service Hub MUST be running for login to work" -ForegroundColor White
Write-Host "   - Press Ctrl+C in each window to stop the servers" -ForegroundColor White
Write-Host ""

# Start Service Hub in a new terminal
Write-Host "🔵 Starting Service Hub on port 5000..." -ForegroundColor Blue
$serviceHubCmd = "cd 'c:\Users\user\Downloads\service-hub'; Write-Host '🔵 SERVICE HUB SERVER' -ForegroundColor Blue; Write-Host 'Port: 5000' -ForegroundColor White; Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow; Write-Host ''; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serviceHubCmd

# Wait a bit for Service Hub to start
Write-Host "   Waiting 5 seconds for Service Hub to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Technician Tracking in a new terminal
Write-Host "🟢 Starting Technician Tracking on port 3000..." -ForegroundColor Green
$trackingCmd = "cd 'c:\Users\user\Downloads\Technician-Tracking\server'; Write-Host '🟢 TECHNICIAN TRACKING SERVER' -ForegroundColor Green; Write-Host 'Port: 3000' -ForegroundColor White; Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow; Write-Host ''; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $trackingCmd

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host "   Service Hub: http://localhost:5000" -ForegroundColor White
Write-Host "   Technician Tracking: http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Wait for both servers to finish starting (check the terminal windows)" -ForegroundColor White
Write-Host "   2. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "   3. Try logging in with your credentials" -ForegroundColor White
Write-Host ""

Write-Host "🧪 To test the authentication:" -ForegroundColor Yellow
Write-Host "   Run: .\test-centralized-auth.ps1" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Remember: Keep both terminal windows open!" -ForegroundColor Red
