import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminLogin,
  fetchUsers,
  createUser,
  updateUser,
  setUserRoles,
  deleteProduct
} from '../services/adminService';
import api from '../services/api';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock api module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:3000' }
  }
}));

describe('Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('adminLogin', () => {
    it('logs in successfully with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
          user: { id: '1', email: 'admin@test.com', roles: ['admin'] }
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await adminLogin('admin@test.com', 'password123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('test-token');
    });

    it('throws error on failed login', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      });

      await expect(adminLogin('wrong@test.com', 'wrongpass')).rejects.toThrow('Login failed');
    });
  });

  describe('fetchUsers', () => {
    it('fetches all users without filters', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com', roles: ['admin'] },
        { id: '2', name: 'User 2', email: 'user2@test.com', roles: ['waiter'] }
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockUsers }
      });

      const result = await fetchUsers();

      expect(api.get).toHaveBeenCalledWith('/api/admin/users');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('User 1');
    });

    it('fetches users with role filter', async () => {
      const mockUsers = [
        { id: '1', name: 'Admin User', email: 'admin@test.com', roles: ['admin'] }
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockUsers }
      });

      const result = await fetchUsers({ role: 'admin' });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('role=admin'));
      expect(result.data).toHaveLength(1);
    });

    it('fetches users with active filter', async () => {
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: [] }
      });

      await fetchUsers({ active: true });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('active=true'));
    });

    it('fetches users with name filter', async () => {
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: [] }
      });

      await fetchUsers({ name: 'John' });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('name=John'));
    });

    it('handles empty user array correctly', async () => {
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: [] }
      });

      const result = await fetchUsers();

      expect(result.data).toEqual([]);
    });

    it('throws error on failed fetch', async () => {
      (api.get as any).mockRejectedValueOnce(new Error('Request failed'));

      await expect(fetchUsers()).rejects.toThrow('Request failed');
    });
  });

  describe('createUser', () => {
    it('creates a new user successfully', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        roles: ['waiter']
      };

      const mockResponse = {
        success: true,
        data: { id: '3', ...newUser }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createUser(newUser);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(newUser.email);
    });

    it('throws error on failed user creation', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(
        createUser({
          name: 'Test',
          email: 'test@test.com',
          password: 'pass',
          roles: ['admin']
        })
      ).rejects.toThrow('User create failed');
    });
  });

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const updates = { name: 'Updated Name', email: 'updated@test.com' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: '1', ...updates } })
      });

      const result = await updateUser('1', updates);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
      );

      expect(result.success).toBe(true);
    });

    it('throws error on failed update', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(updateUser('1', {})).rejects.toThrow('User update failed');
    });
  });

  describe('setUserRoles', () => {
    it('updates user roles successfully', async () => {
      const newRoles = ['admin', 'manager'];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { roles: newRoles } })
      });

      const result = await setUserRoles('1', newRoles);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/role'),
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: newRoles })
        })
      );

      expect(result.success).toBe(true);
    });

    it('throws error on failed role update', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(setUserRoles('1', ['admin'])).rejects.toThrow(
        'User role update failed'
      );
    });
  });

  describe('deleteProduct', () => {
    it('deletes product successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Product deleted' })
      });

      const result = await deleteProduct(123);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result.success).toBe(true);
    });

    it('throws error on failed deletion', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(deleteProduct(123)).rejects.toThrow('Product delete failed');
    });
  });
});
