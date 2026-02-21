/** @jest-environment node */

import {
  ok,
  err,
  apiOk,
  apiErr,
  isOk,
  isErr,
  isApiOk,
  isApiErr,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  unwrapApi,
  unwrapApiOr,
  map,
  mapErr,
  andThen,
  tryCatch,
  tryCatchApi,
  mapToApiError,
  toLegacy,
  fromLegacy,
} from '@/lib/utils/result';

describe('Result constructors', () => {
  it('ok() wraps data', () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it('err() wraps error', () => {
    const e = new Error('fail');
    const r = err(e);
    expect(r).toEqual({ ok: false, error: e });
  });

  it('apiOk() wraps data with optional meta', () => {
    const r = apiOk('hello', { cached: true, stale: false });
    expect(r).toEqual({ ok: true, data: 'hello', meta: { cached: true, stale: false } });
  });

  it('apiErr() wraps error with optional staleData', () => {
    const error = { code: 'TIMEOUT' as const, message: 'timed out', retryable: true };
    const r = apiErr(error, 'stale');
    expect(r).toEqual({ ok: false, error, staleData: 'stale' });
  });
});

describe('Type guards', () => {
  it('isOk/isErr discriminate Result', () => {
    const success = ok(1);
    const failure = err(new Error('x'));
    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it('isApiOk/isApiErr discriminate ApiResult', () => {
    const success = apiOk('data');
    const failure = apiErr({ code: 'NOT_FOUND', message: 'nope', retryable: false });
    expect(isApiOk(success)).toBe(true);
    expect(isApiErr(success)).toBe(false);
    expect(isApiOk(failure)).toBe(false);
    expect(isApiErr(failure)).toBe(true);
  });
});

describe('Unwrap functions', () => {
  it('unwrap returns data on ok', () => {
    expect(unwrap(ok('value'))).toBe('value');
  });

  it('unwrap throws on err', () => {
    const e = new Error('boom');
    expect(() => unwrap(err(e))).toThrow(e);
  });

  it('unwrapOr returns data on ok', () => {
    expect(unwrapOr(ok(10), 0)).toBe(10);
  });

  it('unwrapOr returns fallback on err', () => {
    expect(unwrapOr(err(new Error('x')), 99)).toBe(99);
  });

  it('unwrapOrElse calls fn(error) on err', () => {
    const result = unwrapOrElse(err(new Error('len=3')), (e) => e.message.length);
    expect(result).toBe(5);
  });

  it('unwrapApi returns data on ok', () => {
    expect(unwrapApi(apiOk('fresh'))).toBe('fresh');
  });

  it('unwrapApi returns staleData when present', () => {
    const r = apiErr({ code: 'TIMEOUT', message: 't', retryable: true }, 'stale-val');
    expect(unwrapApi(r)).toBe('stale-val');
  });

  it('unwrapApi throws when neither data nor staleData', () => {
    const r = apiErr({ code: 'TIMEOUT', message: 'fail', retryable: true });
    expect(() => unwrapApi(r)).toThrow('fail');
  });

  it('unwrapApiOr returns data on ok', () => {
    expect(unwrapApiOr(apiOk(5), 0)).toBe(5);
  });

  it('unwrapApiOr returns staleData over fallback', () => {
    const r = apiErr({ code: 'TIMEOUT', message: 't', retryable: true }, 'stale');
    expect(unwrapApiOr(r, 'fallback')).toBe('stale');
  });

  it('unwrapApiOr returns fallback when no staleData', () => {
    const r = apiErr({ code: 'TIMEOUT', message: 't', retryable: true });
    expect(unwrapApiOr(r, 'fallback')).toBe('fallback');
  });
});

describe('Transformation functions', () => {
  it('map transforms data on ok', () => {
    const r = map(ok(2), (n) => n * 3);
    expect(r).toEqual({ ok: true, data: 6 });
  });

  it('map passes through err', () => {
    const e = new Error('x');
    const r = map(err(e), (n: number) => n * 3);
    expect(r).toEqual({ ok: false, error: e });
  });

  it('mapErr transforms error on err', () => {
    const r = mapErr(err('bad'), (s) => s.toUpperCase());
    expect(r).toEqual({ ok: false, error: 'BAD' });
  });

  it('mapErr passes through ok', () => {
    const r = mapErr(ok(1), (e: Error) => e.message);
    expect(r).toEqual({ ok: true, data: 1 });
  });

  it('andThen chains ok results', () => {
    const r = andThen(ok(3), (n) => ok(n + 7));
    expect(r).toEqual({ ok: true, data: 10 });
  });

  it('andThen passes through err', () => {
    const e = new Error('stop');
    const r = andThen(err(e), (_n: number) => ok(99));
    expect(r).toEqual({ ok: false, error: e });
  });
});

describe('Async wrappers', () => {
  it('tryCatch wraps success into ok', async () => {
    const r = await tryCatch(async () => 'done');
    expect(r).toEqual({ ok: true, data: 'done' });
  });

  it('tryCatch wraps failure into err', async () => {
    const r = await tryCatch(async () => {
      throw new Error('oops');
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toBe('oops');
  });

  it('tryCatch uses custom errorMapper', async () => {
    const r = await tryCatch(
      async () => {
        throw 'raw string';
      },
      (e) => new Error(`mapped: ${e}`)
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toBe('mapped: raw string');
  });

  it('tryCatchApi wraps success into apiOk', async () => {
    const r = await tryCatchApi(async () => [1, 2, 3]);
    expect(isApiOk(r)).toBe(true);
    if (isApiOk(r)) expect(r.data).toEqual([1, 2, 3]);
  });

  it('tryCatchApi wraps failure into apiErr via mapToApiError', async () => {
    const r = await tryCatchApi(async () => {
      throw new Error('connection refused');
    });
    expect(isApiErr(r)).toBe(true);
    if (isApiErr(r)) {
      expect(r.error.code).toBe('NETWORK_ERROR');
      expect(r.error.retryable).toBe(true);
    }
  });
});

describe('mapToApiError', () => {
  it('timeout → TIMEOUT + retryable', () => {
    const e = mapToApiError(new Error('Request timeout'));
    expect(e.code).toBe('TIMEOUT');
    expect(e.retryable).toBe(true);
  });

  it('rate limit → RATE_LIMITED + retryable', () => {
    const e = mapToApiError(new Error('rate limit exceeded'));
    expect(e.code).toBe('RATE_LIMITED');
    expect(e.retryable).toBe(true);
  });

  it('circuit → CIRCUIT_OPEN + retryable', () => {
    const e = mapToApiError(new Error('circuit breaker open'));
    expect(e.code).toBe('CIRCUIT_OPEN');
    expect(e.retryable).toBe(true);
  });

  it('network → NETWORK_ERROR + retryable', () => {
    const e = mapToApiError(new Error('network error'));
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e.retryable).toBe(true);
  });

  it('not found → NOT_FOUND + not retryable', () => {
    const e = mapToApiError(new Error('resource not found'));
    expect(e.code).toBe('NOT_FOUND');
    expect(e.retryable).toBe(false);
  });

  it('unauthorized → UNAUTHORIZED + not retryable', () => {
    const e = mapToApiError(new Error('unauthorized access'));
    expect(e.code).toBe('UNAUTHORIZED');
    expect(e.retryable).toBe(false);
  });

  it('validation → VALIDATION_ERROR + not retryable', () => {
    const e = mapToApiError(new Error('validation failed'));
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.retryable).toBe(false);
  });

  it('generic Error → INTERNAL_ERROR', () => {
    const e = mapToApiError(new Error('something broke'));
    expect(e.code).toBe('INTERNAL_ERROR');
    expect(e.retryable).toBe(false);
    expect(e.details).toBeDefined();
  });

  it('non-Error → UNKNOWN_ERROR', () => {
    const e = mapToApiError('just a string');
    expect(e.code).toBe('UNKNOWN_ERROR');
    expect(e.message).toBe('just a string');
    expect(e.retryable).toBe(false);
  });
});

describe('Legacy compatibility', () => {
  it('toLegacy ok → success:true with data', () => {
    const legacy = toLegacy(apiOk({ id: 1 }));
    expect(legacy).toEqual({ success: true, data: { id: 1 } });
  });

  it('toLegacy err with staleData', () => {
    const r = apiErr({ code: 'TIMEOUT' as const, message: 'slow', retryable: true }, 'cached');
    const legacy = toLegacy(r);
    expect(legacy.success).toBe(false);
    expect(legacy.data).toBe('cached');
    expect(legacy.error).toBe('slow');
  });

  it('fromLegacy success → apiOk', () => {
    const r = fromLegacy({ success: true, data: 'hello' });
    expect(isApiOk(r)).toBe(true);
    if (isApiOk(r)) expect(r.data).toBe('hello');
  });

  it('fromLegacy error → apiErr with INTERNAL_ERROR', () => {
    const r = fromLegacy({ success: false, error: 'broke' });
    expect(isApiErr(r)).toBe(true);
    if (isApiErr(r)) {
      expect(r.error.code).toBe('INTERNAL_ERROR');
      expect(r.error.message).toBe('broke');
    }
  });
});
