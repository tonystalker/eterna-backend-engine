-- Migration for Transaction Processing Engine v2.0
-- This migration creates the new transaction_engine database schema

-- Create the orders table (same structure but for new database)
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL DEFAULT 'market',
    "tokenIn" TEXT NOT NULL,
    "tokenOut" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "slippage" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "status" TEXT NOT NULL,
    "selectedDex" TEXT,
    "executedPrice" DOUBLE PRECISION,
    "txHash" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderId_key" ON "orders"("orderId");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

-- Add comments for documentation
COMMENT ON TABLE "orders" IS 'Transaction records for the Transaction Processing Engine';
COMMENT ON COLUMN "orders"."orderId" IS 'Unique transaction identifier (txn_*)';
COMMENT ON COLUMN "orders"."status" IS 'Transaction status: pending, routing, building, submitted, confirmed, failed';
