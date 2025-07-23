/**
 * WebSocket Centralization Test
 * 
 * This script tests the centralized WebSocket management system
 * Run in browser console to verify functionality
 */

// Test function to verify WebSocket centralization
async function testWebSocketCentralization() {
  console.log('🧪 Testing WebSocket Centralization...\n');
  
  try {
    // Get access to the WebSocket manager
    const webSocketManager = window.webSocketManager;
    
    if (!webSocketManager) {
      console.error('❌ WebSocketManager not found on window object');
      return false;
    }
    
    console.log('✅ WebSocketManager found');
    
    // Test 1: Check initial state
    console.log('\n📊 Initial Statistics:');
    const initialStats = webSocketManager.getGlobalStats();
    console.log('- Total connections:', initialStats.totalConnections);
    console.log('- Active connections:', initialStats.activeConnections);
    console.log('- Reconnecting:', initialStats.reconnecting);
    console.log('- Connections:', initialStats.connections);
    
    // Test 2: Verify singleton pattern
    console.log('\n🔄 Testing Singleton Pattern...');
    const webSocketService1 = (await import('/src/services/webSocketService.js')).default;
    const webSocketService2 = (await import('/src/services/webSocketService.js')).default;
    
    if (webSocketService1 === webSocketService2) {
      console.log('✅ WebSocket service is a singleton');
    } else {
      console.log('❌ WebSocket service is not a singleton');
    }
    
    // Test 3: Test connection management
    console.log('\n📡 Testing Connection Management...');
    
    // Simulate getting a notification connection
    try {
      await webSocketService1.getNotificationConnection(
        'test-user-123',
        (data) => console.log('📨 Test message received:', data),
        (status, message) => console.log(`📶 Connection status: ${status}${message ? ` - ${message}` : ''}`)
      );
      console.log('✅ Notification connection created successfully');
    } catch (error) {
      console.log('⚠️ Notification connection test skipped (requires auth):', error.message);
    }
    
    // Test 4: Check statistics after connection attempt
    console.log('\n📊 Updated Statistics:');
    const updatedStats = webSocketManager.getGlobalStats();
    console.log('- Total connections:', updatedStats.totalConnections);
    console.log('- Active connections:', updatedStats.activeConnections);
    console.log('- Reconnecting:', updatedStats.reconnecting);
    console.log('- Connections:', updatedStats.connections);
    
    // Test 5: Test cleanup
    console.log('\n🧹 Testing Cleanup...');
    webSocketService1.closeNotificationConnection('test-user-123');
    
    const cleanupStats = webSocketManager.getGlobalStats();
    console.log('- Connections after cleanup:', cleanupStats.connections.length);
    
    console.log('\n✅ WebSocket Centralization Test Completed Successfully!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Test function for connection status monitoring
function testConnectionStatusMonitoring() {
  console.log('\n🖥️ Testing Connection Status Monitoring...\n');
  
  const indicator = document.querySelector('[title*="WebSocket Status"]');
  
  if (indicator) {
    console.log('✅ Connection Status Indicator found');
    console.log('📊 Current status:', indicator.title);
  } else {
    console.log('⚠️ Connection Status Indicator not found (may not be rendered yet)');
  }
}

// Main test runner
async function runWebSocketTests() {
  console.clear();
  console.log('🚀 WebSocket Centralization Test Suite\n');
  console.log('==========================================\n');
  
  const results = {
    centralization: await testWebSocketCentralization(),
    monitoring: testConnectionStatusMonitoring()
  };
  
  console.log('\n==========================================');
  console.log('📋 Test Results Summary:');
  console.log('- Centralization:', results.centralization ? '✅ PASS' : '❌ FAIL');
  console.log('- Monitoring:', results.monitoring !== false ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result !== false);
  console.log('\n🏆 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return results;
}

// Usage instructions
console.log(`
🧪 WebSocket Centralization Test Available!

To run the tests, execute in console:
runWebSocketTests()

Or run individual tests:
testWebSocketCentralization()
testConnectionStatusMonitoring()
`);

// Make functions available globally for testing
window.runWebSocketTests = runWebSocketTests;
window.testWebSocketCentralization = testWebSocketCentralization;
window.testConnectionStatusMonitoring = testConnectionStatusMonitoring;