#!/usr/bin/env node

/**
 * Simple Wax API Test via HTTP
 * 
 * Tests Wax API functionality by calling the Next.js API routes
 * that use Wax internally. This avoids module resolution issues.
 */

const TEST_USERNAME = 'blanchy';
const API_BASE = 'http://localhost:3000';

async function testApiEndpoint(endpoint: string, description: string): Promise<void> {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   Endpoint: ${endpoint}`);
    
    const startTime = Date.now();
    const response = await fetch(endpoint);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`);
      const text = await response.text();
      console.log(`   Error: ${text.substring(0, 200)}`);
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ Success (${duration}ms)`);
    
    if (data.success) {
      console.log(`   Result: ${JSON.stringify(data).substring(0, 150)}...`);
    } else {
      console.log(`   ⚠️  API returned success: false`);
      if (data.error) {
        console.log(`   Error: ${data.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('🧪 Wax API Test via HTTP Endpoints');
  console.log('==================================');
  console.log(`Testing against: ${API_BASE}`);
  console.log(`Test username: ${TEST_USERNAME}`);
  
  // Test account summary (uses Wax internally)
  await testApiEndpoint(
    `${API_BASE}/api/hive/account/summary?username=${TEST_USERNAME}`,
    'Account Summary (uses Wax with fallback)'
  );
  
  // Test account history (uses Wax internally)
  await testApiEndpoint(
    `${API_BASE}/api/hive/account/history?username=${TEST_USERNAME}&limit=5`,
    'Account History (uses Wax with fallback)'
  );
  
  console.log('\n✨ Test Complete!');
  console.log('\n📝 Notes:');
  console.log('- If you see errors about "requestInterceptor", Wax is falling back to HTTP (expected)');
  console.log('- If you see successful responses, the API is working (either via Wax or HTTP fallback)');
  console.log('- Check the server console for detailed Wax API logs');
}

main().catch(console.error);

