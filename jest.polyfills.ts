/**
 * Jest polyfills - runs BEFORE modules are loaded
 * setupFiles runs before each test file, before environment setup
 */

// First, polyfill TextEncoder/TextDecoder (needed by undici)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const utilModule = require('util');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextEncoder = utilModule.TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextDecoder = utilModule.TextDecoder;

// Polyfill Web Streams (needed by undici)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webStreams = require('stream/web');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ReadableStream = webStreams.ReadableStream;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WritableStream = webStreams.WritableStream;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TransformStream = webStreams.TransformStream;

// Polyfill MessageChannel/MessagePort (needed by undici)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const workerThreads = require('worker_threads');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).MessageChannel = workerThreads.MessageChannel;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).MessagePort = workerThreads.MessagePort;

// Polyfill BroadcastChannel (needed by undici)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).BroadcastChannel = workerThreads.BroadcastChannel;

// Now import undici (which needs all the above polyfills)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const undici = require('undici');

// Polyfill Web APIs from undici for Jest's sandboxed environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Request = undici.Request;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Response = undici.Response;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Headers = undici.Headers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = undici.fetch;

// Also set on global for compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Request = undici.Request;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Response = undici.Response;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Headers = undici.Headers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = undici.fetch;
