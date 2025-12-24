import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardUpdates } from '@/hooks/useDashboardUpdates';

describe('useDashboardUpdates', () => {
  let mockOnOrderNew: ReturnType<typeof vi.fn>;
  let mockOnStatusChanged: ReturnType<typeof vi.fn>;
  let originalWebSocket: any;
  let wsInstances: any[] = [];

  beforeEach(() => {
    mockOnOrderNew = vi.fn();
    mockOnStatusChanged = vi.fn();
    wsInstances = [];
    originalWebSocket = global.WebSocket;
    class MockWebSocket {
      static OPEN = 1;
      readyState = 0;
      onopen: (() => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onclose: (() => void) | null = null;
      close = vi.fn();
      send = vi.fn();
      constructor() {
        wsInstances.push(this);
        setTimeout(() => {
          this.readyState = 1;
          this.onopen && this.onopen();
        }, 10);
      }
      triggerMessage(data: any) {
        this.onmessage && this.onmessage({ data: JSON.stringify(data) });
      }
      triggerError(error: any) {
        this.onerror && this.onerror(error);
      }
      triggerClose() {
        this.onclose && this.onclose();
      }
    }
    // @ts-ignore
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    // @ts-ignore
    global.WebSocket = originalWebSocket;
    vi.clearAllMocks();
  });

  it('conecta y recibe ORDER_NEW', async () => {
    renderHook(() => useDashboardUpdates(mockOnOrderNew, mockOnStatusChanged));
    // Esperar a que el WebSocket esté "abierto"
    await new Promise((r) => setTimeout(r, 20));
    // Simular mensaje ORDER_NEW
    act(() => {
      wsInstances[0].triggerMessage({ type: 'ORDER_NEW', order: { orderNumber: 123 } });
    });
    expect(mockOnOrderNew).toHaveBeenCalledWith({ orderNumber: 123 });
  });

  it('recibe ORDER_STATUS_CHANGED', async () => {
    renderHook(() => useDashboardUpdates(mockOnOrderNew, mockOnStatusChanged));
    await new Promise((r) => setTimeout(r, 20));
    act(() => {
      wsInstances[0].triggerMessage({ type: 'ORDER_STATUS_CHANGED', order: { orderNumber: 456, status: 'ready' } });
    });
    expect(mockOnStatusChanged).toHaveBeenCalledWith({ orderNumber: 456, status: 'ready' });
  });

  it('maneja mensajes desconocidos y errores de parseo', async () => {
    const { result } = renderHook(() => useDashboardUpdates(mockOnOrderNew, mockOnStatusChanged));
    await new Promise((r) => setTimeout(r, 20));
    act(() => {
      wsInstances[0].triggerMessage({ type: 'UNKNOWN_TYPE', foo: 'bar' });
      wsInstances[0].onmessage && wsInstances[0].onmessage({ data: 'not-json' });
    });
    expect(mockOnOrderNew).not.toHaveBeenCalled();
    expect(mockOnStatusChanged).not.toHaveBeenCalled();
  });

});
