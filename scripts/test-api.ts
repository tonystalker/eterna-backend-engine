/**
 * Quick API test script
 */

async function testAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('🧪 Testing Order Execution Engine API\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const health = await healthRes.json();
    console.log('✅ Health:', health);
    console.log('');

    // Test 2: API Info
    console.log('2️⃣ Testing API Info...');
    const infoRes = await fetch(`${baseUrl}/`);
    const info = await infoRes.json();
    console.log('✅ API Info:', info);
    console.log('');

    // Test 3: Submit Order - SOL to USDC
    console.log('3️⃣ Submitting Market Order (SOL → USDC)...');
    const orderRes = await fetch(`${baseUrl}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1.5,
        slippage: 0.01,
      }),
    });
    const order = await orderRes.json();
    console.log('✅ Order Created:', order);
    console.log('');

    // Test 4: Get Stats
    console.log('4️⃣ Getting Order Stats...');
    await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait for order to process
    const statsRes = await fetch(`${baseUrl}/api/orders/stats`);
    const stats = await statsRes.json();
    console.log('✅ Stats:', stats);
    console.log('');

    // Test 5: Submit another order - USDC to SOL
    console.log('5️⃣ Submitting Market Order (USDC → SOL)...');
    const order2Res = await fetch(`${baseUrl}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'USDC',
        tokenOut: 'SOL',
        amount: 150,
        slippage: 0.005,
      }),
    });
    const order2 = await order2Res.json();
    console.log('✅ Order Created:', order2);
    console.log('');

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAPI();
