import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock localStorage FIRST - before anything else
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Set it on global.localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock environment variables
beforeAll(() => {
  // Mock Vite environment variables
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

// Mock axios module to prevent real HTTP requests
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  
  return {
    default: {
      create: vi.fn(() => ({
        get: vi.fn(() => Promise.reject(new Error('Mock axios.get not configured'))),
        post: vi.fn(() => Promise.reject(new Error('Mock axios.post not configured'))),
        put: vi.fn(() => Promise.reject(new Error('Mock axios.put not configured'))),
        patch: vi.fn(() => Promise.reject(new Error('Mock axios.patch not configured'))),
        delete: vi.fn(() => Promise.reject(new Error('Mock axios.delete not configured'))),
        request: vi.fn(() => Promise.reject(new Error('Mock axios.request not configured'))),
        defaults: { baseURL: 'http://localhost:3000', headers: {} },
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
      })),
      get: vi.fn(() => Promise.reject(new Error('Mock axios.get not configured'))),
      post: vi.fn(() => Promise.reject(new Error('Mock axios.post not configured'))),
      put: vi.fn(() => Promise.reject(new Error('Mock axios.put not configured'))),
      patch: vi.fn(() => Promise.reject(new Error('Mock axios.patch not configured'))),
      delete: vi.fn(() => Promise.reject(new Error('Mock axios.delete not configured'))),
      request: vi.fn(() => Promise.reject(new Error('Mock axios.request not configured'))),
      defaults: { baseURL: 'http://localhost:3000', headers: {} },
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    },
    ...actual,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});
