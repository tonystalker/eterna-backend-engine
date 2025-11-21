/**
 * Simple WebSocket monitoring - Connect to an existing order stream
 */
import WebSocket from 'ws';

const orderId = process.argv[2];

if (!orderId) {
  console.log('Usage: npx tsx scripts/monitor-order.ts <orderId>');
  console.log('\nExample:');
  console.log('  1. Submit an order and copy the orderId');
  console.log('  2. npx tsx scripts/monitor-order.ts ord_1762613166643_l59weki');
  process.exit(1);
}

const wsUrl = `ws://localhost:3000/api/orders/${orderId}/stream`;

console.log(`\n🔌 Connecting to: ${wsUrl}\n`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected! Listening for updates...\n');
  console.log('─'.repeat(70));
});

ws.on('message', (data) => {
  const update = JSON.parse(data.toString());
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(`\n[${timestamp}]`, JSON.stringify(update, null, 2));
  console.log('─'.repeat(70));
});

ws.on('close', () => {
  console.log('\n🔌 Connection closed\n');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

console.log('💡 Press Ctrl+C to stop monitoring\n');
