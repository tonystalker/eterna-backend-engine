/**
 * Load Test Script
 * Submits multiple concurrent orders to test throughput and concurrency
 */

import http from 'http';

interface OrderRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage: number;
}

interface TestResult {
  totalOrders: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
}

class LoadTester {
  private results: { success: boolean; duration: number }[] = [];
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Submit a single order
   */
  async submitOrder(order: OrderRequest): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const data = JSON.stringify(order);

      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/execute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          const success = res.statusCode === 201;

          if (!success) {
            console.error(`❌ Order failed (${res.statusCode}):`, body);
          }

          resolve({ success, duration });
        });
      });

      req.on('error', (error) => {
        const duration = Date.now() - startTime;
        console.error('❌ Request error:', error.message);
        resolve({ success: false, duration });
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Submit multiple concurrent orders
   */
  async submitConcurrentOrders(count: number): Promise<void> {
    console.log(`\n🚀 Submitting ${count} concurrent orders...\n`);

    const orders: OrderRequest[] = Array.from({ length: count }, (_, i) => ({
      tokenIn: i % 2 === 0 ? 'SOL' : 'USDC',
      tokenOut: i % 2 === 0 ? 'USDC' : 'SOL',
      amount: Math.random() * 5 + 0.1,
      slippage: 0.01,
    }));

    const promises = orders.map((order, index) => {
      return this.submitOrder(order).then((result) => {
        console.log(
          `${result.success ? '✅' : '❌'} Order ${index + 1}/${count} - ${result.duration}ms`
        );
        this.results.push(result);
        return result;
      });
    });

    await Promise.all(promises);
  }

  /**
   * Submit orders at a specific rate (orders per minute)
   */
  async submitAtRate(ordersPerMinute: number, durationSeconds: number): Promise<void> {
    const intervalMs = (60 * 1000) / ordersPerMinute;
    const totalOrders = Math.floor((durationSeconds * ordersPerMinute) / 60);

    console.log(
      `\n📊 Submitting ${totalOrders} orders at ${ordersPerMinute} orders/min for ${durationSeconds}s...\n`
    );

    let submitted = 0;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (submitted >= totalOrders || Date.now() - startTime >= durationSeconds * 1000) {
          clearInterval(interval);
          resolve();
          return;
        }

        submitted++;
        const order: OrderRequest = {
          tokenIn: submitted % 2 === 0 ? 'SOL' : 'USDC',
          tokenOut: submitted % 2 === 0 ? 'USDC' : 'SOL',
          amount: Math.random() * 2 + 0.5,
          slippage: 0.01,
        };

        this.submitOrder(order).then((result) => {
          console.log(
            `${result.success ? '✅' : '❌'} Order ${submitted}/${totalOrders} - ${result.duration}ms`
          );
          this.results.push(result);
        });
      }, intervalMs);
    });
  }

  /**
   * Calculate and display test results
   */
  getResults(): TestResult {
    const successful = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const durations = this.results.map((r) => r.duration);

    const avgResponseTime =
      durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
    const minResponseTime = Math.min(...durations) || 0;
    const maxResponseTime = Math.max(...durations) || 0;

    // Calculate throughput (orders per minute)
    const totalDuration = maxResponseTime / 1000 / 60; // Convert to minutes
    const throughput = totalDuration > 0 ? this.results.length / totalDuration : 0;

    return {
      totalOrders: this.results.length,
      successful,
      failed,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime,
      maxResponseTime,
      throughput: Math.round(throughput),
    };
  }

  /**
   * Print results
   */
  printResults(): void {
    const results = this.getResults();

    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Orders:       ${results.totalOrders}`);
    console.log(`✅ Successful:      ${results.successful}`);
    console.log(`❌ Failed:          ${results.failed}`);
    console.log(`Success Rate:       ${((results.successful / results.totalOrders) * 100).toFixed(1)}%`);
    console.log('-'.repeat(60));
    console.log(`Avg Response Time:  ${results.avgResponseTime}ms`);
    console.log(`Min Response Time:  ${results.minResponseTime}ms`);
    console.log(`Max Response Time:  ${results.maxResponseTime}ms`);
    console.log('-'.repeat(60));
    console.log(`Throughput:         ${results.throughput} orders/minute`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Reset results
   */
  reset(): void {
    this.results = [];
  }
}

/**
 * Run load tests
 */
async function runLoadTests() {
  const tester = new LoadTester();

  console.log('🧪 ORDER EXECUTION ENGINE - LOAD TEST');
  console.log('=====================================\n');

  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 1: 10 Concurrent Orders
  console.log('\n📋 TEST 1: 10 Concurrent Orders');
  console.log('-'.repeat(60));
  await tester.submitConcurrentOrders(10);
  tester.printResults();

  await new Promise((resolve) => setTimeout(resolve, 3000));
  tester.reset();

  // Test 2: 20 Concurrent Orders (test queue limit)
  console.log('\n📋 TEST 2: 20 Concurrent Orders (Queue Limit Test)');
  console.log('-'.repeat(60));
  await tester.submitConcurrentOrders(20);
  tester.printResults();

  await new Promise((resolve) => setTimeout(resolve, 3000));
  tester.reset();

  // Test 3: 100 Orders/Minute Rate Test
  console.log('\n📋 TEST 3: 100 Orders/Minute (30 seconds)');
  console.log('-'.repeat(60));
  await tester.submitAtRate(100, 30);
  tester.printResults();

  console.log('✅ All load tests completed!\n');
}

// Run tests if executed directly
if (require.main === module) {
  runLoadTests().catch((error) => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

export { LoadTester, runLoadTests };
