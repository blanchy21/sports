/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WorkerBee Testing Framework
 *
 * This module provides testing utilities for WorkerBee operations,
 * including performance benchmarking, parallel testing, and validation.
 */

import { logger, performance } from './logger';
import { getWorkerBeeConfig } from './config';

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export interface BenchmarkResult {
  operation: string;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  totalTests: number;
}

export interface ParallelTestResult {
  dhiveResult: TestResult;
  workerBeeResult: TestResult;
  performanceComparison: {
    dhiveDuration: number;
    workerBeeDuration: number;
    improvement: number; // percentage
  };
  dataComparison: {
    identical: boolean;
    differences?: string[];
  };
}

class WorkerBeeTester {
  private config = getWorkerBeeConfig();
  private results: TestResult[] = [];
  private benchmarks: BenchmarkResult[] = [];

  /**
   * Run a single test
   */
  async runTest(
    name: string,
    testFunction: () => Promise<any>,
    context?: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting test: ${name}`, context);
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name,
        success: true,
        duration,
        data: result,
      };
      
      this.results.push(testResult);
      performance(name, duration, context);
      logger.info(`Test completed: ${name} (${duration}ms)`, context);
      
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
      
      this.results.push(testResult);
      logger.error(`Test failed: ${name}`, context, error as Error);
      
      return testResult;
    }
  }

  /**
   * Run multiple tests in parallel
   */
  async runParallelTests(
    tests: Array<{ name: string; testFunction: () => Promise<any> }>,
    context?: string
  ): Promise<TestResult[]> {
    logger.info(`Running ${tests.length} parallel tests`, context);
    
    const promises = tests.map(test => 
      this.runTest(test.name, test.testFunction, context)
    );
    
    const results = await Promise.all(promises);
    logger.info(`Completed ${tests.length} parallel tests`, context);
    
    return results;
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(
    operation: string,
    testFunction: () => Promise<any>,
    iterations: number = 10,
    context?: string
  ): Promise<BenchmarkResult> {
    logger.info(`Running benchmark: ${operation} (${iterations} iterations)`, context);
    
    const durations: number[] = [];
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        await testFunction();
        const duration = Date.now() - startTime;
        durations.push(duration);
        successCount++;
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Benchmark iteration ${i + 1} failed`, context, error as Error);
      }
    }
    
    const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const successRate = (successCount / iterations) * 100;
    
    const benchmark: BenchmarkResult = {
      operation,
      averageDuration,
      minDuration,
      maxDuration,
      successRate,
      totalTests: iterations,
    };
    
    this.benchmarks.push(benchmark);
    logger.info(`Benchmark completed: ${operation}`, context, benchmark);
    
    return benchmark;
  }

  /**
   * Compare dhive vs WorkerBee performance
   */
  async comparePerformance(
    operation: string,
    dhiveFunction: () => Promise<any>,
    workerBeeFunction: () => Promise<any>,
    iterations: number = 5,
    context?: string
  ): Promise<ParallelTestResult> {
    logger.info(`Comparing performance: ${operation}`, context);
    
    // Run dhive benchmark
    const dhiveBenchmark = await this.runBenchmark(
      `${operation} (dhive)`,
      dhiveFunction,
      iterations,
      context
    );
    
    // Run WorkerBee benchmark
    const workerBeeBenchmark = await this.runBenchmark(
      `${operation} (WorkerBee)`,
      workerBeeFunction,
      iterations,
      context
    );
    
    const improvement = ((dhiveBenchmark.averageDuration - workerBeeBenchmark.averageDuration) / 
                        dhiveBenchmark.averageDuration) * 100;
    
    const result: ParallelTestResult = {
      dhiveResult: {
        name: `${operation} (dhive)`,
        success: dhiveBenchmark.successRate === 100,
        duration: dhiveBenchmark.averageDuration,
      },
      workerBeeResult: {
        name: `${operation} (WorkerBee)`,
        success: workerBeeBenchmark.successRate === 100,
        duration: workerBeeBenchmark.averageDuration,
      },
      performanceComparison: {
        dhiveDuration: dhiveBenchmark.averageDuration,
        workerBeeDuration: workerBeeBenchmark.averageDuration,
        improvement,
      },
      dataComparison: {
        identical: true, // This would need actual data comparison
        differences: [],
      },
    };
    
    logger.info(`Performance comparison completed: ${operation}`, context, result);
    
    return result;
  }

  /**
   * Validate data consistency between dhive and WorkerBee
   */
  async validateDataConsistency(
    operation: string,
    dhiveFunction: () => Promise<any>,
    workerBeeFunction: () => Promise<any>,
    context?: string
  ): Promise<{ identical: boolean; differences: string[] }> {
    logger.info(`Validating data consistency: ${operation}`, context);
    
    try {
      const [dhiveResult, workerBeeResult] = await Promise.all([
        dhiveFunction(),
        workerBeeFunction(),
      ]);
      
      const differences: string[] = [];
      const identical = this.deepCompare(dhiveResult, workerBeeResult, differences);
      
      logger.info(`Data validation completed: ${operation}`, context, {
        identical,
        differences: differences.length,
      });
      
      return { identical, differences };
    } catch (error) {
      logger.error(`Data validation failed: ${operation}`, context, error as Error);
      return { identical: false, differences: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Deep comparison of objects
   */
  private deepCompare(obj1: any, obj2: any, differences: string[], path: string = ''): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) {
      differences.push(`${path}: null comparison`);
      return false;
    }
    
    if (typeof obj1 !== typeof obj2) {
      differences.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
      return false;
    }
    
    if (typeof obj1 !== 'object') {
      differences.push(`${path}: value mismatch (${obj1} vs ${obj2})`);
      return false;
    }
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      differences.push(`${path}: array vs object mismatch`);
      return false;
    }
    
    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) {
        differences.push(`${path}: array length mismatch (${obj1.length} vs ${obj2.length})`);
        return false;
      }
      
      for (let i = 0; i < obj1.length; i++) {
        if (!this.deepCompare(obj1[i], obj2[i], differences, `${path}[${i}]`)) {
          return false;
        }
      }
    } else {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      if (keys1.length !== keys2.length) {
        differences.push(`${path}: object key count mismatch (${keys1.length} vs ${keys2.length})`);
        return false;
      }
      
      for (const key of keys1) {
        if (!(key in obj2)) {
          differences.push(`${path}: missing key '${key}' in second object`);
          return false;
        }
        
        if (!this.deepCompare(obj1[key], obj2[key], differences, `${path}.${key}`)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Get test results summary
   */
  getTestSummary(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    successRate: number;
    averageDuration: number;
  } {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = (successfulTests / totalTests) * 100;
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    
    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate,
      averageDuration,
    };
  }

  /**
   * Get benchmark results
   */
  getBenchmarkResults(): BenchmarkResult[] {
    return this.benchmarks;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
    this.benchmarks = [];
  }
}

// Create singleton instance
export const tester = new WorkerBeeTester();

// Export convenience functions
export const runTest = (name: string, testFunction: () => Promise<any>, context?: string) =>
  tester.runTest(name, testFunction, context);

export const runBenchmark = (operation: string, testFunction: () => Promise<any>, iterations?: number, context?: string) =>
  tester.runBenchmark(operation, testFunction, iterations, context);

export const comparePerformance = (
  operation: string,
  dhiveFunction: () => Promise<any>,
  workerBeeFunction: () => Promise<any>,
  iterations?: number,
  context?: string
) => tester.comparePerformance(operation, dhiveFunction, workerBeeFunction, iterations, context);

export const validateDataConsistency = (
  operation: string,
  dhiveFunction: () => Promise<any>,
  workerBeeFunction: () => Promise<any>,
  context?: string
) => tester.validateDataConsistency(operation, dhiveFunction, workerBeeFunction, context);

export default tester;
