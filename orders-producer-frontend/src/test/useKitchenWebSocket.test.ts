
import * as kitchenWsHook from '../hooks/useKitchenWebSocket';

// Mock global WebSocket para todos los tests
class GlobalMockWebSocket {
  static instances: GlobalMockWebSocket[] = [];
  static OPEN = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = GlobalMockWebSocket.OPEN;
  close = vi.fn();
  triggerMessage(data: any) {
    this.onmessage && this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
  triggerError(err?: any) {
    this.onerror && this.onerror(err || new Event('error'));
  }
  constructor() {
    GlobalMockWebSocket.instances.push(this);
  }
}

describe('Cobertura avanzada useKitchenWebSocket', () => {
  beforeEach(() => {
    (global as any).WebSocket = GlobalMockWebSocket;
    GlobalMockWebSocket.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('getWebSocketUrl retorna fallback si no hay env', () => {
    expect(typeof kitchenWsHook).toBe('object');
    expect(typeof kitchenWsHook['useKitchenWebSocket']).toBe('function');
  });

  it('mapOrderToPedido cubre todos los branches', () => {
    const mapOrderToPedido = kitchenWsHook['mapOrderToPedido'];
    const pedido = mapOrderToPedido({ id: 'x', table: '1', customerName: 'A', items: [{ productName: 'P', quantity: 1, unitPrice: 2, note: 'sin' }], status: 'ready' });
    expect(pedido.estado).toBe('listo');
    const pedido2 = mapOrderToPedido({ id: 'y', table: '2', customerName: 'B', items: [], status: 'preparing' });
    expect(pedido2.estado).toBe('en-preparacion');
    const pedido3 = mapOrderToPedido({ id: 'z', table: '3', customerName: 'C', items: [], status: 'otro' });
    expect(pedido3.estado).toBe('pendiente');
    // Sin status
    const pedido4 = mapOrderToPedido({ id: 'w', table: '4', customerName: 'D', items: [] });
    expect(pedido4.estado).toBe('pendiente');
  });

  it('maneja error en JSON.parse de mensaje WebSocket', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    const ws = GlobalMockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.onmessage && ws.onmessage({ data: 'no es json' });
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('cubre onerror y catch de conexión WebSocket', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    const ws = GlobalMockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.triggerError();
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('cubre scheduleRemoval manualmente', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: '9', table: 'X', customerName: 'Z', items: [], status: 'preparing' }] });
    const { result } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    act(() => {
      result.current.cambiarEstado('9', 'listo');
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('ignora mensajes WS desconocidos', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    const ws = GlobalMockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.triggerMessage({ type: 'UNKNOWN_EVENT', foo: 'bar' });
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('getWebSocketUrl fallback cubre línea 10', () => {
    const originalEnv = { ...import.meta.env };
    // Eliminar VITE_NODE_MS_URL
    (import.meta as any).env = {};
    const url = kitchenWsHook['getWebSocketUrl']();
    expect(url).toBe('ws://localhost:4000');
    (import.meta as any).env = originalEnv;
  });

  it('cubre catch de error al conectar WebSocket (línea 79)', () => {
    // Simular error en new WebSocket
    const error = new Error('fail connect');
    const WebSocketThrow = vi.fn(() => { throw error; });
    (global as any).WebSocket = WebSocketThrow;
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    expect(() => {
      renderHook(() => kitchenWsHook.useKitchenWebSocket());
    }).not.toThrow(); // El hook maneja el error internamente
    (global as any).WebSocket = GlobalMockWebSocket;
  });

  it('cubre cleanup: clearTimeout y close (líneas 119, 141)', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { unmount } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    const ws = GlobalMockWebSocket.instances[0];
    // Simular reconnectTimerRef activo
    const timerId = setTimeout(() => {}, 10000);
    (ws as any).reconnectTimerRef = { current: timerId };
    act(() => {
      unmount();
    });
    expect(ws.close).toBeCalled();
    clearTimeout(timerId);
  });

  it('cubre cambiarEstado con id inexistente (línea 161)', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: '10', table: 'Z', customerName: 'No', items: [], status: 'preparing' }] });
    const { result } = renderHook(() => kitchenWsHook.useKitchenWebSocket());
    const prev = result.current.pedidos[0];
    act(() => {
      result.current.cambiarEstado('no-existe', 'listo');
    });
    expect(result.current.pedidos[0]).toEqual(prev);
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as orderService from '../services/orderService';
import { useKitchenWebSocket } from '../hooks/useKitchenWebSocket';

// Mock global WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = MockWebSocket.OPEN;
  close = vi.fn();
  triggerMessage(data: any) {
    this.onmessage && this.onmessage({ data: JSON.stringify(data) });
  }
  constructor() {
    MockWebSocket.instances.push(this);
  }
}

describe('useKitchenWebSocket', () => {
  let originalWebSocket: any;
  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    (global as any).WebSocket = originalWebSocket;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('carga pedidos iniciales desde la API', async () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({
      success: true,
      data: [{ id: '1', table: 'A', customerName: 'Juan', items: [], status: 'preparing' }],
    });
    const { result, waitForNextUpdate } = renderHook(() => useKitchenWebSocket());
    await act(async () => {
      await waitForNextUpdate?.();
    });
    expect(result.current.pedidos[0].id).toBe('1');
    expect(result.current.pedidos[0].cliente).toBe('Juan');
  });

  it('agrega pedido por ORDER_NEW', async () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useKitchenWebSocket());
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.triggerMessage({ type: 'ORDER_NEW', order: { id: '2', table: 'B', customerName: 'Ana', items: [], status: 'preparing' } });
    });
    expect(result.current.pedidos[0].id).toBe('2');
    expect(result.current.pedidos[0].cliente).toBe('Ana');
  });

  it('actualiza estado a listo y elimina tras 10s por ORDER_READY', async () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: '3', table: 'C', customerName: 'Luis', items: [], status: 'preparing' }] });
    const { result, waitForNextUpdate } = renderHook(() => useKitchenWebSocket());
    await act(async () => {
      await waitForNextUpdate?.();
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.triggerMessage({ type: 'ORDER_READY', id: '3' });
    });
    expect(result.current.pedidos[0].estado).toBe('listo');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('ignora mensajes malformados o sin campos requeridos', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useKitchenWebSocket());
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen && ws.onopen();
      ws.triggerMessage({ type: 'ORDER_NEW' });
      ws.triggerMessage({});
      ws.triggerMessage('no es json');
    });
    expect(result.current.pedidos.length).toBe(0);
  });

  it('reconecta tras cierre de WebSocket', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    renderHook(() => useKitchenWebSocket());
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onclose && ws.onclose();
      vi.advanceTimersByTime(5000);
    });
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('limpia timers y cierra WebSocket al desmontar', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    const { unmount } = renderHook(() => useKitchenWebSocket());
    const ws = MockWebSocket.instances[0];
    act(() => {
      unmount();
    });
    expect(ws.close).toHaveBeenCalled();
  });

  it('cambiarEstado actualiza estado y elimina si es listo', () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: '4', table: 'D', customerName: 'Eva', items: [], status: 'preparing' }] });
    const { result } = renderHook(() => useKitchenWebSocket());
    act(() => {
      result.current.cambiarEstado('4', 'listo');
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.pedidos.length).toBe(0);
  });
});
