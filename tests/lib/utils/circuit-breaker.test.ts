/** @jest-environment node */

import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  CircuitOpenError,
  withCircuitBreaker,
} from '@/lib/utils/circuit-breaker';
import { isOk, isErr } from '@/lib/utils/result';

describe('CircuitBreaker state machine', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts CLOSED with canAttempt() true', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(cb.canAttempt()).toBe(true);
  });

  it('execute() success in CLOSED returns ok result', async () => {
    const cb = new CircuitBreaker();
    const r = await cb.execute(async () => 'success');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe('success');
  });

  it('transitions to OPEN after failureThreshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) cb.recordFailure('err');
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('OPEN state: canAttempt() false, execute() returns CircuitOpenError', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, name: 'test' });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    expect(cb.canAttempt()).toBe(false);

    const r = await cb.execute(async () => 'nope');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error).toBeInstanceOf(CircuitOpenError);
      expect((r.error as CircuitOpenError).circuitName).toBe('test');
    }
  });

  it('transitions from OPEN to HALF_OPEN after resetTimeout', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 5000 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    expect(cb.getState()).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(5000);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    expect(cb.canAttempt()).toBe(true);
  });

  it('HALF_OPEN: successThreshold successes transition to CLOSED', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000, successThreshold: 2 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    jest.advanceTimersByTime(1000);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    cb.recordSuccess();
    cb.recordSuccess();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('HALF_OPEN: single failure transitions back to OPEN', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    jest.advanceTimersByTime(1000);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    cb.recordFailure('e3');
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('sliding window: old failures outside monitoringWindow are cleaned', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, monitoringWindow: 5000 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    jest.advanceTimersByTime(6000);
    // Old failures expired, adding one more should not trigger OPEN
    cb.recordFailure('e3');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('reset() clears all state back to CLOSED', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(cb.canAttempt()).toBe(true);
    const stats = cb.getStats();
    expect(stats.failures).toBe(0);
    expect(stats.totalRequests).toBe(0);
  });

  it('getStats() returns correct counts and failure rate', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 5 });
    await cb.execute(async () => 'ok');
    await cb.execute(async () => {
      throw new Error('fail');
    });
    const stats = cb.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failures).toBe(1);
    expect(stats.totalRequests).toBe(2);
    expect(stats.lastSuccessTime).not.toBeNull();
    expect(stats.lastFailureTime).not.toBeNull();
    expect(stats.failureRate).toBeGreaterThan(0);
  });

  it('getRemainingResetTime() returns ms until half-open', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 10000 });
    cb.recordFailure('e1');
    cb.recordFailure('e2');
    jest.advanceTimersByTime(3000);
    expect(cb.getRemainingResetTime()).toBe(7000);
  });

  it('getRemainingResetTime() returns 0 when not OPEN', () => {
    const cb = new CircuitBreaker();
    expect(cb.getRemainingResetTime()).toBe(0);
  });
});

describe('CircuitBreakerRegistry', () => {
  it('getOrCreate creates new circuit, returns existing on second call', () => {
    const registry = new CircuitBreakerRegistry();
    const first = registry.getOrCreate('api');
    const second = registry.getOrCreate('api');
    expect(first).toBe(second);
  });

  it('has / get / remove work correctly', () => {
    const registry = new CircuitBreakerRegistry();
    expect(registry.has('svc')).toBe(false);
    expect(registry.get('svc')).toBeUndefined();

    registry.getOrCreate('svc');
    expect(registry.has('svc')).toBe(true);
    expect(registry.get('svc')).toBeInstanceOf(CircuitBreaker);

    expect(registry.remove('svc')).toBe(true);
    expect(registry.has('svc')).toBe(false);
  });

  it('resetAll resets all circuits', () => {
    const registry = new CircuitBreakerRegistry();
    const a = registry.getOrCreate('a', { failureThreshold: 1 });
    const b = registry.getOrCreate('b', { failureThreshold: 1 });
    a.recordFailure('x');
    b.recordFailure('x');
    expect(a.getState()).toBe(CircuitState.OPEN);
    expect(b.getState()).toBe(CircuitState.OPEN);

    registry.resetAll();
    expect(a.getState()).toBe(CircuitState.CLOSED);
    expect(b.getState()).toBe(CircuitState.CLOSED);
  });

  it('getByState filters by state', () => {
    const registry = new CircuitBreakerRegistry();
    registry.getOrCreate('healthy');
    const broken = registry.getOrCreate('broken', { failureThreshold: 1 });
    broken.recordFailure('x');

    expect(registry.getByState(CircuitState.CLOSED)).toEqual(['healthy']);
    expect(registry.getByState(CircuitState.OPEN)).toEqual(['broken']);
  });

  it('getAllStats returns stats for all circuits', () => {
    const registry = new CircuitBreakerRegistry();
    registry.getOrCreate('x');
    registry.getOrCreate('y');
    const stats = registry.getAllStats();
    expect(stats.size).toBe(2);
    expect(stats.has('x')).toBe(true);
    expect(stats.has('y')).toBe(true);
    expect(stats.get('x')!.state).toBe(CircuitState.CLOSED);
  });
});

describe('withCircuitBreaker convenience', () => {
  it('uses global registry to execute through named circuit', async () => {
    const r = await withCircuitBreaker('test-convenience', async () => 42);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe(42);
  });
});
