/**
 * WorkerBee Migration Testing Framework
 * 
 * This file contains comprehensive tests to validate WorkerBee functionality
 * and ensure feature parity with the previous implementation.
 */

import { initializeWorkerBeeClient } from '../hive-workerbee/client';
import { fetchUserAccount } from '../hive-workerbee/account';
import { fetchSportsblockPosts, searchPosts } from '../hive-workerbee/content';
import { canUserPost } from '../hive-workerbee/posting';
import { getUserVotingPower, getUserRecentVotes } from '../hive-workerbee/voting';
import { fetchComments } from '../hive-workerbee/comments';

// Test configuration
const TEST_USERNAME = 'gtg'; // Using a known active account for testing
const TEST_POST_AUTHOR = 'gtg';
const TEST_POST_PERMLINK = 'test-post-permlink';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalDuration: number;
  passed: number;
  failed: number;
}

/**
 * Run a single test with timing and error handling
 */
async function runTest(
  testName: string,
  testFunction: () => Promise<unknown>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    return {
      testName,
      passed: true,
      duration,
      data: result
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      testName,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test WorkerBee client initialization
 */
export async function testClientInitialization(): Promise<TestResult> {
  return runTest('Client Initialization', async () => {
    const client = await initializeWorkerBeeClient();
    if (!client) {
      throw new Error('Failed to initialize WorkerBee client');
    }
    return { client: 'initialized' };
  });
}

/**
 * Test account operations
 */
export async function testAccountOperations(): Promise<TestResult[]> {
  const tests = [
    runTest('Fetch User Account', async () => {
      const account = await fetchUserAccount(TEST_USERNAME);
      if (!account) {
        throw new Error('Failed to fetch user account');
      }
      return account;
    }),
    
    runTest('Get User Voting Power', async () => {
      const votingPower = await getUserVotingPower(TEST_USERNAME);
      if (votingPower < 0 || votingPower > 100) {
        throw new Error(`Invalid voting power: ${votingPower}`);
      }
      return votingPower;
    }),
    
    runTest('Get User RC', async () => {
      const account = await fetchUserAccount(TEST_USERNAME);
      if (!account) {
        throw new Error('Failed to fetch account data');
      }
      return { percentage: account.resourceCredits };
    })
  ];
  
  return Promise.all(tests);
}

/**
 * Test content operations
 */
export async function testContentOperations(): Promise<TestResult[]> {
  const tests = [
    runTest('Fetch Sportsblock Posts', async () => {
      const result = await fetchSportsblockPosts({ limit: 10 });
      if (!result || !result.posts) {
        throw new Error('Failed to fetch posts');
      }
      return result;
    }),
    
    runTest('Search Posts', async () => {
      const result = await searchPosts('sports', { limit: 5 });
      if (!result) {
        throw new Error('Failed to search posts');
      }
      return result;
    })
  ];
  
  return Promise.all(tests);
}

/**
 * Test posting operations (read-only for safety)
 */
export async function testPostingOperations(): Promise<TestResult[]> {
  const tests = [
    runTest('Check User Can Post', async () => {
      const canPost = await canUserPost(TEST_USERNAME);
      return canPost;
    })
  ];
  
  return Promise.all(tests);
}

/**
 * Test voting operations (read-only for safety)
 */
export async function testVotingOperations(): Promise<TestResult[]> {
  const tests = [
    runTest('Get User Votes', async () => {
      const votes = await getUserRecentVotes(TEST_USERNAME, 10);
      return votes;
    })
  ];
  
  return Promise.all(tests);
}

/**
 * Test comment operations
 */
export async function testCommentOperations(): Promise<TestResult[]> {
  const tests = [
    runTest('Fetch Comments', async () => {
      const comments = await fetchComments(TEST_POST_AUTHOR, TEST_POST_PERMLINK);
      return comments;
    })
  ];
  
  return Promise.all(tests);
}

/**
 * Run performance benchmark
 */
export async function runPerformanceBenchmark(): Promise<TestResult> {
  return runTest('Performance Benchmark', async () => {
    const iterations = 5;
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await fetchUserAccount(TEST_USERNAME);
      const duration = Date.now() - startTime;
      results.push(duration);
    }
    
    const avgDuration = results.reduce((sum, time) => sum + time, 0) / results.length;
    const minDuration = Math.min(...results);
    const maxDuration = Math.max(...results);
    
    return {
      iterations,
      averageDuration: avgDuration,
      minDuration,
      maxDuration,
      results
    };
  });
}

/**
 * Run complete test suite
 */
export async function runCompleteTestSuite(): Promise<TestSuite> {
  console.log('🧪 Starting WorkerBee Migration Test Suite...');
  const startTime = Date.now();
  
  const results: TestResult[] = [];
  
  try {
    // Test client initialization
    console.log('📡 Testing client initialization...');
    results.push(await testClientInitialization());
    
    // Test account operations
    console.log('👤 Testing account operations...');
    const accountResults = await testAccountOperations();
    results.push(...accountResults);
    
    // Test content operations
    console.log('📝 Testing content operations...');
    const contentResults = await testContentOperations();
    results.push(...contentResults);
    
    // Test posting operations
    console.log('✍️ Testing posting operations...');
    const postingResults = await testPostingOperations();
    results.push(...postingResults);
    
    // Test voting operations
    console.log('🗳️ Testing voting operations...');
    const votingResults = await testVotingOperations();
    results.push(...votingResults);
    
    // Test comment operations
    console.log('💬 Testing comment operations...');
    const commentResults = await testCommentOperations();
    results.push(...commentResults);
    
    // Run performance benchmark
    console.log('⚡ Running performance benchmark...');
    results.push(await runPerformanceBenchmark());
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  const suite: TestSuite = {
    suiteName: 'WorkerBee Migration Test Suite',
    results,
    totalDuration,
    passed,
    failed
  };
  
  // Log results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  // Log failed tests
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.testName}: ${r.error}`);
      });
  }
  
  return suite;
}

/**
 * Run specific test category
 */
export async function runTestCategory(category: string): Promise<TestResult[]> {
  switch (category) {
    case 'account':
      return testAccountOperations();
    case 'content':
      return testContentOperations();
    case 'posting':
      return testPostingOperations();
    case 'voting':
      return testVotingOperations();
    case 'comments':
      return testCommentOperations();
    default:
      throw new Error(`Unknown test category: ${category}`);
  }
}

/**
 * Generate test report
 */
export function generateTestReport(suite: TestSuite): string {
  const report = `
# WorkerBee Migration Test Report

## Summary
- **Test Suite**: ${suite.suiteName}
- **Total Tests**: ${suite.results.length}
- **Passed**: ${suite.passed} ✅
- **Failed**: ${suite.failed} ❌
- **Success Rate**: ${((suite.passed / suite.results.length) * 100).toFixed(1)}%
- **Total Duration**: ${suite.totalDuration}ms

## Test Results

${suite.results.map(result => `
### ${result.testName}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## Recommendations

${suite.failed === 0 
  ? '🎉 All tests passed! WorkerBee migration is ready for production.'
  : `⚠️ ${suite.failed} test(s) failed. Please review and fix issues before proceeding.`
}
`;

  return report;
}
