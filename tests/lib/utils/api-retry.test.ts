/** @jest-environment node */

import { retryWithBackoff, fetchWithRetry } from '@/lib/utils/api-retry';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('api-retry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('succeeds on first attempt without retrying', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn, { jitter: 0 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error and succeeds on second attempt', async () => {
      const error = Object.assign(new Error('Server error'), { status: 500 });
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('recovered');

      const promise = retryWithBackoff(fn, { jitter: 0, initialDelay: 100 });

      // Advance past the backoff delay for attempt 0
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('exhausts all retries and throws the last error', async () => {
      jest.useRealTimers();

      const error = Object.assign(new Error('Server error'), { status: 500 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 2,
          jitter: 0,
          initialDelay: 1,
          maxDelay: 2,
        })
      ).rejects.toThrow('Server error');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useFakeTimers();
    });

    it('throws immediately for non-retryable error without retrying', async () => {
      const error = Object.assign(new Error('Bad request'), { status: 400 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, { jitter: 0 })).rejects.toThrow('Bad request');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it.each([429, 500, 502, 503, 504])('retries on status %d', async (status) => {
      const error = Object.assign(new Error(`HTTP ${status}`), { status });
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

      const promise = retryWithBackoff(fn, { jitter: 0, initialDelay: 100 });
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it.each(['timeout', 'rate limit', 'ECONNRESET'])(
      'retries on error message containing "%s"',
      async (msg) => {
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error(`Connection ${msg} occurred`))
          .mockResolvedValueOnce('ok');

        const promise = retryWithBackoff(fn, { jitter: 0, initialDelay: 100 });
        await jest.advanceTimersByTimeAsync(100);

        const result = await promise;
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
      }
    );

    it('does NOT retry on status 400', async () => {
      const error = Object.assign(new Error('Bad request'), { status: 400 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, { jitter: 0 })).rejects.toThrow('Bad request');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchWithRetry', () => {
    const mockFetch = jest.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockFetch.mockReset();
    });

    it('returns response on successful fetch', async () => {
      const response = new Response('ok', { status: 200 });
      mockFetch.mockResolvedValue(response);

      const result = await fetchWithRetry('https://example.com', {}, { jitter: 0 });

      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on server error 500 then succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response('error', { status: 500, statusText: 'Internal Server Error' })
        )
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const promise = fetchWithRetry('https://example.com', {}, { jitter: 0, initialDelay: 100 });

      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns error response without retry for non-retryable status 400', async () => {
      const response = new Response('bad request', { status: 400, statusText: 'Bad Request' });
      mockFetch.mockResolvedValue(response);

      const result = await fetchWithRetry('https://example.com', {}, { jitter: 0 });

      expect(result.status).toBe(400);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
