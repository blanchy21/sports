import '@testing-library/jest-dom';

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
