import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock environment variables
beforeAll(() => {
  // Mock Vite environment variables for import.meta.env
  if (typeof import.meta.env === 'undefined') {
    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_API_GATEWAY_URL: 'http://localhost:3000',
        VITE_NODE_MS_URL: 'http://localhost:3002',
        MODE: 'test',
        DEV: false,
        PROD: false,
        SSR: false,
      },
      writable: true,
      configurable: true,
    });
  }

  // Global fetch mock to prevent real network requests
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Mock fetch not configured for this test' }),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
    } as Response)
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
