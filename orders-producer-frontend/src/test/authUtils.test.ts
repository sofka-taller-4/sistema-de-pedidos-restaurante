import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAuthStatus, hasAuthCookies } from '../utils/auth';

// Mock global fetch and document.cookie
describe('auth utils', () => {
  describe('checkAuthStatus', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should return isAuthenticated true and user if response is ok', async () => {
      const mockUser = { id: 1, name: 'Test' };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser })
      }));
      const result = await checkAuthStatus();
      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should return isAuthenticated false if response is not ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const result = await checkAuthStatus();
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return isAuthenticated false on fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
      const result = await checkAuthStatus();
      expect(result.isAuthenticated).toBe(false);
    });
  });

  describe('hasAuthCookies', () => {
    let originalCookie: string;
    beforeEach(() => {
      originalCookie = globalThis.document?.cookie || '';
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ''
      });
    });
    afterEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: originalCookie
      });
    });
    it('should return true if accessToken cookie is present', () => {
      document.cookie = 'accessToken=abc;';
      expect(hasAuthCookies()).toBe(true);
    });
    it('should return false if accessToken cookie is not present', () => {
      document.cookie = 'otherCookie=123;';
      expect(hasAuthCookies()).toBe(false);
    });
  });
});
