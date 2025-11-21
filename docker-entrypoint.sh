#!/bin/sh
set -ex

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed successfully"
echo "🚀 Starting application..."
echo "Current user: $(whoami)"
echo "Node version: $(node --version)"
echo "Checking dist folder:"
ls -la dist/

# Switch to nodejs user and start the application
su-exec nodejs node dist/index.js
