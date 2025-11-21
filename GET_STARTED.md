# Transaction Processing Engine v2.0 - Quick Start Guide

Details with troubleshoot - 
---

## 🚀 Steps

### 1. Setup & Run (First Time)

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
# Note: Requires Docker installed
docker compose up -d

# Run database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev
```

### 2. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 3. Test the System

#### Option A: Use Postman
1. Import `postman/collection.json`
2. Run "Execute Market Order - SOL to USDC"
3. Check WebSocket response (connect to `/api/orders/{orderId}/stream`)

#### Option B: Use cURL
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 1.5,
    "slippage": 0.01
  }'
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run load test (server must be running)
npm run load:test
```

---

## 📂 New File Structure (v2.0)

```
Eterna-Backend/
├── 📁 src/core/                    → New modular architecture
│   ├── 📁 infrastructure/
│   │   ├── 📁 config/              → Database, Redis, Environment config
│   │   └── 📁 logging/             → Custom colored logger system
│   ├── 📁 modules/
│   │   └── 📁 transaction/
│   │       └── 📁 handlers/        → HTTP and WebSocket handlers
│   ├── 📁 orchestrators/           → Pipeline and Stream orchestration
│   ├── 📁 processors/              → Transaction processing logic
│   ├── 📁 services/                → DEX routing and business logic
│   ├── 📁 gateway/                 → API route definitions
│   ├── 📄 server.ts                → Fastify server configuration
│   └── 📄 bootstrap.ts             → Application initialization
├── 📁 src/tests/                   → Unit and integration tests
├── 📁 prisma/                      → Database schema & migrations
├── 📁 postman/                     → API test collection
├── 📁 scripts/                     → Load test script
├── 📄 Dockerfile                   → Production container
├── 📄 docker-compose.yml           → Local infrastructure
├── 📄 README.md                    → Full documentation
├── 📄 GET_STARTED.md               → Quick start guide
└── 📄 package.json                 → Dependencies & scripts
```

---

## 🎯 Key Features Explained (v2.0)

### 1. Transaction Lifecycle
```
Client POST → Handler → Pipeline → Processor → DEX Router → Swap → Confirmed
                ↓           ↓           ↓          ↓          ↓         ↓
            WebSocket   WebSocket   WebSocket WebSocket WebSocket WebSocket
             "pending"  "routing" "building" "submitted" "confirmed"
```

### 2. Enhanced Logging System
```typescript
// Real-time endpoint hit tracking
🎯 Transaction execution endpoint hit
├── method: POST
├── url: /api/orders/execute
├── userAgent: PostmanRuntime/7.32.3
├── clientIP: ::1
└── processingTime: 45ms
```

### 3. New Architecture Components
- **Orchestrators**: Pipeline and Stream management
- **Processors**: Transaction execution logic
- **Gateway**: API route definitions
- **Infrastructure**: Config and logging systems
- **Modules**: Feature-based organization

### 4. DEX Routing Logic
```typescript
1. Fetch Raydium quote  → price: 99.5, fee: 0.3%
2. Fetch Meteora quote  → price: 99.8, fee: 0.2%
3. Compare effective prices
4. Select Meteora (better: 99.8 vs 99.5)
5. Log routing decision
6. Execute swap on Meteora
```

### 5. Pipeline Concurrency
```
┌─────────────┐
│   Request   │  ← 100 transactions submitted
└──────┬──────┘
       ↓
┌──────────────┐
│  BullMQ      │  ← Pipeline (max 100/min)
│  Pipeline    │
└──────┬───────┘
       ↓
┌──────────────────────────────┐
│  10 Concurrent Processors    │  ← Processes 10 at a time
│  [P1] [P2] ... [P10]        │
└──────────────────────────────┘
```

### 6. Error Handling
```
Attempt 1: Fail → Wait 1s  → Retry
Attempt 2: Fail → Wait 2s  → Retry
Attempt 3: Fail → Wait 4s  → Mark as "failed"
                             Persist error to DB
                             Emit WebSocket update
```

---

## 🧪 Testing Overview

### Unit Tests (44 tests)
- Exchange Router: Price comparison, delays, slippage
- Market Transaction Processor: Validation, state machine, errors
- Helper Functions: ID generation, backoff, formatting
- New v2.0 Components: Orchestrators, Processors, Gateway

### Load Testing
```bash
npm run load:test

# Tests:
# - 10 concurrent transactions
# - 20 concurrent transactions (pipeline limit test)
# - 100 transactions/minute sustained (30s)
```

---

## 📊 Performance Expectations (v2.0)

| Metric | Target | Notes |
|--------|--------|-------|
| API Response | <100ms | POST endpoint only |
| WebSocket Latency | <50ms | Per status update |
| Transaction Execution | 2-3s | Mock swap time |
| Concurrent Transactions | 10 | Simultaneous processing |
| Throughput | 100/min | Sustained rate |
| Enhanced Logging | Real-time | Endpoint hit tracking |

---

## 🔧 Troubleshooting

### Docker not starting?
```bash
# Check Docker is running
docker ps

# Start Docker Desktop (Windows/Mac)
# Or: sudo systemctl start docker (Linux)
```

### Port 3000 already in use?
```bash
# Change PORT in .env
PORT=3001

# Or kill process using port 3000
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

### Database connection error?
```bash
# Ensure PostgreSQL container is running
docker compose ps

# Restart containers
docker compose restart

# Check logs
docker compose logs postgres
```

### No logs showing in terminal?
```bash
# Restart server to load new logging changes
npm run dev

# Check if NODE_ENV=development in .env
cat .env | grep NODE_ENV
```

### Tests failing?
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate

# Run tests
npm test
```

### Module resolution errors in IDE?
```bash
# Restart TypeScript server in your IDE
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild the project
npm run build
```

---

## 🎓 Learning Outcomes (v2.0)

By building this project, I have learnt and implemented:

1. **Complete Architecture Refactor** with clean separation of concerns
2. **Pipeline-Based Processing** with BullMQ orchestrators
3. **Real-Time Communication** with WebSocket streaming
4. **Microservices Patterns** (orchestrators, processors, services)
5. **Event-Driven Design** (status updates via pub/sub)
6. **Factory Pattern** (extensible transaction types)
7. **Type-Safe Development** (TypeScript + Zod + Prisma)
8. **Custom Logging System** with colored output and correlation tracking
9. **Production Best Practices** (modular design, error handling, testing)

---

## 🔄 Migration from v1.0 to v2.0

### What Changed:
- **Order → Transaction**: Conceptual naming update
- **Queue → Pipeline**: Processing terminology
- **Worker → Processor**: Execution terminology
- **Routes → Gateway**: API layer organization
- **New Directory Structure**: Modular architecture under `src/core/`
- **Enhanced Logging**: Custom colored logger with emojis
- **API Compatibility**: Same endpoints, new internal implementation

### What Stayed the Same:
- **All API Endpoints**: 100% backward compatible
- **Postman Collection**: No changes needed
- **Database Schema**: Same structure
- **WebSocket Protocol**: Same message format

---

**Built with ❤️ and enhanced architecture in v2.0**

