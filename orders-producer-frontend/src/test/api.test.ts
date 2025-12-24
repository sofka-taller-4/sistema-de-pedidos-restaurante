


import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
let api: typeof import('../services/api').default;
let axios: any;


describe('api.ts advanced', () => {
  let mockInstance: any;
  let responseFulfilled: any;
  let responseRejected: any;
  let requestFulfilled: any;
  let requestRejected: any;
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    responseFulfilled = undefined;
    responseRejected = undefined;
    requestFulfilled = undefined;
    requestRejected = undefined;
    // Mock dinámico de axios y su create
    vi.doMock('axios', () => {
      const actualAxios = vi.importActual('axios');
      mockInstance = {
        request: vi.fn(),
        interceptors: {
          request: {
            use: vi.fn((fulfilled, rejected) => {
              requestFulfilled = fulfilled;
              requestRejected = rejected;
            })
          },
          response: {
            use: vi.fn((fulfilled, rejected) => {
              responseFulfilled = fulfilled;
              responseRejected = rejected;
            })
          }
        }
      };
      const mockCreate = vi.fn(() => mockInstance);
      // mock post para refresh
      const mockPost = vi.fn();
      return {
        __esModule: true,
        default: { create: mockCreate, post: mockPost },
        create: mockCreate,
        post: mockPost
      };
    });
    axios = (await import('axios')).default;
    api = (await import('../services/api')).default;
  });
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });
  
  it('should perform a GET request using api.request', async () => {
    mockInstance.request.mockResolvedValue({ data: { ok: true } });
    const res = await api.request({ url: '/test', method: 'get' });
    expect(res).toBeDefined();
    expect(mockInstance.request).toHaveBeenCalledWith({ url: '/test', method: 'get' });
  });

  it('should perform a POST request using api.request', async () => {
    mockInstance.request.mockResolvedValue({ data: { ok: true } });
    const res = await api.request({ url: '/test', method: 'post', data: { foo: 'bar' } });
    expect(res).toBeDefined();
    expect(mockInstance.request).toHaveBeenCalledWith({ url: '/test', method: 'post', data: { foo: 'bar' } });
  });

  it('should handle 401 and refresh token successfully', async () => {
    expect(typeof responseRejected).toBe('function');
    // Simula el interceptor llamando a refresh y reintentando
    const refreshMock = vi.fn().mockResolvedValue({});
    axios.post.mockImplementation(refreshMock);
    mockInstance.request.mockImplementation((cfg: any) => {
      if (!cfg._retry) return Promise.reject({ response: { status: 401 }, config: cfg });
      return Promise.resolve({ data: 'ok' });
    });
    const error = { response: { status: 401 }, config: { _retry: false, url: '/test' } };
    await responseRejected(error).catch(() => {});
    expect(refreshMock).toHaveBeenCalled();
  });

  it('should handle 401 and refresh token failure (redirect)', async () => {
    expect(typeof responseRejected).toBe('function');
    const refreshMock = vi.fn().mockRejectedValue(new Error('fail'));
    const clearMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/notlogin', href: '' } });
    axios.post.mockImplementation(refreshMock);
    vi.doMock('../store/auth', () => ({ useAuth: { getState: () => ({ clear: clearMock }) } }));
    const error = { response: { status: 401 }, config: { _retry: false, url: '/test' } };
    await responseRejected(error).catch(() => {});
    expect(clearMock).toHaveBeenCalled();
  });

  it('should log request with obfuscated password', async () => {
    expect(typeof requestFulfilled).toBe('function');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const config = {
      method: 'post',
      url: '/login',
      data: JSON.stringify({ password: 'secret123' })
    };
    await requestFulfilled(config);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('*********'));
    log.mockRestore();
  });

  it('should handle request error and log', async () => {
    expect(typeof requestRejected).toBe('function');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('fail');
    await requestRejected(err).catch(() => {});
    expect(log).toHaveBeenCalledWith('❌ API Request Error:', 'fail');
    log.mockRestore();
  });
  });

