# Postman Collection Testing Guide - Transaction Processing Engine v2.0

## 🚀 Overview

The Postman collection is **100% compatible** with the v2.0 refactored engine. All endpoints remain the same, ensuring seamless testing without any modifications needed.

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Choose **File** tab
4. Navigate to: `\Eterna-Backend\postman\collection.json`
5. Click **Import**

### Step 2: Set Base URL (Optional)

The collection uses `{{baseUrl}}` variable. To set it:

1. Click on **Collections** → **Transaction Processing Engine API**
2. Go to **Variables** tab
3. Set `baseUrl` to `http://localhost:3000`
4. Click **Save**

(Or just replace `{{baseUrl}}` with `http://localhost:3000` in each request)

### Step 3: Test Requests (in order)

#### 1. Health Check
- **Method**: GET
- **URL**: `http://localhost:3000/health`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-11-08T14:00:00.000Z",
    "uptime": 123.456
  }
  ```

#### 2. Get API Info
- **Method**: GET
- **URL**: `http://localhost:3000/`
- **Expected Response**:
  ```json
  {
    "name": "Order Execution Engine",
    "version": "2.0.0",
    "endpoints": {
      "health": "/health",
      "executeOrder": "POST /api/orders/execute",
      "orderStats": "GET /api/orders/stats",
      "orderHistory": "GET /api/orders/history",
      "websocket": "WS /api/orders/:orderId/stream"
    }
  }
  ```

#### 3. Execute Market Order - SOL to USDC
- **Method**: POST
- **URL**: `http://localhost:3000/api/orders/execute`
- **Body**:
  ```json
  {
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 1.5,
    "slippage": 0.01
  }
  ```
- **Expected Response**:
  ```json
  {
    "orderId": "ord_1762613166643_l59weki",
    "status": "pending",
    "timestamp": "2025-11-08T14:00:00.000Z",
    "message": "Order created successfully. Connect to WebSocket for real-time updates.",
    "websocket": "ws://localhost:3000/api/orders/ord_xxx/stream"
  }
  ```

#### 4. Get Order Stats
- **Method**: GET
- **URL**: `http://localhost:3000/api/orders/stats`
- **Expected Response**:
  ```json
  {
    "queue": {
      "waiting": 0,
      "active": 0,
      "completed": 5,
      "failed": 0,
      "delayed": 0,
      "total": 5
    },
    "websocket": {
      "connections": 0
    },
    "timestamp": "2025-11-08T14:00:00.000Z"
  }
  ```

#### 5. Get Order History
- **Method**: GET
- **URL**: `http://localhost:3000/api/orders/history?limit=10&offset=0`
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "pagination": {
        "total": 5,
        "limit": 10,
        "offset": 0,
        "hasMore": false
      },
      "transactions": [...]
    }
  }
  ```

#### 6-8. More Order Variations
Test different combinations:
- USDC to SOL
- Large amounts
- Different slippage
- Invalid inputs (should return errors)

### Step 4: Run Collection (Automated)

1. Click on **Transaction Processing Engine API** collection
2. Click **Run** button
3. Select requests to run
4. Click **Run Transaction Processing Engine API**
5. Watch automated tests pass! 

The collection includes automated tests that check:
- ✅ Status codes
- ✅ Response structure
- ✅ Order ID format
- ✅ Status values
- ✅ WebSocket URL format

### WebSocket Testing in Postman (v2.0)

Postman supports WebSocket connections with the enhanced endpoint:

1. Create new **WebSocket Request**
2. URL: `ws://localhost:3000/api/orders/{orderId}/stream`
3. Replace `{orderId}` with an actual order ID from the execute response
4. Click **Connect**
5. Watch real-time transaction lifecycle messages!

**Expected WebSocket Messages:**
```json
{
  "event": "transaction:update",
  "transactionId": "ord_xxx",
  "status": "routing",
  "timestamp": "2025-11-08T14:00:01.000Z",
  "data": {
    "selectedDex": "Meteora",
    "reason": "Better price: 99.8 vs 99.5 (0.30% better)"
  }
}
```

---

## 🔍 v2.0 Enhanced Features

### Enhanced Logging
When you run requests, check the server terminal for detailed logging:
```
🎯 Transaction execution endpoint hit
├── method: POST
├── url: /api/orders/execute
├── userAgent: PostmanRuntime/7.32.3
├── clientIP: ::1
└── processingTime: 45ms
```

### New Endpoints
The collection now includes:
- **Transaction History**: `GET /api/orders/history`
- **Enhanced WebSocket**: `/api/orders/{orderId}/stream`

### Same API Compatibility
- ✅ All original endpoints work unchanged
- ✅ Response formats remain identical
- ✅ WebSocket protocol is the same
- ✅ Postman tests pass without modification

---

## 🧪 Quick Test (No Postman)

If you don't have Postman, you can use `curl` commands:

```bash
# Health Check
curl http://localhost:3000/health

# Submit Transaction
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":1.5,"slippage":0.01}'

# Get Stats
curl http://localhost:3000/api/orders/stats

# Get Transaction History
curl "http://localhost:3000/api/orders/history?limit=5"
```

### WebSocket Test (JavaScript)
```javascript
// Submit transaction first to get orderId
const orderId = "ord_1234567890_abc123"; // From POST response

// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:3000/api/orders/${orderId}/stream`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Transaction Update:', data);
};
```

---

## 🔧 Troubleshooting

### Requests Failing?
1. Check server is running: `npm run dev`
2. Verify port: `http://localhost:3000/health`
3. Check enhanced logging in terminal

### WebSocket Not Connecting?
1. Ensure you have a valid `orderId` from POST response
2. Use correct URL format: `/api/orders/{orderId}/stream`
3. Check server logs for connection attempts

### Tests Not Passing?
1. Verify server is running v2.0 code
2. Check response formats match expected
3. Review server logs for any errors

---

## 🎯 Best Practices

### 1. Run in Order
Execute requests in sequence:
1. Health Check → Verify server
2. Execute Order → Get orderId
3. WebSocket Connect → Real-time updates
4. Get Stats → Check pipeline status
5. Get History → Verify persistence

### 2. Monitor Server Logs
Watch the terminal for enhanced logging:
- 🎯 Transaction execution hits
- 📊 Metrics endpoint hits
- 🔌 WebSocket connections
- ⚡ Processing times

### 3. Test Concurrently
Open multiple Postman tabs to test:
- Simultaneous transaction submissions
- Multiple WebSocket connections
- Pipeline concurrency (10 simultaneous)

---

**Ready to test your Transaction Processing Engine v2.0! 🚀**
