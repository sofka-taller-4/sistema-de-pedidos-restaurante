import { renderHook, act, waitFor } from '@testing-library/react';
import { useActiveOrders, mapApiStatus, calculateTimeElapsed, mapApiOrderToActiveOrder } from '@/hooks/useActiveOrders';
import * as orderService from '@/services/orderService';
import { vi } from 'vitest';

// Mock de useWebSocket para evitar dependencias reales
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({ lastMessage: null, isConnected: true })
}));

describe('useActiveOrders', () => {
  const mockOrders = [
    {
      id: 'abcd1234',
      table: '5',
      customerName: 'Juan',
      status: 'preparing',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      items: [
        { productName: 'Pizza', quantity: 2, unitPrice: 10000 },
        { productName: 'Bebida', quantity: 1, unitPrice: 3000 }
      ]
    },
    {
      id: 'efgh5678',
      table: '2',
      customerName: 'Ana',
      status: 'ready',
      createdAt: new Date(Date.now() - 120000).toISOString(),
      items: [
        { productName: 'Ensalada', quantity: 1, unitPrice: 8000 }
      ]
    }
  ];

  beforeEach(() => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: mockOrders });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debe cargar y mapear los pedidos activos correctamente', async () => {
    const { result } = renderHook(() => useActiveOrders());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.activeOrders.length).toBe(2);
    expect(result.current.activeOrders[0].customerName).toBe('Ana'); // ready primero
    expect(result.current.activeOrders[1].customerName).toBe('Juan'); // preparing después
    expect(result.current.error).toBeNull();
  });

  it('debe manejar errores al cargar pedidos', async () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockRejectedValue(new Error('Error de red'));
    const { result } = renderHook(() => useActiveOrders());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Error de red');
    expect(result.current.activeOrders.length).toBe(0);
  });

  it('debe exponer la función refetch y actualizar los pedidos', async () => {
    const { result } = renderHook(() => useActiveOrders());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.activeOrders.length).toBe(2);
    // Cambiar el mock para simular nuevos datos
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.activeOrders.length).toBe(0);
  });

  it('debe exponer isConnected del WebSocket', async () => {
    const { result } = renderHook(() => useActiveOrders());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isConnected).toBe(true);
  });
});

describe('helpers de useActiveOrders', () => {
  it('mapApiStatus mapea correctamente los estados', () => {
    expect(mapApiStatus('preparing')).toBe('preparing');
    expect(mapApiStatus('ready')).toBe('ready');
    expect(mapApiStatus('completed')).toBe('completed');
    expect(mapApiStatus('otro')).toBe('pending');
    expect(mapApiStatus(undefined)).toBe('pending');
  });

  it('calculateTimeElapsed calcula correctamente los minutos', () => {
    const now = new Date();
    expect(calculateTimeElapsed(now.toISOString())).toBe('< 1 min');
    const oneMinAgo = new Date(now.getTime() - 60000).toISOString();
    expect(calculateTimeElapsed(oneMinAgo)).toBe('1 min');
    const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
    expect(calculateTimeElapsed(fiveMinAgo)).toBe('5 min');
    expect(calculateTimeElapsed('no-es-fecha')).toBe('N/A');
  });

  it('mapApiOrderToActiveOrder transforma correctamente', () => {
    const apiOrder = {
      id: 'xyz',
      table: '1',
      customerName: 'Test',
      status: 'ready',
      createdAt: new Date().toISOString(),
      items: [
        { productName: 'A', quantity: 2, unitPrice: 100 },
        { productName: 'B', quantity: 1, unitPrice: 50 },
      ],
    };
    const result = mapApiOrderToActiveOrder(apiOrder);
    expect(result.id).toMatch(/^#XYZ/);
    expect(result.status).toBe('ready');
    expect(result.itemCount).toBe(3);
    expect(result.customerName).toBe(apiOrder.customerName);
  });
});
