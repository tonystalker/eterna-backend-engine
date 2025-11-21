/**
 * WebSocket test - Submit order AFTER connecting to WebSocket
 */
import WebSocket from 'ws';

async function testWebSocketProper() {
  console.log('🧪 WebSocket Live Updates Test (Proper Method)\n');
  console.log('═'.repeat(70));

  // Step 1: Create a placeholder order ID to pre-connect
  // We'll submit the actual order after connecting
  
  console.log('\n📤 Step 1: Submitting order...');
  
  try {
    const response = await fetch('http://localhost:3000/api/orders/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 3.0,
        slippage: 0.01,
      }),
    });

    const order = await response.json();
    const orderId = order.orderId;
    
    console.log(`✅ Order created: ${orderId}`);
    console.log(`📍 Initial status: ${order.status}`);
    console.log(`🔌 WebSocket URL: ${order.websocket}\n`);

    // Step 2: Immediately connect to WebSocket
    console.log('🔌 Step 2: Connecting to WebSocket immediately...');
    const wsUrl = order.websocket.replace('localhost', '127.0.0.1');
    const ws = new WebSocket(wsUrl);

    let messageCount = 0;

    ws.on('open', () => {
      console.log('✅ WebSocket connected!\n');
      console.log('📡 Listening for real-time updates...');
      console.log('─'.repeat(70));
    });

    ws.on('message', (data) => {
      messageCount++;
      const update = JSON.parse(data.toString());
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`\n[${timestamp}] 📨 Message #${messageCount}:`);
      console.log(JSON.stringify(update, null, 2));
      console.log('─'.repeat(70));

      // Close after completion or after 10 messages
      if (update.status === 'completed' || update.status === 'failed' || messageCount >= 10) {
        console.log(`\n✅ Test complete! Received ${messageCount} messages.\n`);
        setTimeout(() => ws.close(), 500);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      process.exit(1);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      console.log('═'.repeat(70));
      console.log(`\n✅ WebSocket test completed! Received ${messageCount} total messages.\n`);
      process.exit(0);
    });

    // Auto-close after 15 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`\n⏱️  Timeout reached. Received ${messageCount} messages.`);
        ws.close();
      }
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testWebSocketProper();
