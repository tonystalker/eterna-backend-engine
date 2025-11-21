#!/bin/bash
# Docker Setup Script for WSL

echo "🐳 Starting Docker containers..."
echo "================================"

# Navigate to project directory
cd "/mnt/c/Users/Invincible/Desktop/VS_Code folders/Eterna/Backend_T2"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop."
    exit 1
fi

# Start containers
echo "Starting PostgreSQL and Redis..."
docker compose up -d

# Wait for containers to be healthy
echo ""
echo "⏳ Waiting for containers to be ready..."
sleep 5

# Check container status
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "✅ Docker setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: cd '/mnt/c/Users/Invincible/Desktop/VS_Code folders/Eterna/Backend_T2'"
echo "2. Run: npx prisma generate"
echo "3. Run: npx prisma migrate dev"
