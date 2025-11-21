/**
 * WebSocket test client - Connect to order stream and watch real-time updates
 */
import WebSocket from 'ws';

async function testWebSocket() {
  const baseUrl = 'http://localhost:3000';

  console.log('🧪 WebSocket Live Updates Test\n');
  console.log('═'.repeat(70));

  try {
    // Step 1: Submit an order
    console.log('\n📤 Step 1: Submitting order...');
    const response = await fetch(`${baseUrl}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 2.5,
        slippage: 0.01,
      }),
    });

    const order = await response.json();
    console.log(`✅ Order created: ${order.orderId}`);
    console.log(`📍 Status: ${order.status}`);

    // Step 2: Connect to WebSocket
    const wsUrl = order.websocket.replace('localhost', '127.0.0.1');
    console.log(`\n🔌 Step 2: Connecting to WebSocket...`);
    console.log(`   ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('✅ WebSocket connected!\n');
      console.log('📡 Listening for real-time updates...');
      console.log('─'.repeat(70));
    });

    ws.on('message', (data) => {
      const update = JSON.parse(data.toString());
      const timestamp = new Date().toLocaleTimeString();
      
      // Handle connection established event
      if (update.event === 'connection:established') {
        console.log(`✅ Connection confirmed for order: ${update.orderId}\n`);
        return;
      }
      
      console.log(`\n[${timestamp}] 📨 Status Update Received:`);
      console.log(`   Order ID: ${update.orderId}`);
      console.log(`   Status:   ${update.status.toUpperCase()}`);
      
      if (update.data) {
        if (update.data.selectedDex) {
          console.log(`   DEX:      ${update.data.selectedDex}`);
        }
        if (update.data.quotes) {
          console.log(`   Raydium:  ${update.data.quotes.raydium.outputAmount} (fee: ${update.data.quotes.raydium.fee})`);
          console.log(`   Meteora:  ${update.data.quotes.meteora.outputAmount} (fee: ${update.data.quotes.meteora.fee})`);
        }
        if (update.data.txHash) {
          console.log(`   TX Hash:  ${update.data.txHash}`);
        }
        if (update.data.outputAmount) {
          console.log(`   Output:   ${update.data.outputAmount} ${update.data.tokenOut || ''}`);
        }
      }
      
      console.log('─'.repeat(70));

      // Close after completion
      if (update.status === 'completed' || update.status === 'failed') {
        console.log(`\n✅ Order ${update.status}! Closing connection...\n`);
        setTimeout(() => ws.close(), 500);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      console.log('═'.repeat(70));
      console.log('\n✅ WebSocket test completed!\n');
      process.exit(0);
    });

    // Auto-close after 30 seconds if not completed
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏱️  Test timeout - closing connection...');
        ws.close();
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testWebSocket();
