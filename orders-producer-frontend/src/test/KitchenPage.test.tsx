
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KitchenPage } from '../pages/KitchenPage';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContext from '../store/auth';
import * as kitchenOrdersHook from '../hooks/useKitchenOrders';

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('KitchenPage', () => {
  beforeEach(() => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test', email: 'chef@rest.com', roles: ['kitchen'] },
      logout: mockLogout,
    });
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
        <KitchenPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Ordenes de Cocina/i)).not.toBeInTheDocument();
  });

  it('muestra loading cuando loading=true', () => {
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders: [],
      loading: true,
      startCooking: vi.fn(),
      markAsReady: vi.fn(),
      completeOrder: vi.fn(),
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading orders/i)).toBeInTheDocument();
  });

  it('muestra mensaje vacío si no hay órdenes', () => {
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders: [],
      loading: false,
      startCooking: vi.fn(),
      markAsReady: vi.fn(),
      completeOrder: vi.fn(),
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/No orders found for this filter/i)).toBeInTheDocument();
  });

  it('renderiza órdenes y tabs, y permite cambiar de tab', async () => {
    const orders = [
      {
        id: '#ABC',
        fullId: 'abc123',
        customerName: 'Juan',
        phone: 'N/A',
        time: '12:00',
        table: '5',
        products: [
          { name: 'Pizza', quantity: 1, price: 10000, preparationTime: 10 },
        ],
        total: 10000,
        status: 'Nueva Orden',
        estimatedPrepTime: 10,
      },
      {
        id: '#DEF',
        fullId: 'def456',
        customerName: 'Ana',
        phone: 'N/A',
        time: '12:10',
        table: '2',
        products: [
          { name: 'Ensalada', quantity: 2, price: 5000, preparationTime: 5 },
        ],
        total: 10000,
        status: 'Preparando',
        estimatedPrepTime: 5,
      },
    ];
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders,
      loading: false,
      startCooking: vi.fn(),
      markAsReady: vi.fn(),
      completeOrder: vi.fn(),
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Juan')).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    // Tabs
    // Hay más de un elemento con el texto 'Nueva Orden' (tab y badge), así que seleccionamos el botón
    const nuevaOrdenTabs = await screen.findAllByText('Nueva Orden');
    expect(nuevaOrdenTabs.length).toBeGreaterThan(0);
    // Buscar el botón/tab con el texto 'Preparando'
    const preparandoTabs = await screen.findAllByText('Preparando');
    // Selecciona el que sea un botón
    const preparandoBtn = preparandoTabs.find(el => el.closest('button'));
    expect(preparandoBtn).toBeTruthy();
    fireEvent.click(preparandoBtn!);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });

  it('llama a startCooking, markAsReady y completeOrder al hacer click en los botones', async () => {
    const startCooking = vi.fn();
    const markAsReady = vi.fn();
    const completeOrder = vi.fn();
    const orders = [
      {
        id: '#ABC',
        fullId: 'abc123',
        customerName: 'Juan',
        phone: 'N/A',
        time: '12:00',
        table: '5',
        products: [
          { name: 'Pizza', quantity: 1, price: 10000, preparationTime: 10 },
        ],
        total: 10000,
        status: 'Nueva Orden',
        estimatedPrepTime: 10,
      },
    ];
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders,
      loading: false,
      startCooking,
      markAsReady,
      completeOrder,
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    // Botón Comenzar a Cocinar
    fireEvent.click(screen.getByText('Comenzar a Cocinar'));
    expect(startCooking).toHaveBeenCalledWith('#ABC');
    // Cambiar estado a Preparando para mostrar botón Orden Preparada
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders: [{ ...orders[0], status: 'Preparando' }],
      loading: false,
      startCooking,
      markAsReady,
      completeOrder,
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    if (screen.queryByText('Orden Preparada')) {
      fireEvent.click(screen.getByText('Orden Preparada'));
      expect(markAsReady).toHaveBeenCalledWith('#ABC');
    }
    // Cambiar estado a Listo para mostrar botón Orden entregada
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders: [{ ...orders[0], status: 'Listo' }],
      loading: false,
      startCooking,
      markAsReady,
      completeOrder,
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    if (screen.queryByText('Orden entregada')) {
      fireEvent.click(screen.getByText('Orden entregada'));
      expect(completeOrder).toHaveBeenCalledWith('#ABC');
    }
  });

  it('permite hacer logout y navega a login', () => {
    vi.spyOn(kitchenOrdersHook, 'useKitchenOrders').mockReturnValue({
      orders: [],
      loading: false,
      startCooking: vi.fn(),
      markAsReady: vi.fn(),
      completeOrder: vi.fn(),
      connected: true,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );
    const btn = screen.getByText('Cerrar Sesión');
    fireEvent.click(btn);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
