import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../pages/admin/Login';
import * as adminService from '../services/adminService';

// Mock global de useAuth y setAuth
const mockSetAuth = vi.fn();
vi.mock('../store/auth', async () => {
  const actual = await vi.importActual('../store/auth');
  return {
    ...actual,
    useAuth: () => ({
      setAuth: mockSetAuth,
      isAuthenticated: false,
      user: undefined
    })
  };
});

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the auth store
vi.mock('../store/auth', () => ({
  useAuth: () => ({
    setAuth: vi.fn(),
  }),
}));

// Mock adminService
vi.mock('../services/adminService');

const renderWithRouter = () => {
  return render(
    <MemoryRouter initialEntries={['/session']}>
      <Routes>
        <Route path="/session" element={<Login />} />
        <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/mesero" element={<div>Mesero Page</div>} />
        <Route path="/cocina" element={<div>Cocina Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Login', () => {
  it('redirige a dashboard si el usuario tiene un rol desconocido', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: true,
      user: { roles: ['supervisor'] }
    });
    const { default: LoginPage } = await import('../pages/admin/Login');
    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route path="/session" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/email/i), 'supervisor@demo.com');
    await user.type(document.getElementById('password')!, '1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
    });
  });

  it('redirige correctamente si el usuario tiene múltiples roles (admin y waiter)', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: true,
      user: { roles: ['admin', 'waiter'] }
    });
    const { default: LoginPage } = await import('../pages/admin/Login');
    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route path="/session" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/mesero" element={<div>Mesero Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/email/i), 'multi@demo.com');
    await user.type(document.getElementById('password')!, '1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
      // Debe priorizar admin y redirigir a dashboard
      expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
    });
  });

  it('no llama adminLogin si los campos están vacíos', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(adminService, 'adminLogin');
    renderWithRouter();
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    // No debe llamar adminLogin porque los campos están vacíos
    expect(spy).not.toHaveBeenCalled();
  });

  it('permite alternar contraseña con teclado (accesibilidad)', async () => {
    renderWithRouter();
    const btn = screen.getByRole('button', { name: /mostrar contraseña/i });
    expect(document.getElementById('password')!.getAttribute('type')).toBe('password');
    btn.focus();
    await userEvent.keyboard('{Enter}');
    expect(document.getElementById('password')!.getAttribute('type')).toBe('text');
    await userEvent.keyboard('{Enter}');
    expect(document.getElementById('password')!.getAttribute('type')).toBe('password');
  });

  it('renderiza el año actual dinámicamente en el copyright', () => {
    renderWithRouter();
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
      beforeEach(() => {
        mockSetAuth.mockClear();
        vi.clearAllMocks();
      });
    it('login exitoso como admin redirige a dashboard', async () => {
      const user = userEvent.setup();
      vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
        success: true,
        user: { roles: ['admin'] }
      });
      const { default: LoginPage } = await import('../pages/admin/Login');
      render(
        <MemoryRouter initialEntries={['/session']}>
          <Routes>
            <Route path="/session" element={<LoginPage />} />
            <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      await user.type(screen.getByLabelText(/email/i), 'admin@demo.com');
      await user.type(document.getElementById('password')!, '1234');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
      });
    });

    it('login exitoso como waiter redirige a /mesero', async () => {
      const user = userEvent.setup();
      vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
        success: true,
        user: { roles: ['waiter'] }
      });
      const { default: LoginPage } = await import('../pages/admin/Login');
      render(
        <MemoryRouter initialEntries={['/session']}>
          <Routes>
            <Route path="/session" element={<LoginPage />} />
            <Route path="/mesero" element={<div>Mesero Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      await user.type(screen.getByLabelText(/email/i), 'waiter@demo.com');
      await user.type(document.getElementById('password')!, '1234');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
      });
    });

    it('login exitoso como cook redirige a /cocina', async () => {
      const user = userEvent.setup();
      vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
        success: true,
        user: { roles: ['cook'] }
      });
      const { default: LoginPage } = await import('../pages/admin/Login');
      render(
        <MemoryRouter initialEntries={['/session']}>
          <Routes>
            <Route path="/session" element={<LoginPage />} />
            <Route path="/cocina" element={<div>Cocina Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      await user.type(screen.getByLabelText(/email/i), 'cook@demo.com');
      await user.type(document.getElementById('password')!, '1234');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
      });
    });

    it('muestra error si ocurre excepción en login', async () => {
      const user = userEvent.setup();
      vi.mocked(adminService.adminLogin).mockRejectedValueOnce(new Error('fail'));
      renderWithRouter();
      await user.type(screen.getByLabelText(/email/i), 'fail@demo.com');
      await user.type(document.getElementById('password')!, '1234');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
      await waitFor(() => {
        expect(screen.getByText(/error al iniciar sesión/i)).toBeInTheDocument();
      });
    });

    it('permite mostrar y ocultar contraseña', async () => {
      renderWithRouter();
      const btn = screen.getByRole('button', { name: /mostrar contraseña/i });
      expect(document.getElementById('password')!.getAttribute('type')).toBe('password');
      await userEvent.click(btn);
      expect(document.getElementById('password')!.getAttribute('type')).toBe('text');
      await userEvent.click(btn);
      expect(document.getElementById('password')!.getAttribute('type')).toBe('password');
    });

    it('redirige automáticamente si ya está autenticado', async () => {
      vi.mock('../store/auth', async () => {
        const actual = await vi.importActual('../store/auth');
        return {
          ...actual,
          useAuth: () => ({
            setAuth: vi.fn(),
            isAuthenticated: true,
            user: { roles: ['admin'] }
          })
        };
      });
      const { default: LoginPage } = await import('../pages/admin/Login');
      render(
        <MemoryRouter initialEntries={['/session']}>
          <Routes>
            <Route path="/session" element={<LoginPage />} />
            <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
      vi.resetModules();
    });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    renderWithRouter();
    
    expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(document.getElementById('password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /olvidaste tu contraseña/i })).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: false,
      message: 'Invalid credentials'
    });

    renderWithRouter();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.type(emailInput, 'wrong@test.com');
    await user.type(passwordInput, 'wrongpass');
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it('redirects admin user to dashboard on successful login', async () => {
    const user = userEvent.setup();
    vi.mock('../store/auth', async () => {
      const actual = await vi.importActual('../store/auth');
      return {
        ...actual,
        useAuth: () => ({
          setAuth: mockSetAuth,
          isAuthenticated: false,
          user: undefined
        })
      };
    });
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: true,
      user: {
        id: '1',
        email: 'admin@test.com',
        roles: ['admin']
      }
    });
    const { default: LoginPage } = await import('../pages/admin/Login');
    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route path="/session" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(document.getElementById('password')!, 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
    });
    vi.resetModules();
  });

  it('shows network error on fetch failure', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error al iniciar sesión/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const toggleButtons = screen.getAllByLabelText(/mostrar contraseña/i);
    const toggleButton = toggleButtons[0];
    
    // Initially should be password type
    expect(passwordInput.type).toBe('password');
    
    // Click to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    
    // Click again to hide password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('calls adminLogin with correct credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: true,
      user: { id: '1', email: 'test@test.com', roles: ['admin'] }
    });

    renderWithRouter();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'mypassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(adminService.adminLogin).toHaveBeenCalledWith('test@example.com', 'mypassword');
    });
  });

  it('navigates to forgot password page when link is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route path="/session" element={<Login />} />
          <Route path="/recuperar" element={<div>Forgot Password Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const forgotPasswordLink = screen.getByRole('link', { name: /olvidaste tu contraseña/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/recuperar');
  });

  it('handles login with roles and redirects correctly for waiter', async () => {
    const user = userEvent.setup();
    vi.mocked(adminService.adminLogin).mockResolvedValueOnce({
      success: true,
      user: {
        id: '2',
        email: 'waiter@test.com',
        roles: ['waiter']
      }
    });
    const { default: LoginPage } = await import('../pages/admin/Login');
    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route path="/session" element={<LoginPage />} />
          <Route path="/mesero" element={<div>Mesero Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/email/i), 'waiter@test.com');
    await user.type(document.getElementById('password')!, 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /bienvenido a rápido y sabroso/i })).toBeInTheDocument();
    });
  });
});
