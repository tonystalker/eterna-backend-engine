# WebSocket Testing Guide

## How to Test WebSocket Live Updates

The WebSocket feature allows you to see real-time order status updates as the order progresses through different stages.

### Method 1: Two-Step Manual Test (Recommended)

**Step 1: Submit an order**
```bash
cmd /c npx tsx scripts/submit-order.ts
```

This will output something like:
```
Order ID:    ord_1762613166643_l59weki
WebSocket:   ws://localhost:3000/api/orders/ord_1762613166643_l59weki/stream
```

**Step 2: Monitor the order (in a new terminal)**
```bash
cmd /c npx tsx scripts/monitor-order.ts ord_1762613166643_l59weki
```

Replace `ord_1762613166643_l59weki` with your actual order ID from Step 1.

---

### Method 2: Use Postman or WebSocket Client Tools

1. **Postman** (if you have it installed):
   - Import `postman/collection.json`
   - Send the "Execute Market Order" request
   - Copy the `websocket` URL from the response
   - Use Postman's WebSocket feature to connect

2. **Online WebSocket Tester**:
   - Go to https://www.websocket.org/echo.html
   - Or use https://websocketking.com
   - Connect to: `ws://localhost:3000/api/orders/{orderId}/stream`

---

### Expected WebSocket Messages

You should see messages like these in real-time:

**1. Connection Established**
```json
{
  "event": "connection:established",
  "orderId": "ord_xxx",
  "timestamp": "2025-11-08T14:00:00.000Z"
}
```

**2. Order Status: Routing**
```json
{
  "orderId": "ord_xxx",
  "status": "routing",
  "data": {
    "quotes": {
      "raydium": { "outputAmount": 150.23, "fee": 0.003 },
      "meteora": { "outputAmount": 150.45, "fee": 0.002 }
    },
    "selectedDex": "meteora"
  },
  "timestamp": "2025-11-08T14:00:01.000Z"
}
```

**3. Order Status: Building**
```json
{
  "orderId": "ord_xxx",
  "status": "building",
  "timestamp": "2025-11-08T14:00:02.000Z"
}
```

**4. Order Status: Submitted**
```json
{
  "orderId": "ord_xxx",
  "status": "submitted",
  "data": {
    "txHash": "5xYz...mock"
  },
  "timestamp": "2025-11-08T14:00:03.000Z"
}
```

**5. Order Status: Completed**
```json
{
  "orderId": "ord_xxx",
  "status": "completed",
  "data": {
    "outputAmount": 150.45,
    "tokenOut": "USDC",
    "txHash": "5xYz...mock"
  },
  "timestamp": "2025-11-08T14:00:05.000Z"
}
```

---

### Why The Automated Test Might Not Show Updates

The order processing is very fast (2-5 seconds total). If you submit an order and then connect to WebSocket, the order might have already completed processing! That's why the two-step manual method works better - you can connect to WebSocket BEFORE submitting the order if you want to catch all updates.

---

### Alternative: Check Server Logs

The easiest way to see the full order flow is to watch your server terminal (where `npm run dev` is running). You'll see all the DEX routing decisions and status transitions there!
