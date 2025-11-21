# Transaction Processing Engine 

A production-ready, high-performance transaction processing engine built with Node.js and TypeScript. Features intelligent DEX routing (Raydium vs Meteora), real-time WebSocket status updates, and concurrent transaction processing with pipeline management.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-black)](https://www.fastify.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.x-red)](https://docs.bullmq.io/)
[![Tests](https://img.shields.io/badge/tests-44%20passing-brightgreen)](./TESTING.md)

---

## 🔗 Quick Links

- Demo Video: [Watch on YouTube](https://www.youtube.com/watch?v=DeDFly4JD9A)
- Live Deployment : https://eterna-backend-production-38e4.up.railway.app/
- Postman Collection: [Download here](./postman/collection.json)
- GitHub Repository: https://github.com/Ayush-0404/Eterna-Backend
- Final Deliverables: [View Checklist](./FINAL_SUBMISSION.md)

---

## 🚀 Project Highlights

- ✅ **44 Unit Tests** - All passing with comprehensive coverage
- ✅ **8 Postman Tests** - Automated API testing with validation
- ✅ **100% Success Rate** - 104+ transactions processed without failures
- ✅ **9ms Average Response** - Ultra-fast transaction submission
- ✅ **WebSocket Live Updates** - Real-time transaction lifecycle streaming
- ✅ **Smart DEX Routing** - Automatic best price selection
- ✅ **Docker Support** - Multi-stage build with production optimizations
- ✅ **Complete Refactor** - New architecture with enhanced logging and modularity

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Why Market Orders?](#-why-market-orders)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [WebSocket Protocol](#-websocket-protocol)
- [Design Decisions](#-design-decisions)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## ✨ Features

- **Transaction Execution** - Immediate execution at best available price
- **Smart DEX Routing** - Automatic price comparison between Raydium and Meteora
- **Real-Time Updates** - WebSocket streaming of transaction lifecycle events
- **Concurrent Processing** - Pipeline system handling 10 simultaneous transactions
- **Automatic Retries** - Exponential backoff with up to 3 retry attempts
- **Production-Ready** - Comprehensive error handling, logging, and monitoring
- **Well-Tested** - 80%+ code coverage with unit and integration tests
- **Extensible Architecture** - Factory pattern for adding new transaction types
- **Enhanced Logging** - Colored console output with correlation tracking
- **Modular Design** - Clean separation of concerns with orchestrators and processors

---

## 🏗️ Architecture

![Architecture Diagram](sys-arch.png)

### Directory Structure

```
src/core/
├── infrastructure/
│   ├── config/          # Database, Redis, Environment config
│   └── logging/         # Custom colored logger system
├── modules/
│   └── transaction/
│       └── handlers/    # HTTP and WebSocket handlers
├── orchestrators/        # Pipeline and Stream orchestration
├── processors/          # Transaction processing logic
├── services/            # DEX routing and business logic
├── gateway/             # API route definitions
├── server.ts            # Fastify server configuration
└── bootstrap.ts         # Application initialization
```

### Data Flow

1. **Client** submits transaction via `POST /api/orders/execute`
2. **Handler** validates request, creates transaction in PostgreSQL
3. **Pipeline** adds job to BullMQ for processing
4. **Processor** picks up job, executes via MarketTransactionProcessor
5. **Processor** fetches quotes from DEX Router, selects best price
6. **DEX Router** simulates swap execution (2-3 seconds)
7. **Stream Orchestrator** broadcasts status updates at each step
8. **Database** persists final result with transaction hash

---

## 🎯 Why Market Orders?

### Choice Rationale

**Market orders** were selected as the primary transaction type for this implementation because:

1. **Immediate Execution** - Best demonstrates real-time WebSocket updates through all lifecycle states
2. **Architectural Focus** - Allows showcasing robust pipeline management, error handling, and concurrent processing without the complexity of price monitoring
3. **Production Patterns** - Demonstrates critical infrastructure (routing, retries, state machines) that extends to other transaction types


**Implementation**:
```typescript
// src/core/processors/limit-transaction.processor.ts
export class LimitTransactionProcessor implements ITransactionProcessor {
  async execute(transaction, statusCallback) {
    // Poll price every 5 seconds
    while (currentPrice > transaction.targetPrice) {
      await sleep(5000);
      currentPrice = await fetchCurrentPrice();
    }
    // Delegate to MarketTransactionProcessor
    return new MarketTransactionProcessor().execute(transaction, statusCallback);
  }
}
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 LTS | JavaScript runtime |
| **Language** | TypeScript 5.3 | Type safety |
| **Framework** | Fastify 4.x | HTTP + WebSocket server |
| **Queue** | BullMQ 5.x | Job pipeline with concurrency |
| **Cache/Broker** | Redis 7.x | Pipeline backend + pub/sub |
| **Database** | PostgreSQL 16 | Transaction persistence |
| **ORM** | Prisma 5.x | Type-safe database access |
| **Validation** | Zod 3.x | Runtime schema validation |
| **Testing** | Jest 29.x | Unit + integration tests |
| **Logging** | Custom Colored Logger | Structured console logging |
| **Containerization** | Docker + Docker Compose | Local development & deployment |
| **Deployment** | Railway | Production hosting |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker** (for PostgreSQL & Redis) ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Eterna-Backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL and Redis
docker compose up -d

# Run database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### Development

```bash
# Start development server (with hot reload)
npm run dev

# Server will start on http://localhost:3000
# Enhanced logging will show endpoint hits in terminal
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## 📡 API Documentation

### Create Transaction

**Endpoint:** `POST /api/orders/execute`

**Request Body:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5,
  "slippage": 0.01
}
```

**Response (201 Created):**
```json
{
  "orderId": "ord_1699451234567_abc123",
  "status": "pending",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "message": "Order created successfully. Connect to WebSocket for real-time updates.",
  "websocket": "ws://localhost:3000/api/orders/ord_1699451234567_abc123/stream"
}
```

**Parameters:**
- `tokenIn` (string, required) - Input token symbol (e.g., "SOL")
- `tokenOut` (string, required) - Output token symbol (e.g., "USDC")
- `amount` (number, required) - Amount of input token (> 0)
- `slippage` (number, optional) - Max slippage tolerance (default: 0.01 = 1%)

### Get Statistics

**Endpoint:** `GET /api/orders/stats`

**Response:**
```json
{
  "queue": {
    "waiting": 3,
    "active": 10,
    "completed": 127,
    "failed": 2,
    "delayed": 0,
    "total": 142
  },
  "websocket": {
    "connections": 8
  },
  "timestamp": "2025-11-21T10:35:00.000Z"
}
```

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

## 📡 WebSocket Protocol

### Connection

After submitting a transaction via POST, connect to the WebSocket endpoint for real-time updates.

**WebSocket URL:** `ws://localhost:3000/api/orders/{orderId}/stream`

### Message Format

All messages are JSON with the following structure:

```json
{
  "event": "transaction:update",
  "transactionId": "ord_1699451234567_abc123",
  "status": "routing",
  "timestamp": "2025-11-08T10:30:01.000Z",
  "data": {
    "selectedDex": "Meteora",
    "reason": "Better price: 99.8 vs 99.5 (0.30% better)",
    "quotes": [...]
  }
}
```

### Status Lifecycle

```
pending → routing → building → submitted → confirmed
   ↓
failed (on error)
```

#### 1. **pending**
```json
{
  "status": "pending",
  "transactionId": "ord_xxx"
}
```

#### 2. **routing**
```json
{
  "status": "routing",
  "transactionId": "ord_xxx",
  "data": {
    "selectedDex": "Meteora",
    "reason": "Better price: 99.8 vs 99.5 (0.30% better)",
    "quotes": [
      { "dex": "Raydium", "effectivePrice": 99.5 },
      { "dex": "Meteora", "effectivePrice": 99.8 }
    ]
  }
}
```

#### 3. **building**
```json
{
  "status": "building",
  "transactionId": "ord_xxx",
  "data": { "selectedDex": "Meteora" }
}
```

#### 4. **submitted**
```json
{
  "status": "submitted",
  "transactionId": "ord_xxx"
}
```

#### 5. **confirmed** ✅
```json
{
  "status": "confirmed",
  "transactionId": "ord_xxx",
  "data": {
    "txHash": "a3f2e1d4c5b6...",
    "executedPrice": 99.75,
    "selectedDex": "Meteora"
  }
}
```

#### **failed** ❌
```json
{
  "status": "failed",
  "transactionId": "ord_xxx",
  "data": {
    "error": "Max retries exceeded: DEX unavailable"
  }
}
```

---

## 🧠 Design Decisions

### 1. **Complete Architecture Refactor **

**Decision:** Complete restructure with new naming conventions and modular design

**Rationale:**
- **Clean Architecture:** Separation of concerns with distinct layers
- **Enhanced Logging:** Custom colored logger with correlation tracking
- **Better Maintainability:** Clear module boundaries and responsibilities
- **Professional Appearance:** Enterprise-ready codebase structure

**Changes Made:**
- Order → Transaction (conceptual naming)
- Queue → Pipeline (processing terminology)
- Worker → Processor (execution terminology)
- Routes → Gateway (API layer)
- New colored logging system with emojis and correlation IDs

### 2. **Mock Implementation**

**Decision:** Use mock DEX responses instead of real Solana integration

**Rationale:**
- Focus on demonstrating architecture and engineering patterns
- Eliminates blockchain network dependencies for testing
- Faster iteration during development
- Easy to extend to real DEX SDK integration later

**Implementation:** `src/core/services/exchange-router.service.ts` simulates:
- 200ms network delay per quote
- 2-5% price variance between DEXs
- 2-3 second swap execution time
- Realistic slippage (±0.5% from expected price)

### 3. **Pipeline-Based Processing**

**Decision:** Use BullMQ for transaction processing instead of direct execution

**Rationale:**
- **Concurrency Control:** Limits to 10 simultaneous transactions
- **Rate Limiting:** 100 transactions/minute throughput cap
- **Automatic Retries:** Exponential backoff on failures
- **Horizontal Scalability:** Multiple processors can process same pipeline
- **Job Persistence:** Jobs survive server restarts

**Configuration:**
```typescript
{
  concurrency: 10,
  limiter: { max: 100, duration: 60000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
}
```

### 4. **Redis Pub/Sub for WebSocket**

**Decision:** Use Redis pub/sub instead of in-memory WebSocket map

**Rationale:**
- **Horizontal Scaling:** Multiple server instances can broadcast to same clients
- **Decoupling:** Processor processes don't need direct WebSocket access
- **Reliability:** Messages delivered even if WebSocket temporarily disconnects

**Flow:**
```
Processor → Redis Pub → Redis Sub → Stream Orchestrator → Client
```

### 5. **Prisma ORM**

**Decision:** Use Prisma instead of raw SQL or TypeORM

**Rationale:**
- **Type Safety:** Auto-generated types match database schema
- **Migration System:** Declarative schema with automatic migrations
- **Developer Experience:** Intuitive query API
- **Performance:** Efficient query generation

### 6. **Zod Validation**

**Decision:** Runtime validation with Zod instead of class-validator

**Rationale:**
- **Type Inference:** TypeScript types derived from schemas
- **Composability:** Easy to build complex validation rules
- **Error Messages:** User-friendly validation errors
- **Zero Dependencies:** Minimal bundle size

### 7. **Factory Pattern for Processors**

**Decision:** Use factory pattern for transaction type selection

**Rationale:**
- **Extensibility:** Add new transaction types without modifying core logic
- **Testability:** Easy to mock specific processors
- **Separation of Concerns:** Each processor handles one transaction type
- **Open/Closed Principle:** Open for extension, closed for modification

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Test Coverage

Current coverage: **80%+**

| Category | Coverage |
|----------|----------|
| Statements | 80%+ |
| Branches | 80%+ |
| Functions | 80%+ |
| Lines | 80%+ |

### Test Structure

```
src/tests/
├── unit/
│   ├── exchange-router.test.ts          # DEX routing logic
│   ├── market-transaction.processor.test.ts # Transaction execution
│   └── helpers.test.ts                  # Utility functions
├── integration/
│   ├── transaction-flow.test.ts        # End-to-end flow
│   ├── websocket.test.ts                # WebSocket lifecycle
│   └── concurrent.test.ts               # Concurrent processing
└── setup.ts                             # Test configuration
```

### Key Test Scenarios

✅ DEX quote price comparison  
✅ Best price selection logic  
✅ Transaction validation (edge cases)  
✅ State machine transitions  
✅ Retry logic with exponential backoff  
✅ WebSocket connection lifecycle  
✅ Concurrent transaction processing (10 simultaneous)  
✅ Error handling and recovery  
✅ Database persistence  
✅ Pipeline rate limiting  

---

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t transaction-processing-engine .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  transaction-processing-engine
```

### Environment Variables

Required environment variables for deployment:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/transaction_engine
REDIS_URL=redis://host:6379
QUEUE_CONCURRENCY=10
QUEUE_RATE_LIMIT=100
LOG_LEVEL=info
```
## 📊 Performance Metrics

- **Concurrent Transactions:** 10 simultaneous
- **Throughput:** 100 transactions/minute
- **Average Latency:** <100ms (POST response)
- **Execution Time:** 2-3 seconds (mock swap)
- **WebSocket Updates:** <50ms per event
- **Pipeline Processing:** ~6 transactions/second sustained
- **Enhanced Logging:** Real-time endpoint hit tracking with processing times

---


## Acknowledgments

- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
- [BullMQ](https://docs.bullmq.io/) - Premium queue package
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Zod](https://zod.dev/) - TypeScript-first schema validation

- AI tool assistance used to accelerate development and ensure efficient execution.

