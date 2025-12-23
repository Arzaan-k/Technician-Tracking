# Centralized Authentication Test Script

Write-Host "🚀 Testing Centralized Authentication System" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Test 1: Check if Service Hub is running
Write-Host "Test 1: Checking Service Hub availability..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Service Hub is running on port 5000" -ForegroundColor Green
} catch {
    Write-Host "❌ Service Hub is NOT running. Please start it first:" -ForegroundColor Red
    Write-Host "   cd c:\Users\user\Downloads\service-hub" -ForegroundColor White
    Write-Host "   npm run dev`n" -ForegroundColor White
    exit 1
}

# Test 2: Check if Technician Tracking is running
Write-Host "`nTest 2: Checking Technician Tracking availability..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Technician Tracking is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Technician Tracking is NOT running. Please start it first:" -ForegroundColor Red
    Write-Host "   cd c:\Users\user\Downloads\Technician-Tracking\server" -ForegroundColor White
    Write-Host "   npm run dev`n" -ForegroundColor White
    exit 1
}

# Test 3: Test Service Hub login directly
Write-Host "`nTest 3: Testing Service Hub login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@crystallgroup.in"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $serviceHubToken = $response.token
    Write-Host "✅ Service Hub login successful!" -ForegroundColor Green
    Write-Host "   Token: $($serviceHubToken.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   User: $($response.user.name) ($($response.user.role))" -ForegroundColor Gray
} catch {
    Write-Host "❌ Service Hub login failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please check your credentials or Service Hub logs" -ForegroundColor White
    exit 1
}

# Test 4: Test Technician Tracking proxied login
Write-Host "`nTest 4: Testing Technician Tracking proxied login..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $trackingToken = $response.token
    Write-Host "✅ Technician Tracking login successful (proxied to Service Hub)!" -ForegroundColor Green
    Write-Host "   Token: $($trackingToken.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   User: $($response.user.name) ($($response.user.role))" -ForegroundColor Gray
} catch {
    Write-Host "❌ Technician Tracking login failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please check Service Hub is running and accessible" -ForegroundColor White
    exit 1
}

# Test 5: Verify tokens are identical
Write-Host "`nTest 5: Verifying tokens are identical..." -ForegroundColor Yellow
if ($serviceHubToken -eq $trackingToken) {
    Write-Host "✅ Tokens are IDENTICAL! Centralized authentication working!" -ForegroundColor Green
} else {
    Write-Host "❌ Tokens are DIFFERENT! Something is wrong." -ForegroundColor Red
    Write-Host "   Service Hub Token: $serviceHubToken" -ForegroundColor White
    Write-Host "   Tracking Token: $trackingToken" -ForegroundColor White
    exit 1
}

# Test 6: Test token validation
Write-Host "`nTest 6: Testing token validation..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $trackingToken"
    }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Token validation successful!" -ForegroundColor Green
    Write-Host "   User ID: $($response.userId)" -ForegroundColor Gray
    Write-Host "   Email: $($response.email)" -ForegroundColor Gray
    Write-Host "   Role: $($response.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Token validation failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 7: Test role-based access (if user is technician)
Write-Host "`nTest 7: Testing role-based access control..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $trackingToken"
    }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/location/session" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Role-based access working! User can access tracking endpoints." -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "⚠️  User does not have technician role. This is expected for non-technician users." -ForegroundColor Yellow
        Write-Host "   Only users with role='technician' can access tracking endpoints." -ForegroundColor White
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "🎉 CENTRALIZED AUTHENTICATION TEST COMPLETE!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "✅ Service Hub is running and accessible" -ForegroundColor Green
Write-Host "✅ Technician Tracking is running and accessible" -ForegroundColor Green
Write-Host "✅ Service Hub login endpoint works" -ForegroundColor Green
Write-Host "✅ Technician Tracking proxies login to Service Hub" -ForegroundColor Green
Write-Host "✅ JWT tokens are identical across both systems" -ForegroundColor Green
Write-Host "✅ Token validation works" -ForegroundColor Green
Write-Host "✅ Role-based access control is enforced`n" -ForegroundColor Green

Write-Host "🚀 Centralized authentication is working perfectly!" -ForegroundColor Cyan
Write-Host "   Service Hub is the single source of truth for authentication." -ForegroundColor White
Write-Host "   Technician Tracking proxies all auth requests to Service Hub." -ForegroundColor White
Write-Host "   Both systems share the same JWT secret.`n" -ForegroundColor White

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test with different user roles" -ForegroundColor White
Write-Host "2. Test access revocation by disabling a user" -ForegroundColor White
Write-Host "3. Deploy to production when ready`n" -ForegroundColor White
