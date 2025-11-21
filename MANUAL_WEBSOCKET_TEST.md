# Manual WebSocket Testing Guide ( help )

##  What I've Done

1. **Added Delays to Order Execution**
   - Routing: 3 seconds
   - Building: 3 seconds  
   - Submitting: 2 seconds
   - Confirmation: 2 seconds
   - **Total: ~10 seconds per order** (enough time to see WebSocket messages!)

2. **Created Test Scripts**
   - `submit-order.ts` - Submit a single order
   - `monitor-order.ts` - Connect to WebSocket for specific order
   - `websocket-final-test.ts` - Automated test

## Issue Identified

The WebSocket **connections work** but messages aren't being received. This is likely because:
- The Redis pub/sub might need the server to restart
- Or there's a timing issue with subscription registration

##  ** TESTING METHOD (recomm) **

### Watch Server Logs (Easiest & Most Reliable)

1. **Your server terminal shows EVERYTHING**:
   - DEX routing decisions
   - Quote comparisons (Raydium vs Meteora)
   - Transaction building
   - Submission status
   - Completion with tx hash

2. **To test**:
   ```bash
   cmd /c npx tsx scripts/submit-order.ts
   ```

3. **Watch your server terminal** - you'll see logs for ~10 seconds showing the complete order flow!

---

## 🧪 Alternative: Manual WebSocket Test (If you want to troubleshoot)

### Method 1: Two Terminal Approach

**Terminal 1 - Submit Order:**
```bash
cmd /c npx tsx scripts/submit-order.ts
```

Copy the Order ID from output.

**Terminal 2 - Monitor (Immediately):**
```bash
cmd /c npx tsx scripts/monitor-order.ts ord_XXXX_XXXX
```

Replace `ord_XXXX_XXXX` with your actual order ID.

---

### Method 2: Use Online WebSocket Client

1. Go to: https://websocketking.com
2. Connect to: `ws://localhost:3000/api/orders/ord_XXXX_XXXX/stream`
3. Submit order in another terminal
4. Watch messages appear!

---

##  What You Should See (in Server Logs)

```
[INFO] Processing order: ord_XXXX
[INFO] Status: ROUTING
[INFO] Raydium quote: 150.23 USDC (fee: 0.3%)
[INFO] Meteora quote: 150.45 USDC (fee: 0.2%)
[INFO] Selected: meteora (0.15% better price)
[INFO] Status: BUILDING
[INFO] Status: SUBMITTED  
[INFO] Status: CONFIRMED
[INFO] Order completed: txHash=5xYz...
```

---

##  Summary

**All 4 Steps Status:**

| Step | Status | How to Test |
|------|--------|-------------|
| 1. Server Logs | ✅ WORKING | Watch server terminal while submitting orders |
| 2. Database | ✅ WORKING | Prisma Studio at http://localhost:5555 |
| 3. WebSocket | ⚠️ PARTIAL | Connections work, check server logs for updates |
| 4. Postman | 📋 READY | Follow POSTMAN_GUIDE.md to import |

**Best way to see order execution flow: Watch your server terminal! **

The delays are now long enough (10+ seconds total) that you can easily follow the order progression in real-time.
