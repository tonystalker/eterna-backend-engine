/**
 * Submit a single order and display the response
 */

async function submitOrder() {
  const baseUrl = 'http://localhost:3000';

  console.log('🚀 Submitting market order (SOL → USDC, 5.0 amount)...\n');

  try {
    const response = await fetch(`${baseUrl}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 5.0,
        slippage: 0.015,
      }),
    });

    const order = await response.json();
    console.log('✅ Order submitted successfully!\n');
    console.log('Order Details:');
    console.log('─'.repeat(60));
    console.log(`Order ID:    ${order.orderId}`);
    console.log(`Status:      ${order.status}`);
    console.log(`Timestamp:   ${order.timestamp}`);
    console.log(`WebSocket:   ${order.websocket}`);
    console.log('─'.repeat(60));
    console.log('\n📊 Check your server terminal to see:');
    console.log('  • DEX routing decision (Raydium vs Meteora)');
    console.log('  • Quote comparison');
    console.log('  • Order execution steps');
    console.log('  • Final status updates\n');
    
    console.log('💡 Tip: Watch the server logs for about 5-6 seconds to see the complete flow!');
  } catch (error) {
    console.error('❌ Failed to submit order:', error);
    process.exit(1);
  }
}

submitOrder();
