import { render } from '@testing-library/react';
import AdminPanel from '../pages/admin/AdminPanel';
import * as authStore from '../store/auth';
import React from 'react';
import apiModule from '../services/api';

vi.mock('../components/Sidebar', () => ({ default: () => <nav>Sidebar</nav> }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Routes: ({ children }: any) => <div>{children}</div>,
    Route: ({ element }: any) => <div>{element}</div>,
    Navigate: ({ to }: any) => <div>Navigate to {to}</div>,
  };
});

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({}),
    })));
      vi.spyOn(apiModule, 'get').mockImplementation(() => Promise.resolve({
        data: { success: true, data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      }));
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  beforeEach(() => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: true, user: { id: '1', name: 'Test', roles: ['admin'] } });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin crashear si está autenticado', () => {
    const { getByText } = render(<AdminPanel />);
    expect(getByText(/Sidebar/)).toBeInTheDocument();
  });

  it('redirige si no está autenticado', () => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: false });
    const { getByText } = render(<AdminPanel />);
    expect(getByText(/Navigate to \/login/)).toBeInTheDocument();
  });
});
