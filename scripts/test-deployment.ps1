# Quick Deployment Test Script
# Run this script to test your Railway deployment

$baseUrl = "https://eterna-backend-production-38e4.up.railway.app"

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT TEST SUITE" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "[1/5] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health"
    Write-Host "  ✅ PASS - Server is healthy (Uptime: $([math]::Round($health.uptime, 2))s)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ FAIL - Health check failed" -ForegroundColor Red
    exit 1
}

# Test 2: API Info
Write-Host "[2/5] Testing API Info..." -ForegroundColor Yellow
try {
    $info = Invoke-RestMethod -Uri "$baseUrl/"
    Write-Host "  ✅ PASS - API: $($info.name) v$($info.version)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ FAIL - API info failed" -ForegroundColor Red
    exit 1
}

# Test 3: Create Order
Write-Host "[3/5] Testing Order Creation..." -ForegroundColor Yellow
try {
    $order = Invoke-RestMethod -Uri "$baseUrl/api/orders/execute" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"SOL","tokenOut":"USDC","amount":1,"orderType":"market","slippage":0.005}'
    Write-Host "  ✅ PASS - Order created: $($order.orderId)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ FAIL - Order creation failed" -ForegroundColor Red
    exit 1
}

# Test 4: Queue Stats
Write-Host "[4/5] Testing Queue Statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/orders/stats"
    Write-Host "  ✅ PASS - Queue: $($stats.queue.total) total, $($stats.queue.completed) completed, $($stats.queue.failed) failed" -ForegroundColor Green
} catch {
    Write-Host "  ❌ FAIL - Queue stats failed" -ForegroundColor Red
    exit 1
}

# Test 5: Validation
Write-Host "[5/5] Testing Input Validation..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/orders/execute" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"invalid":"data"}' `
        -ErrorAction Stop
    Write-Host "  ❌ FAIL - Validation should have rejected invalid input" -ForegroundColor Red
    exit 1
} catch {
    Write-Host "  ✅ PASS - Validation working correctly" -ForegroundColor Green
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Deployment URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Status: Production Ready ✅`n" -ForegroundColor Green
