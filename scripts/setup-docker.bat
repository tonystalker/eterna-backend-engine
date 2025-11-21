@echo off
REM Docker Setup Script for Windows

echo Starting Docker containers...
echo ================================

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop.
    exit /b 1
)

REM Start containers
echo Starting PostgreSQL and Redis...
docker compose up -d

REM Wait for containers
echo.
echo Waiting for containers to be ready...
timeout /t 5 /nobreak >nul

REM Check status
echo.
echo Container Status:
docker compose ps

echo.
echo Docker setup complete!
echo.
echo Next steps:
echo 1. Run: npx prisma generate
echo 2. Run: npx prisma migrate dev
echo 3. Run: npm run dev
