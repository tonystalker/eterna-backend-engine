# 🚀 Transaction Processing Engine v2.0 - Quick Start Guide

## Prerequisites Installation

### 1. Install Node.js 20+
```bash
# Download from https://nodejs.org/
# Or use nvm:
nvm install 20
nvm use 20
```

### 2. Install Docker
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Mac**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### 3. Verify Installation
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
docker --version # Should show Docker version 24.x.x
```

---

## Project Setup (v2.0)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults should work for local development)
# NODE_ENV=development is required for enhanced logging
```

### Step 3: Start Infrastructure (PostgreSQL + Redis)

#### Option A: Using Docker (Recommended)
```bash
# Start containers
docker compose up -d

# Verify containers are running
docker ps

# Expected output:
# - eterna-backend_postgres (port 5432)
# - eterna-backend_redis (port 6379)
```

#### Option B: Using WSL (Windows)
```bash
# From PowerShell
wsl

# Inside WSL
cd /mnt/c/Users/YourUsername/Desktop/eterna-backend/Eterna-Backend
docker compose up -d
```

#### Option C: Manual Installation
- Install PostgreSQL 16: https://www.postgresql.org/download/
- Install Redis 7: https://redis.io/download
- Update DATABASE_URL and REDIS_URL in .env

### Step 4: Database Migration
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev

# Optional: Open Prisma Studio to view database
npx prisma studio
```

---

## Running the Application (v2.0)

### Development Mode (Hot Reload + Enhanced Logging)
```bash
npm run dev

# Server starts on http://localhost:3000
# Enhanced logging will show endpoint hits with colored output
# Example: 🎯 Transaction execution endpoint hit
```

### Production Build
```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## Testing (v2.0)

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage

# Coverage report will be in coverage/lcov-report/index.html
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (re-run on file changes)
npm run test:watch
```

### Load Testing
```bash
# Start server first
npm run dev

# In another terminal, run load test
npm run load:test
```

---

## API Usage (v2.0)

### Using Postman
1. Import `postman/collection.json` into Postman
2. Set environment variable `baseUrl` to `http://localhost:3000`
3. Run requests or use "Run Collection" for automated tests
4. **Note**: WebSocket connections now use `/api/orders/{orderId}/stream`

### Using cURL

#### Submit Transaction
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

#### Get Statistics
```bash
curl http://localhost:3000/api/orders/stats
```

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Get Transaction History
```bash
curl "http://localhost:3000/api/orders/history?limit=10&offset=0"
```

### WebSocket Connection (Example using wscat)
```bash
# Install wscat
npm install -g wscat

# First, submit a transaction to get orderId
# Then connect to WebSocket with orderId
wscat -c ws://localhost:3000/api/orders/ord_1234567890_abc123/stream

# For testing, you can use JavaScript:
const ws = new WebSocket('ws://localhost:3000/api/orders/ord_1234567890_abc123/stream');
ws.onmessage = (event) => console.log('Status Update:', JSON.parse(event.data));
```

---

## Troubleshooting (v2.0)

### Port Already in Use
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000

# Kill the process or change PORT in .env
```

### Database Connection Issues
```bash
# Check if PostgreSQL container is running
docker ps

# View container logs
docker compose logs postgres

# Restart containers
docker compose restart
```

### Redis Connection Issues
```bash
# Check Redis container
docker compose logs redis

# Test Redis connection
docker exec -it eterna-backend_redis redis-cli ping
# Should return: PONG
```

### Prisma Client Not Generated
```bash
# Regenerate Prisma Client
npx prisma generate

# If schema changed, run migration
npx prisma migrate dev
```

### TypeScript Errors
```bash
# Clean build artifacts
npm run clean

# Rebuild
npm run build
```

### No Enhanced Logging in Terminal
```bash
# Ensure NODE_ENV=development in .env
cat .env | grep NODE_ENV

# Restart server to load logging changes
npm run dev

# Check if console logs appear (fallback logging)
```

### Module Resolution Errors in IDE
```bash
# Restart TypeScript server in your IDE
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild the project
npm run build
```

---

## Development Workflow (v2.0)

### 1. Start Development Environment
```bash
# Terminal 1: Start infrastructure
docker compose up -d

# Terminal 2: Start dev server (with enhanced logging)
npm run dev

# Terminal 3: Run tests in watch mode
npm run test:watch
```

### 2. Making Changes
```bash
# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm test
```

### 3. Before Committing
```bash
# Run all checks
npm run lint && npm run format && npm run test:coverage
```

---

## Docker Commands (v2.0)

### View Logs
```bash
# All containers
docker compose logs -f

# Specific container
docker compose logs -f postgres
docker compose logs -f redis
```

### Stop Services
```bash
# Stop containers (keeps data)
docker compose stop

# Stop and remove containers (keeps data in volumes)
docker compose down

# Remove everything including volumes (⚠️ deletes data)
docker compose down -v
```

### Restart Services
```bash
docker compose restart
```

---

## Monitoring (v2.0)

### Check Pipeline Status
```bash
curl http://localhost:3000/api/orders/stats | jq
```

### View Database Records
```bash
# Open Prisma Studio
npx prisma studio

# Or connect directly
docker exec -it eterna-backend_postgres psql -U postgres -d transaction_engine
\dt  # List tables
SELECT * FROM transactions LIMIT 10;
```

### View Redis Data
```bash
docker exec -it eterna-backend_redis redis-cli

# View all keys
KEYS *

# View active transactions
HGETALL active:transaction:ord_123456

# Monitor real-time commands
MONITOR
```

### Enhanced Logging Output
When running `npm run dev`, you'll see:
```
🎯 Transaction execution endpoint hit
├── method: POST
├── url: /api/orders/execute
├── userAgent: PostmanRuntime/7.32.3
├── clientIP: ::1
└── processingTime: 45ms

📊 Metrics endpoint hit
├── method: GET
├── url: /api/orders/stats
└── processingTime: 12ms
```

---

## Production Deployment (v2.0)

### Build Docker Image
```bash
docker build -t transaction-processing-engine .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  --name transaction-engine \
  transaction-processing-engine
```

### Deploy to Cloud Platforms

#### Render.com
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Add PostgreSQL database (free tier available)
5. Add environment variables
6. Deploy

#### Railway.app
1. Create new project from GitHub
2. Add PostgreSQL plugin
3. Add Redis plugin
4. Deploy automatically

---

## Architecture Overview (v2.0)

### New Directory Structure
```
src/core/
├── infrastructure/     # Config and logging
├── modules/           # Feature modules
├── orchestrators/     # Pipeline and Stream orchestration
├── processors/        # Transaction processing
├── services/          # Business logic
├── gateway/           # API routes
├── server.ts          # Fastify server
└── bootstrap.ts       # Application initialization
```

### Key Changes from v1.0
- **Order → Transaction**: Conceptual naming update
- **Queue → Pipeline**: Processing terminology
- **Worker → Processor**: Execution terminology
- **Routes → Gateway**: API layer organization
- **Enhanced Logging**: Custom colored logger with emojis
- **API Compatibility**: Same endpoints, new internal implementation

---

## Next Steps

- ✅ Read [README.md](README.md) for architecture and design decisions
- ✅ Import Postman collection for API testing (no changes needed)
- ✅ Run load tests to see concurrent processing
- ✅ Explore new code structure in `src/core/` directory
- ✅ Check out enhanced logging when hitting endpoints
- ✅ Review tests in `src/tests/` for examples

---

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review logs: `docker compose logs -f`
3. Verify environment variables in `.env`
4. Ensure all prerequisites are installed
5. Check if enhanced logging is working (restart server if needed)

**Happy coding with v2.0! 🚀**
