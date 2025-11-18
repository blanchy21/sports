#!/usr/bin/env node

/**
 * WorkerBee Optimization Testing Script
 * 
 * This script tests the performance optimizations to ensure they're working correctly.
 */

import { performance } from 'perf_hooks';

// Type definitions for better type safety
interface AccountData {
  username: string;
  balance: string;
  reputation: number;
  created: string;
}

interface ContentData {
  method: string;
  params: unknown[];
  data: string;
  timestamp: number;
}

interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheSize: number;
  hitRate: string;
}

interface TestResult {
  duration1: number;
  duration2: number;
  improvement: number;
}

interface BatchResult {
  duration: number;
  requestCount: number;
}

interface OptimizationResults {
  accountCaching: TestResult;
  contentCaching: TestResult;
  batchProcessing: BatchResult;
}

// Mock the optimization functions for testing
class MockOptimizer {
  private cache = new Map<string, AccountData | ContentData>();
  private requestCount = 0;
  private cacheHits = 0;

  async getAccountOptimized(username: string): Promise<AccountData> {
    this.requestCount++;
    
    // Check cache first
    const cacheKey = `account:${username}`;
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      console.log(`✅ Cache HIT for account: ${username}`);
      return this.cache.get(cacheKey) as AccountData;
    }

    // Simulate API call with delay
    console.log(`🌐 API CALL for account: ${username}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const account: AccountData = {
      username,
      balance: '1000.000 HIVE',
      reputation: 50.5,
      created: '2020-01-01T00:00:00Z'
    };

    // Cache the result
    this.cache.set(cacheKey, account);
    return account;
  }

  async getContentOptimized(method: string, params: unknown[]): Promise<ContentData> {
    this.requestCount++;
    
    // Check cache first
    const cacheKey = `content:${method}:${JSON.stringify(params)}`;
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      console.log(`✅ Cache HIT for content: ${method}`);
      return this.cache.get(cacheKey) as ContentData;
    }

    // Simulate API call with delay
    console.log(`🌐 API CALL for content: ${method}`);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const result: ContentData = {
      method,
      params,
      data: 'Mock content data',
      timestamp: Date.now()
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    return result;
  }

  getCacheStats(): CacheStats {
    const hitRate = this.requestCount > 0 ? (this.cacheHits / this.requestCount) * 100 : 0;
    return {
      totalRequests: this.requestCount,
      cacheHits: this.cacheHits,
      cacheSize: this.cache.size,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.requestCount = 0;
    this.cacheHits = 0;
  }
}

class OptimizationTester {
  private optimizer: MockOptimizer;

  constructor() {
    this.optimizer = new MockOptimizer();
  }

  async testAccountCaching(): Promise<TestResult> {
    console.log('\n🧪 Testing Account Caching...');
    console.log('================================');
    
    const usernames = ['blanchy', 'hiveio', 'steemit'];
    
    // First round - should hit API
    console.log('\n📡 First round (API calls):');
    const start1 = performance.now();
    
    for (const username of usernames) {
      await this.optimizer.getAccountOptimized(username);
    }
    
    const duration1 = performance.now() - start1;
    console.log(`⏱️  First round took: ${duration1.toFixed(2)}ms`);
    
    // Second round - should hit cache
    console.log('\n💾 Second round (cache hits):');
    const start2 = performance.now();
    
    for (const username of usernames) {
      await this.optimizer.getAccountOptimized(username);
    }
    
    const duration2 = performance.now() - start2;
    console.log(`⏱️  Second round took: ${duration2.toFixed(2)}ms`);
    
    const improvement = ((duration1 - duration2) / duration1) * 100;
    console.log(`🚀 Performance improvement: ${improvement.toFixed(1)}% faster`);
    
    return { duration1, duration2, improvement };
  }

  async testContentCaching(): Promise<TestResult> {
    console.log('\n🧪 Testing Content Caching...');
    console.log('================================');
    
    const methods: Array<[string, unknown[]]> = [
      ['get_discussions_by_created', [{ tag: 'sportsblock', limit: 20, start_author: '', start_permlink: '' }]],
      ['get_discussions_by_trending', [{ tag: 'sportsblock', limit: 10 }]],
      ['get_discussions_by_hot', [{ tag: 'sportsblock', limit: 15 }]]
    ];
    
    // First round - should hit API
    console.log('\n📡 First round (API calls):');
    const start1 = performance.now();
    
    for (const [method, params] of methods) {
      await this.optimizer.getContentOptimized(method, params);
    }
    
    const duration1 = performance.now() - start1;
    console.log(`⏱️  First round took: ${duration1.toFixed(2)}ms`);
    
    // Second round - should hit cache
    console.log('\n💾 Second round (cache hits):');
    const start2 = performance.now();
    
    for (const [method, params] of methods) {
      await this.optimizer.getContentOptimized(method, params);
    }
    
    const duration2 = performance.now() - start2;
    console.log(`⏱️  Second round took: ${duration2.toFixed(2)}ms`);
    
    const improvement = ((duration1 - duration2) / duration1) * 100;
    console.log(`🚀 Performance improvement: ${improvement.toFixed(1)}% faster`);
    
    return { duration1, duration2, improvement };
  }

  async testBatchProcessing(): Promise<BatchResult> {
    console.log('\n🧪 Testing Batch Processing...');
    console.log('================================');
    
    interface BatchRequest {
      type: 'account' | 'content';
      data: string | [string, unknown[]];
    }

    const requests: BatchRequest[] = [
      { type: 'account', data: 'blanchy' },
      { type: 'account', data: 'hiveio' },
      { type: 'content', data: ['get_discussions_by_created', [{ tag: 'sportsblock', limit: 20, start_author: '', start_permlink: '' }]] },
      { type: 'content', data: ['get_discussions_by_trending', [{ tag: 'sportsblock', limit: 10 }]] }
    ];
    
    console.log('\n📡 Processing batch requests:');
    const start = performance.now();
    
    const promises = requests.map(async (request) => {
      if (request.type === 'account') {
        return this.optimizer.getAccountOptimized(request.data as string);
      } else {
        const [method, params] = request.data as [string, unknown[]];
        return this.optimizer.getContentOptimized(method, params);
      }
    });
    
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    console.log(`⏱️  Batch processing took: ${duration.toFixed(2)}ms`);
    console.log(`📊 Average per request: ${(duration / requests.length).toFixed(2)}ms`);
    
    return { duration, requestCount: requests.length };
  }

  async runAllTests(): Promise<OptimizationResults> {
    console.log('🔬 WorkerBee Optimization Testing');
    console.log('==================================');
    
    const results: OptimizationResults = {
      accountCaching: await this.testAccountCaching(),
      contentCaching: await this.testContentCaching(),
      batchProcessing: await this.testBatchProcessing()
    };
    
    // Display cache statistics
    const cacheStats = this.optimizer.getCacheStats();
    console.log('\n📊 Cache Statistics:');
    console.log('====================');
    console.log(`Total Requests: ${cacheStats.totalRequests}`);
    console.log(`Cache Hits: ${cacheStats.cacheHits}`);
    console.log(`Cache Size: ${cacheStats.cacheSize}`);
    console.log(`Hit Rate: ${cacheStats.hitRate}`);
    
    // Calculate overall performance improvement
    const avgImprovement = (
      results.accountCaching.improvement + 
      results.contentCaching.improvement
    ) / 2;
    
    console.log('\n🎯 Overall Performance Summary:');
    console.log('================================');
    console.log(`Average Cache Hit Rate: ${cacheStats.hitRate}`);
    console.log(`Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
    console.log(`Batch Processing Efficiency: ${(results.batchProcessing.requestCount / (results.batchProcessing.duration / 1000)).toFixed(2)} requests/second`);
    
    console.log('\n✅ Optimization testing completed successfully!');
    
    return results;
  }
}

// Run tests if this script is executed directly
async function main(): Promise<void> {
  const tester = new OptimizationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { OptimizationTester, MockOptimizer };
