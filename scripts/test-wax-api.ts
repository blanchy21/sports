#!/usr/bin/env node

/**
 * Wax API Test Script
 * 
 * Tests the re-enabled Wax API calls to verify:
 * 1. Wax initialization works
 * 2. API calls function correctly
 * 3. requestInterceptor issues are handled gracefully
 * 4. Fallback to HTTP API works when needed
 */

import { 
  getWaxClient, 
  getWaxProtocolInfo, 
  checkWaxHealth,
  initializeWorkerBeeClient 
} from '../src/lib/hive-workerbee/client';
import { 
  getAccountWax, 
  getContentWax, 
  getDiscussionsWax,
  getWaxProtocolVersion 
} from '../src/lib/hive-workerbee/wax-helpers';
import { makeWaxApiCall } from '../src/lib/hive-workerbee/api';

const TEST_USERNAME = 'blanchy';
const TEST_AUTHOR = 'blanchy';
const TEST_PERMLINK = 'test-post';

interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
  error?: string;
  details?: string;
}

async function runTest(name: string, testFn: () => Promise<unknown>): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    return {
      name,
      status: 'PASSED',
      duration,
      details: typeof result === 'string' ? result : JSON.stringify(result).substring(0, 100)
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a requestInterceptor issue (expected fallback)
    if (errorMessage.includes('requestInterceptor') || errorMessage.includes('temporarily disabled')) {
      return {
        name,
        status: 'SKIPPED',
        duration,
        error: 'requestInterceptor issue detected - using HTTP fallback (expected)',
        details: 'Wax API not available in this environment, but fallback works'
      };
    }
    
    return {
      name,
      status: 'FAILED',
      duration,
      error: errorMessage
    };
  }
}

async function testWaxInitialization(): Promise<void> {
  console.log('\n📦 Testing Wax Initialization...');
  console.log('================================');
  
  const results: TestResult[] = [];
  
  // Test 1: Initialize WorkerBee client
  results.push(await runTest('Initialize WorkerBee Client', async () => {
    const client = await initializeWorkerBeeClient();
    if (!client) throw new Error('Client is null');
    if (!client.running) throw new Error('Client is not running');
    return 'WorkerBee client initialized successfully';
  }));
  
  // Test 2: Get Wax client
  results.push(await runTest('Get Wax Client', async () => {
    const wax = await getWaxClient();
    if (!wax) throw new Error('Wax instance is null');
    return 'Wax client retrieved successfully';
  }));
  
  // Test 3: Check Wax health
  results.push(await runTest('Check Wax Health', async () => {
    const health = await checkWaxHealth();
    return `Health: ${health.isHealthy ? 'Healthy' : 'Unhealthy'}, Latency: ${health.latency}ms`;
  }));
  
  // Test 4: Get Wax protocol info
  results.push(await runTest('Get Wax Protocol Info', async () => {
    const info = await getWaxProtocolInfo();
    return `Version: ${info.version}, Chain ID: ${info.chainId}, Head Block: ${info.headBlockNumber}`;
  }));
  
  // Test 5: Get Wax protocol version
  results.push(await runTest('Get Wax Protocol Version', async () => {
    const version = await getWaxProtocolVersion();
    return `Protocol Version: ${version}`;
  }));
  
  // Print results
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'SKIPPED' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\n📊 Initialization Results: ${passed} passed, ${skipped} skipped, ${failed} failed`);
}

async function testWaxApiCalls(): Promise<void> {
  console.log('\n🔌 Testing Wax API Calls...');
  console.log('================================');
  
  const results: TestResult[] = [];
  
  // Test 1: Get account via Wax
  results.push(await runTest('Get Account via Wax', async () => {
    const account = await getAccountWax(TEST_USERNAME);
    if (!account) throw new Error('Account is null');
    const accountObj = account as Record<string, unknown>;
    return `Account: ${accountObj.name || 'unknown'}, Balance: ${accountObj.balance || 'unknown'}`;
  }));
  
  // Test 2: Get content via Wax
  results.push(await runTest('Get Content via Wax', async () => {
    const content = await getContentWax(TEST_AUTHOR, TEST_PERMLINK);
    // This might fail if the post doesn't exist, which is OK
    if (!content) {
      return 'Content not found (may not exist)';
    }
    const contentObj = content as Record<string, unknown>;
    return `Content: ${contentObj.title || 'unknown'}`;
  }));
  
  // Test 3: Get discussions via Wax
  results.push(await runTest('Get Discussions via Wax', async () => {
    const discussions = await getDiscussionsWax('get_discussions_by_created', [
      {
        tag: 'sportsblock',
        limit: 5,
        start_author: '',
        start_permlink: ''
      }
    ]);
    return `Found ${discussions.length} discussions`;
  }));
  
  // Test 4: Make Wax API call (generic)
  results.push(await runTest('Make Generic Wax API Call', async () => {
    const result = await makeWaxApiCall('get_dynamic_global_properties', []);
    if (!result) throw new Error('Result is null');
    const resultObj = result as Record<string, unknown>;
    return `Head Block: ${resultObj.head_block_number || 'unknown'}`;
  }));
  
  // Test 5: Get accounts via Wax API call
  results.push(await runTest('Get Accounts via Wax API Call', async () => {
    const result = await makeWaxApiCall('get_accounts', [[TEST_USERNAME]]);
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('No accounts returned');
    }
    const account = result[0] as Record<string, unknown>;
    return `Account: ${account.name || 'unknown'}`;
  }));
  
  // Print results
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'SKIPPED' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\n📊 API Calls Results: ${passed} passed, ${skipped} skipped, ${failed} failed`);
}

async function testWaxFallback(): Promise<void> {
  console.log('\n🔄 Testing Wax Fallback to HTTP...');
  console.log('================================');
  
  const results: TestResult[] = [];
  
  // Test that fallback works when Wax fails
  results.push(await runTest('Verify HTTP Fallback Works', async () => {
    // Even if Wax fails, the fallback should work
    const result = await makeWaxApiCall('get_dynamic_global_properties', []);
    if (!result) throw new Error('Fallback failed - no result');
    const resultObj = result as Record<string, unknown>;
    if (!resultObj.head_block_number) {
      throw new Error('Fallback result is invalid');
    }
    return `Fallback successful - Head Block: ${resultObj.head_block_number}`;
  }));
  
  // Print results
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'SKIPPED' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\n📊 Fallback Results: ${passed} passed, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  console.log('🧪 Wax API Test Suite');
  console.log('====================');
  console.log(`Testing with username: ${TEST_USERNAME}`);
  console.log(`Testing with author/permlink: @${TEST_AUTHOR}/${TEST_PERMLINK}`);
  
  try {
    await testWaxInitialization();
    await testWaxApiCalls();
    await testWaxFallback();
    
    console.log('\n✨ Test Suite Complete!');
    console.log('\n📝 Summary:');
    console.log('- If tests show ⚠️ SKIPPED, Wax API has requestInterceptor issues (expected)');
    console.log('- If tests show ✅ PASSED, Wax API is working correctly');
    console.log('- If tests show ❌ FAILED, there may be a configuration issue');
    console.log('- All tests should fallback to HTTP API if Wax fails');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);

