import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuth } from '../store/auth';

// Mock fetch for logout tests
global.fetch = vi.fn();

describe('Auth Store (Cookie-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset store state
    useAuth.getState().clear();
  });

  it('initializes with null values', () => {
    const { user, isAuthenticated } = useAuth.getState();

    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('sets authentication data correctly (no token stored)', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin']
    };

    useAuth.getState().setAuth(mockUser);

    const { user, isAuthenticated } = useAuth.getState();

    expect(user).toEqual(mockUser);
    expect(isAuthenticated).toBe(true);

    // ✅ Verify that user data is persisted in localStorage
    const stored = localStorage.getItem('auth-storage');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.state.user).toEqual(mockUser);
    expect(parsed.state.isAuthenticated).toBe(true);
  });

  it('clears authentication data', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin']
    };

    // Set auth first
    useAuth.getState().setAuth(mockUser);
    expect(useAuth.getState().isAuthenticated).toBe(true);

    // Clear auth
    useAuth.getState().clear();

    const { user, isAuthenticated } = useAuth.getState();

    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('logs out user correctly with API call', async () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin']
    };

    // Mock adminLogout
    vi.mock('../services/adminService', () => ({
      adminLogout: vi.fn().mockResolvedValue({}),
    }));

    // Set auth first
    useAuth.getState().setAuth(mockUser);
    expect(useAuth.getState().isAuthenticated).toBe(true);

    // Logout
    await useAuth.getState().logout();

    const { user, isAuthenticated } = useAuth.getState();

    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('handles logout API failure gracefully', async () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin']
    };

    // Mock adminLogout to fail
    vi.mock('../services/adminService', () => ({
      adminLogout: vi.fn().mockRejectedValue(new Error('Logout failed')),
    }));

    // Set auth first
    useAuth.getState().setAuth(mockUser);
    expect(useAuth.getState().isAuthenticated).toBe(true);

    // Logout should still clear state even if API fails
    await useAuth.getState().logout();

    const { user, isAuthenticated } = useAuth.getState();

    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('correctly identifies user roles', () => {
    const adminUser = {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      roles: ['admin']
    };

    const waiterUser = {
      id: '2',
      name: 'Waiter User',
      email: 'waiter@example.com',
      roles: ['waiter']
    };

    // Test admin user
    useAuth.getState().setAuth(adminUser);
    expect(useAuth.getState().user?.roles).toContain('admin');

    // Clear and test waiter user
    useAuth.getState().clear();
    useAuth.getState().setAuth(waiterUser);
    expect(useAuth.getState().user?.roles).toContain('waiter');
    expect(useAuth.getState().user?.roles).not.toContain('admin');
  });

  it('handles multiple auth changes correctly', () => {
    const user1 = {
      id: '1',
      name: 'User 1',
      email: 'user1@example.com',
      roles: ['admin']
    };

    const user2 = {
      id: '2',
      name: 'User 2',
      email: 'user2@example.com',
      roles: ['waiter']
    };

    // Set first user
    useAuth.getState().setAuth(user1);
    expect(useAuth.getState().user?.id).toBe('1');
    expect(useAuth.getState().isAuthenticated).toBe(true);

    // Change to second user
    useAuth.getState().setAuth(user2);
    expect(useAuth.getState().user?.id).toBe('2');
    expect(useAuth.getState().user?.roles).toContain('waiter');
    expect(useAuth.getState().isAuthenticated).toBe(true);

    // Clear
    useAuth.getState().clear();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });
});
