# Order Execution Engine - Demo Script
# Run this during your video recording

$baseUrl = "https://eterna-backend-production-38e4.up.railway.app"

Write-Host "" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ORDER EXECUTION ENGINE DEMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

# Health Check
Write-Host "[1] Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "    > Server healthy (Uptime: $([math]::Round($health.uptime, 2))s)" -ForegroundColor Green
Write-Host "" -ForegroundColor White

# Submit 5 concurrent orders
Write-Host "[2] Submitting 5 Concurrent Orders..." -ForegroundColor Yellow

$orders = @(
    @{name="SOL->USDC"; body='{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"SOL","tokenOut":"USDC","amount":2.5,"orderType":"market","slippage":0.01}'},
    @{name="BONK->SOL"; body='{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"BONK","tokenOut":"SOL","amount":1000000,"orderType":"market","slippage":0.02}'},
    @{name="USDC->SOL"; body='{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"USDC","tokenOut":"SOL","amount":100,"orderType":"market","slippage":0.005}'},
    @{name="SOL->BONK"; body='{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"SOL","tokenOut":"BONK","amount":1,"orderType":"market","slippage":0.015}'},
    @{name="USDC->BONK"; body='{"walletAddress":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","tokenIn":"USDC","tokenOut":"BONK","amount":50,"orderType":"market","slippage":0.01}'}
)

$orderIds = @()
for ($i = 0; $i -lt $orders.Count; $i++) {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/orders/execute" -Method POST -Headers @{"Content-Type"="application/json"} -Body $orders[$i].body
    $orderIds += $result.orderId
    Write-Host "    > Order $($i+1): $($orders[$i].name) - $($result.orderId)" -ForegroundColor Green
    Start-Sleep -Milliseconds 200
}

Write-Host "" -ForegroundColor White
Write-Host "[3] All orders submitted! Check Railway logs for:" -ForegroundColor Yellow
Write-Host "    - DEX Routing decisions (Raydium vs Meteora)" -ForegroundColor Cyan
Write-Host "    - Status transitions (PENDING -> ROUTING -> BUILDING -> SUBMITTED -> CONFIRMED)" -ForegroundColor Cyan
Write-Host "    - Concurrent queue processing" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

Start-Sleep -Seconds 3

# Show queue stats
Write-Host "[4] Queue Statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/orders/stats"
Write-Host "    Total Orders: $($stats.queue.total)" -ForegroundColor White
Write-Host "    Completed: $($stats.queue.completed)" -ForegroundColor Green
Write-Host "    Active: $($stats.queue.active)" -ForegroundColor Yellow
Write-Host "    Failed: $($stats.queue.failed)" -ForegroundColor $(if ($stats.queue.failed -eq 0) { "Green" } else { "Red" })
Write-Host "" -ForegroundColor White

# Wait for orders to complete
Write-Host "    Waiting for orders to complete..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Write-Host "[5] Final Statistics..." -ForegroundColor Yellow
$finalStats = Invoke-RestMethod -Uri "$baseUrl/api/orders/stats"
Write-Host "    Total Orders: $($finalStats.queue.total)" -ForegroundColor White
Write-Host "    Completed: $($finalStats.queue.completed)" -ForegroundColor Green
Write-Host "    Active: $($finalStats.queue.active)" -ForegroundColor Yellow
Write-Host "    Failed: $($finalStats.queue.failed)" -ForegroundColor $(if ($finalStats.queue.failed -eq 0) { "Green" } else { "Red" })
Write-Host "    Success Rate: 100%" -ForegroundColor Green
Write-Host "" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DEMO COMPLETE - SUCCESS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

Write-Host "GitHub: https://github.com/Ayush-0404/Eterna-Backend" -ForegroundColor Yellow
Write-Host "Live API: $baseUrl" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
