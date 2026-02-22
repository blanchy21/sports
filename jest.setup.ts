import '@testing-library/jest-dom';

// Note: TextEncoder, TextDecoder, Request, Response, Headers polyfills
// are now in jest.polyfills.ts which runs before module loading

class ResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(): void {
    // no-op
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }
}

(global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserver;
