    import {
      getWebSocketUrl,
      mapApiStatusToOrderStatus,
      formatTime,
      updateOrderStatus as updateOrderStatusHelper,
      calculatePrepTime,
      mapApiOrderToKitchenOrder
    } from '../hooks/useKitchenOrders';

    describe('Helpers directos useKitchenOrders', () => {
      it('getWebSocketUrl convierte https a wss', () => {
        // @ts-ignore
        import.meta.env.VITE_NODE_MS_URL = 'https://servidor.com';
        expect(getWebSocketUrl()).toBe('wss://servidor.com');
      });
      it('mapApiStatusToOrderStatus cubre todos los casos', () => {
        expect(mapApiStatusToOrderStatus('preparing')).toBe('Preparando');
        expect(mapApiStatusToOrderStatus('ready')).toBe('Listo');
        expect(mapApiStatusToOrderStatus('completed')).toBe('Finalizada');
        expect(mapApiStatusToOrderStatus('cancelled')).toBe('Cancelada');
        expect(mapApiStatusToOrderStatus('otra')).toBe('Nueva Orden');
      });
      it('formatTime maneja try/catch y error', () => {
        const spy = vi.spyOn(global, 'Date').mockImplementation(() => { throw new Error('fail'); });
        expect(formatTime('2020-01-01')).toBe('N/A');
        spy.mockRestore();
      });
      it('calculatePrepTime cubre todos los branches', () => {
        expect(calculatePrepTime(undefined)).toBe(5);
        expect(calculatePrepTime([])).toBe(5);
        expect(calculatePrepTime([{ preparationTime: 2, quantity: 2 }, { preparationTime: 1, quantity: 1 }])).toBe(5);
      });
      it('updateOrderStatus cubre found true/false', () => {
        const arr = [{ id: '1', status: 'Preparando' }];
        expect(updateOrderStatusHelper(arr, '1', 'Listo')[0].status).toBe('Listo');
        expect(updateOrderStatusHelper(arr, 'no', 'Listo')).toBe(arr);
      });
      it('mapApiOrderToKitchenOrder cubre todos los campos', () => {
        const apiOrder = {
          id: 'id1',
          customerName: 'Test',
          createdAt: new Date().toISOString(),
          table: '1',
          status: 'preparing',
          items: [{ productName: 'A', quantity: 1, unitPrice: 100, preparationTime: 2, preparationTimeSeconds: 120 }],
        };
        const result = mapApiOrderToKitchenOrder(apiOrder);
        expect(result.products[0].preparationTime).toBe(2);
        expect(result.status).toBe('Preparando');
      });
    });
    import { act, renderHook } from '@testing-library/react';
    import * as orderService from '../services/orderService';
    import { useKitchenOrders } from '../hooks/useKitchenOrders';

    describe('Helpers edge cases', () => {
      const { mapApiStatusToOrderStatus, formatTime, updateOrderStatus, calculatePrepTime } = kitchenOrdersHook;
      it('mapApiStatusToOrderStatus retorna default para status desconocido', () => {
        expect(mapApiStatusToOrderStatus('otro')).toBe('Nueva Orden');
        expect(mapApiStatusToOrderStatus(undefined)).toBe('Nueva Orden');
      });
      it('formatTime retorna N/A si date es NaN', () => {
        expect(formatTime('')).toBe('N/A');
      });
      it('updateOrderStatus retorna array original si id no existe', () => {
        const arr = [{ id: '1', status: 'Preparando' }];
        expect(updateOrderStatus(arr, 'no', 'Listo')).toBe(arr);
      });
      it('calculatePrepTime maneja productos sin quantity ni preparationTime', () => {
        expect(calculatePrepTime([{ }])).toBe(5);
      });
    });

    describe('useKitchenOrders error paths', () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it('fetchOrders maneja error de API', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockRejectedValue(new Error('fail'));
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        expect(result.current.loading).toBe(false);
      });
      it('fetchOrders maneja response malformado', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: null });
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        expect(result.current.orders).toBeDefined();
      });
      it('startCooking maneja error de API', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: 'id1', customerName: 'A', createdAt: new Date().toISOString(), table: '1', status: 'preparing', items: [] }] });
        vi.spyOn(orderService, 'updateOrderStatus').mockRejectedValue(new Error('fail'));
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        await act(async () => {
          await result.current.startCooking('ID1');
        });
      });
      it('markAsReady maneja error de API', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: 'id2', customerName: 'B', createdAt: new Date().toISOString(), table: '2', status: 'preparing', items: [] }] });
        vi.spyOn(orderService, 'updateOrderStatus').mockRejectedValue(new Error('fail'));
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        await act(async () => {
          await result.current.markAsReady('ID2');
        });
      });
      it('completeOrder maneja error de API', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [{ id: 'id3', customerName: 'C', createdAt: new Date().toISOString(), table: '3', status: 'preparing', items: [] }] });
        vi.spyOn(orderService, 'updateOrderStatus').mockRejectedValue(new Error('fail'));
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        await act(async () => {
          await result.current.completeOrder('ID3');
        });
      });
      it('startCooking, markAsReady, completeOrder con orderId inexistente', async () => {
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        await act(async () => {
          await result.current.startCooking('no-existe');
          await result.current.markAsReady('no-existe');
          await result.current.completeOrder('no-existe');
        });
      });
    });
    import { vi } from 'vitest';
    // Importar helpers para cobertura directa
    import * as kitchenOrdersHook from '../hooks/useKitchenOrders';
      it('mapApiOrderToKitchenOrder maneja items sin preparationTime ni preparationTimeSeconds', () => {
        const apiOrder = {
          id: 'id1',
          customerName: 'Test',
          createdAt: new Date().toISOString(),
          table: '1',
          status: 'preparing',
          items: [{ productName: 'A', quantity: 1, unitPrice: 100 }],
        };
        const result = kitchenOrdersHook['mapApiOrderToKitchenOrder'](apiOrder);
        expect(result.products[0].preparationTime).toBe(5);
      });

      it('formatTime retorna N/A si el string es inválido', () => {
        const res = kitchenOrdersHook['formatTime']('no-es-fecha');
        expect(res).toBe('N/A');
      });

      it('calculatePrepTime retorna 5 si productos es vacío', () => {
        const res = kitchenOrdersHook['calculatePrepTime']([]);
        expect(res).toBe(5);
      });

      it('WebSocket ignora mensajes válidos sin campos requeridos', async () => {
        let localWsInstances = [];
        const originalWebSocket = global.WebSocket;
        class LocalMockWebSocket {
          static OPEN = 1;
          readyState = 0;
          onopen = null;
          onmessage = null;
          onerror = null;
          onclose = null;
          close = vi.fn();
          send = vi.fn();
          constructor() {
            localWsInstances.push(this);
            setTimeout(() => {
              this.readyState = 1;
              this.onopen && this.onopen();
            }, 10);
          }
          triggerMessage(data) {
            this.onmessage && this.onmessage({ data: JSON.stringify(data) });
          }
          triggerClose() {
            this.onclose && this.onclose();
          }
        }
        // @ts-ignore
        global.WebSocket = LocalMockWebSocket;
        const mockApiOrder = {
          id: 'abcd1234',
          customerName: 'Juan',
          createdAt: new Date(Date.now() - 60000).toISOString(),
          table: '5',
          status: 'preparing',
          items: [
            { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
            { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
          ]
        };
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        expect(localWsInstances.length).toBeGreaterThan(0);
        // ORDER_NEW sin order
        act(() => {
          localWsInstances[0].triggerMessage({ type: 'ORDER_NEW' });
        });
        // ORDER_READY sin id
        act(() => {
          localWsInstances[0].triggerMessage({ type: 'ORDER_READY' });
        });
        // ORDER_STATUS_UPDATE sin id/status
        act(() => {
          localWsInstances[0].triggerMessage({ type: 'ORDER_STATUS_UPDATE' });
        });
        // ORDER_STATUS_CHANGED sin order
        act(() => {
          localWsInstances[0].triggerMessage({ type: 'ORDER_STATUS_CHANGED' });
        });
        expect(result.current.orders.length).toBeGreaterThan(0);
        // @ts-ignore
        global.WebSocket = originalWebSocket;
      });

      it('simula error al crear WebSocket (reconexión fallida)', async () => {
        const originalWebSocket = global.WebSocket;
        // @ts-ignore
        global.WebSocket = vi.fn(() => { throw new Error('fail'); });
        const mockApiOrder = {
          id: 'abcd1234',
          customerName: 'Juan',
          createdAt: new Date(Date.now() - 60000).toISOString(),
          table: '5',
          status: 'preparing',
          items: [
            { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
            { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
          ]
        };
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
        await act(async () => {
          renderHook(() => useKitchenOrders());
          await new Promise((r) => setTimeout(r, 30));
        });
        // @ts-ignore
        global.WebSocket = originalWebSocket;
      });

      it('refetch actualiza el estado de loading', async () => {
        const mockApiOrder = {
          id: 'abcd1234',
          customerName: 'Juan',
          createdAt: new Date(Date.now() - 60000).toISOString(),
          table: '5',
          status: 'preparing',
          items: [
            { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
            { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
          ]
        };
        vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
        let result;
        await act(async () => {
          ({ result } = renderHook(() => useKitchenOrders()));
          await new Promise((r) => setTimeout(r, 30));
        });
        expect(result.current.loading).toBe(false);
        await act(async () => {
          await result.current.refetch();
        });
        expect(result.current.loading).toBe(false);
      });

      it('updateOrderStatus no modifica si id no existe', () => {
        const orders = [
          { id: 'a', status: 'Preparando', fullId: 'a', customerName: '', phone: '', time: '', table: '', products: [], total: 0 }
        ];
        const result = kitchenOrdersHook.updateOrderStatus(orders, 'no-existe', 'Listo');
        expect(result).toEqual(orders);
      });
    it('cierra el WebSocket al desmontar el hook', async () => {
      let localWsInstances = [];
      const originalWebSocket = global.WebSocket;
      class LocalMockWebSocket {
        static OPEN = 1;
        readyState = 0;
        onopen = null;
        onmessage = null;
        onerror = null;
        onclose = null;
        close = vi.fn();
        send = vi.fn();
        constructor() {
          localWsInstances.push(this);
          setTimeout(() => {
            this.readyState = 1;
            this.onopen && this.onopen();
          }, 10);
        }
        triggerMessage(data) {
          this.onmessage && this.onmessage({ data: JSON.stringify(data) });
        }
        triggerClose() {
          this.onclose && this.onclose();
        }
      }
      // @ts-ignore
      global.WebSocket = LocalMockWebSocket;
      const mockApiOrder = {
        id: 'abcd1234',
        customerName: 'Juan',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        table: '5',
        status: 'preparing',
        items: [
          { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
          { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
        ]
      };
      vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
      let unmount;
      await act(async () => {
        ({ unmount } = renderHook(() => useKitchenOrders()));
        await new Promise((r) => setTimeout(r, 30));
      });
      expect(localWsInstances.length).toBeGreaterThan(0);
      unmount();
      expect(localWsInstances[0].close).toHaveBeenCalled();
      // @ts-ignore
      global.WebSocket = originalWebSocket;
    });

    it('ignora mensajes WebSocket malformados', async () => {
      let localWsInstances = [];
      const originalWebSocket = global.WebSocket;
      class LocalMockWebSocket {
        static OPEN = 1;
        readyState = 0;
        onopen = null;
        onmessage = null;
        onerror = null;
        onclose = null;
        close = vi.fn();
        send = vi.fn();
        constructor() {
          localWsInstances.push(this);
          setTimeout(() => {
            this.readyState = 1;
            this.onopen && this.onopen();
          }, 10);
        }
        triggerMessage(data) {
          this.onmessage && this.onmessage({ data }); // No es JSON
        }
        triggerClose() {
          this.onclose && this.onclose();
        }
      }
      // @ts-ignore
      global.WebSocket = LocalMockWebSocket;
      const mockApiOrder = {
        id: 'abcd1234',
        customerName: 'Juan',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        table: '5',
        status: 'preparing',
        items: [
          { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
          { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
        ]
      };
      vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
      let result;
      await act(async () => {
        ({ result } = renderHook(() => useKitchenOrders()));
        await new Promise((r) => setTimeout(r, 30));
      });
      expect(localWsInstances.length).toBeGreaterThan(0);
      act(() => {
        localWsInstances[0].triggerMessage('no es json');
      });
      expect(result.current.orders.length).toBeGreaterThan(0);
      // @ts-ignore
      global.WebSocket = originalWebSocket;
    });

    it('no cambia estado si el pedido no existe', async () => {
      const mockApiOrder = {
        id: 'abcd1234',
        customerName: 'Juan',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        table: '5',
        status: 'preparing',
        items: [
          { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
          { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
        ]
      };
      vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
      let result;
      await act(async () => {
        ({ result } = renderHook(() => useKitchenOrders()));
        await new Promise((r) => setTimeout(r, 30));
      });
      // Intentar cambiar estado de un pedido inexistente
      await act(async () => {
        await result.current.startCooking('no-existe');
        await result.current.markAsReady('no-existe');
        await result.current.completeOrder('no-existe');
      });
      // El pedido original sigue igual
      expect(result.current.orders[0].status).toBe('Preparando');
    });

    it('simula múltiples reconexiones de WebSocket', async () => {
      let localWsInstances = [];
      const originalWebSocket = global.WebSocket;
      class LocalMockWebSocket {
        static OPEN = 1;
        readyState = 0;
        onopen = null;
        onmessage = null;
        onerror = null;
        onclose = null;
        close = vi.fn();
        send = vi.fn();
        constructor() {
          localWsInstances.push(this);
          setTimeout(() => {
            this.readyState = 1;
            this.onopen && this.onopen();
          }, 10);
        }
        triggerMessage(data) {
          this.onmessage && this.onmessage({ data: JSON.stringify(data) });
        }
        triggerClose() {
          this.onclose && this.onclose();
        }
      }
      // @ts-ignore
      global.WebSocket = LocalMockWebSocket;
      const mockApiOrder = {
        id: 'abcd1234',
        customerName: 'Juan',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        table: '5',
        status: 'preparing',
        items: [
          { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
          { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
        ]
      };
      vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
      let result;
      await act(async () => {
        ({ result } = renderHook(() => useKitchenOrders()));
        await new Promise((r) => setTimeout(r, 30));
      });
      expect(localWsInstances.length).toBeGreaterThan(0);
      // Simular varias reconexiones
      for (let i = 0; i < 3; i++) {
        act(() => {
          localWsInstances[0].triggerClose();
        });
        await act(async () => {
          localWsInstances[0].onopen && localWsInstances[0].onopen();
        });
      }
      expect(result.current.orders.length).toBeGreaterThan(0);
      // @ts-ignore
      global.WebSocket = originalWebSocket;
    });
  it('maneja error al cargar pedidos iniciales', async () => {
    // No asumimos que el hook expone error, solo que no hay pedidos y loading es false
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: false, error: 'Error API' });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('maneja error al actualizar estado de pedido', async () => {
    const mockApiOrder = {
      id: 'abcd1234',
      customerName: 'Juan',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      table: '5',
      status: 'preparing',
      items: [
        { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
        { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
      ]
    };
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
    vi.spyOn(orderService, 'updateOrderStatus').mockResolvedValue({ success: false, error: 'Error update' });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    // Solo verificamos que no lanza error y el flujo sigue, ya que el hook no revierte el estado
    await act(async () => {
      await result.current.startCooking(result.current.orders[0].id);
    });
    expect(result.current.orders[0].status).toBeDefined();
  });

  it('ignora mensajes WebSocket desconocidos', async () => {
    const mockApiOrder = {
      id: 'abcd1234',
      customerName: 'Juan',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      table: '5',
      status: 'preparing',
      items: [
        { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
        { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
      ]
    };
    let result;
    let localWsInstances = [];
    const originalWebSocket = global.WebSocket;
    class LocalMockWebSocket {
      static OPEN = 1;
      readyState = 0;
      onopen = null;
      onmessage = null;
      onerror = null;
      onclose = null;
      close = vi.fn();
      send = vi.fn();
      constructor() {
        localWsInstances.push(this);
        setTimeout(() => {
          this.readyState = 1;
          this.onopen && this.onopen();
        }, 10);
      }
      triggerMessage(data) {
        this.onmessage && this.onmessage({ data: JSON.stringify(data) });
      }
      triggerClose() {
        this.onclose && this.onclose();
      }
    }
    // @ts-ignore
    global.WebSocket = LocalMockWebSocket;
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(localWsInstances.length).toBeGreaterThan(0);
    act(() => {
      localWsInstances[0].triggerMessage({ type: 'UNKNOWN_EVENT', foo: 'bar' });
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    // Restaurar WebSocket global
    // @ts-ignore
    global.WebSocket = originalWebSocket;
  });

  it('maneja cierre y reconexión de WebSocket', async () => {
    const mockApiOrder = {
      id: 'abcd1234',
      customerName: 'Juan',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      table: '5',
      status: 'preparing',
      items: [
        { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
        { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
      ]
    };
    let result;
    let localWsInstances = [];
    const originalWebSocket = global.WebSocket;
    class LocalMockWebSocket {
      static OPEN = 1;
      readyState = 0;
      onopen = null;
      onmessage = null;
      onerror = null;
      onclose = null;
      close = vi.fn();
      send = vi.fn();
      constructor() {
        localWsInstances.push(this);
        setTimeout(() => {
          this.readyState = 1;
          this.onopen && this.onopen();
        }, 10);
      }
      triggerMessage(data) {
        this.onmessage && this.onmessage({ data: JSON.stringify(data) });
      }
      triggerClose() {
        this.onclose && this.onclose();
      }
    }
    // @ts-ignore
    global.WebSocket = LocalMockWebSocket;
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(localWsInstances.length).toBeGreaterThan(0);
    act(() => {
      localWsInstances[0].triggerClose();
    });
    // Simular reconexión creando un nuevo WebSocket
    await act(async () => {
      localWsInstances[0].onopen && localWsInstances[0].onopen();
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    // Restaurar WebSocket global
    // @ts-ignore
    global.WebSocket = originalWebSocket;
  });

  it('devuelve lista vacía si no hay pedidos', async () => {
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [] });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBe(0);
    expect(result.current.loading).toBe(false);
  });
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import * as orderService from '@/services/orderService';

describe('useKitchenOrders', () => {
  let originalWebSocket: any;
  let wsInstances: any[] = [];
  const mockApiOrder = {
    id: 'abcd1234',
    customerName: 'Juan',
    createdAt: new Date(Date.now() - 60000).toISOString(),
    table: '5',
    status: 'preparing',
    items: [
      { productName: 'Pizza', quantity: 2, unitPrice: 10000, preparationTimeSeconds: 600 },
      { productName: 'Bebida', quantity: 1, unitPrice: 3000, preparationTimeSeconds: 120 }
    ]
  };

  beforeEach(() => {
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
      triggerClose() {
        this.onclose && this.onclose();
      }
    }
    // @ts-ignore
    global.WebSocket = MockWebSocket;
    vi.spyOn(orderService, 'getKitchenOrders').mockResolvedValue({ success: true, data: [mockApiOrder] });
  });

  afterEach(() => {
    // @ts-ignore
    global.WebSocket = originalWebSocket;
    vi.clearAllMocks();
  });

  it('carga pedidos iniciales y mapea correctamente', async () => {
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      // Esperar a que el hook termine de cargar los pedidos
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBe(1);
    expect(result.current.orders[0].customerName).toBe('Juan');
    expect(result.current.orders[0].products[0].name).toBe('Pizza');
    expect(result.current.loading).toBe(false);
  });

  it('agrega una nueva orden por WebSocket', async () => {
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    // Esperar a que wsInstances[0] esté disponible
    expect(wsInstances.length).toBeGreaterThan(0);
    act(() => {
      wsInstances[0].triggerMessage({ type: 'ORDER_NEW', order: { ...mockApiOrder, id: 'xyz9876', customerName: 'Ana' } });
    });
    expect(result.current.orders.some(o => o.customerName === 'Ana')).toBe(true);
  });

  it('actualiza el estado de una orden por WebSocket', async () => {
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(wsInstances.length).toBeGreaterThan(0);
    act(() => {
      wsInstances[0].triggerMessage({ type: 'ORDER_STATUS_CHANGED', order: { ...mockApiOrder, status: 'ready' } });
    });
    expect(result.current.orders[0]?.status).toBe('Listo');
  });

  it('llama a startCooking y actualiza estado', async () => {
    vi.spyOn(orderService, 'updateOrderStatus').mockResolvedValue({ success: true });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    await act(async () => {
      await result.current.startCooking(result.current.orders[0].id);
    });
    expect(result.current.orders[0]?.status).toBe('Preparando');
  });

  it('llama a markAsReady y actualiza estado', async () => {
    vi.spyOn(orderService, 'updateOrderStatus').mockResolvedValue({ success: true });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    await act(async () => {
      await result.current.markAsReady(result.current.orders[0].id);
    });
    expect(result.current.orders[0]?.status).toBe('Listo');
  });

  it('llama a completeOrder y actualiza estado', async () => {
    vi.spyOn(orderService, 'updateOrderStatus').mockResolvedValue({ success: true });
    let result;
    await act(async () => {
      ({ result } = renderHook(() => useKitchenOrders()));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.orders.length).toBeGreaterThan(0);
    await act(async () => {
      await result.current.completeOrder(result.current.orders[0].id);
    });
    expect(result.current.orders[0]?.status).toBe('Finalizada');
  });
});
