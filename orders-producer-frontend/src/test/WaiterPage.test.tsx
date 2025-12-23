import * as adminService from '../services/adminService';
import * as categoryService from '../services/categoryService';
import * as useActiveOrders from '../hooks/useActiveOrders';
import * as useWebSocket from '../hooks/useWebSocket';
import * as useOrderManagement from '../hooks/useOrderManagement';
import * as useOrderSubmission from '../hooks/useOrderSubmission';
import * as orderService from '../services/orderService';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaiterPage } from '../pages/WaiterPage';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContext from '../store/auth';

vi.mock('../services/adminService');
vi.mock('../services/categoryService');
vi.mock('../hooks/useActiveOrders');
vi.mock('../hooks/useWebSocket');
vi.mock('../hooks/useOrderManagement');
vi.mock('../hooks/useOrderSubmission');
vi.mock('../services/orderService');

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


describe('WaiterPage', () => {
    // No requires aquí, solo dentro de cada test

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test', email: 'waiter@rest.com', roles: ['waiter'] },
      logout: mockLogout,
    });
    // Mocks por defecto para hooks y servicios
    adminService.fetchActiveProducts.mockResolvedValue({
      data: [
        { id: 1, name: 'Café', price: 2000, desc: '', image: '', category: 'Bebidas' },
        { id: 2, name: 'Sandwich', price: 5000, desc: '', image: '', category: 'Comidas' },
      ]
    });
    categoryService.fetchPublicCategories.mockResolvedValue([
      { _id: '1', name: 'Bebidas' },
      { _id: '2', name: 'Comidas' },
    ]);
    useActiveOrders.useActiveOrders.mockReturnValue({
      activeOrders: [],
      setActiveOrders: vi.fn(),
      loading: false,
      refetch: vi.fn(),
    });
    useWebSocket.useWebSocket.mockReturnValue({ lastMessage: null });
    useOrderManagement.useOrderManagement.mockReturnValue({
      order: { items: [] },
      addToOrder: vi.fn(),
      changeQty: vi.fn(),
      addNoteToItem: vi.fn(),
      total: 0,
      clearOrder: vi.fn(),
    });
    useOrderSubmission.useOrderSubmission.mockReturnValue({
      submitOrder: vi.fn().mockResolvedValue(true),
      successMsg: '',
    });
    orderService.updateOrderStatus.mockResolvedValue({ success: true });
    orderService.updateOrder.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockLogout.mockReset();
    mockNavigate.mockReset();
  });

  it('redirige si no está autenticado', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: mockLogout,
    });
    render(
      <MemoryRouter>
        <WaiterPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Ordenes de Cocina/i)).not.toBeInTheDocument();
  });

  it('muestra loading de productos y categorías', () => {
    adminService.fetchActiveProducts.mockResolvedValueOnce({ data: [] });
    categoryService.fetchPublicCategories.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <WaiterPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Cargando productos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cargando categorías/i)).toBeInTheDocument();
  });

  it('muestra mensaje si no hay productos', async () => {
    adminService.fetchActiveProducts.mockResolvedValueOnce({ data: [] });
    categoryService.fetchPublicCategories.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <WaiterPage />
      </MemoryRouter>
    );
    // Esperar a que se muestre el mensaje
    expect(await screen.findByText(/no hay productos disponibles/i)).toBeInTheDocument();
  });

  it('renderiza productos y categorías, y permite filtrar', async () => {
    adminService.fetchActiveProducts.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Café', price: 2000, desc: '', image: '', category: 'Bebidas' },
        { id: 2, name: 'Sandwich', price: 5000, desc: '', image: '', category: 'Comidas' },
      ]
    });
    categoryService.fetchPublicCategories.mockResolvedValueOnce([
      { _id: '1', name: 'Bebidas' },
      { _id: '2', name: 'Comidas' },
    ]);
    render(
      <MemoryRouter>
        <WaiterPage />
      </MemoryRouter>
    );
    const productNames = await screen.findAllByTestId('product-name');
    const productTexts = productNames.map(node => node.textContent);
    expect(productTexts).toContain('Café');
    expect(productTexts).toContain('Sandwich');
    // Filtrar por categoría usando el botón correspondiente
    const btnBebidas = await screen.findByRole('button', { name: /bebidas/i });
    fireEvent.click(btnBebidas);
    expect(await screen.findByText('Café')).toBeInTheDocument();
    expect(screen.queryByText(/sandwich/i)).not.toBeInTheDocument();
  });

  it('permite hacer logout y navega a login', () => {
    render(
      <MemoryRouter>
        <WaiterPage />
      </MemoryRouter>
    );
    const btn = screen.getByText('Cerrar Sesión');
    fireEvent.click(btn);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
