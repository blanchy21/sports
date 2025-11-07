/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

const shouldRun = process.env.RUN_WORKERBEE_TESTS === 'true';
let runCompleteTestSuite: typeof import('@/lib/testing/workerbee-tests')['runCompleteTestSuite'];
let stopWorkerBeeClient: typeof import('@/lib/hive-workerbee/client')['stopWorkerBeeClient'];
let workerbeeAvailable = false;
let unavailableReason = 'WorkerBee runtime not available';
const consoleSpies: Array<ReturnType<typeof jest.spyOn>> = [];

(shouldRun ? describe : describe.skip)('WorkerBee migration suite', () => {
  beforeAll(async () => {
    jest.setTimeout(180_000);
    consoleSpies.push(
      jest.spyOn(console, 'log').mockImplementation(() => {}),
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'error').mockImplementation(() => {})
    );
    try {
      ({ runCompleteTestSuite } = await import('@/lib/testing/workerbee-tests'));
      ({ stopWorkerBeeClient } = await import('@/lib/hive-workerbee/client'));
      workerbeeAvailable = true;
    } catch (error) {
      console.error('[WorkerBee migration suite] Failed to import test harness:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown WorkerBee import error';
      unavailableReason = message.includes('@hiveio/workerbee')
        ? 'WorkerBee native bindings (@hiveio/workerbee) are not installed for this environment.'
        : message;
    }
  });

  it('completes without failures', async () => {
    if (!workerbeeAvailable) {
      console.warn('[WorkerBee migration suite] Skipping:', unavailableReason);
      return;
    }

    const suite = await runCompleteTestSuite();
    expect(suite.failed).toBe(0);
  });

  afterAll(async () => {
    for (const spy of consoleSpies) {
      spy.mockRestore();
    }
    if (workerbeeAvailable && stopWorkerBeeClient) {
      await stopWorkerBeeClient().catch(() => {});
    }
  });
});
