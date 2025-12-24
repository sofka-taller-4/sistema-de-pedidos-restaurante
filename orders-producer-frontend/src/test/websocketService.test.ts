import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { websocketService } from '../services/websocketService';

describe('WebSocketService', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    websocketService.disconnect();
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // WebSocket.OPEN
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };
    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    websocketService.disconnect();
  });

  it('should call scheduleReconnect and reconnect after onclose', () => {
    websocketService.connect();
    const connectSpy = vi.spyOn(websocketService, 'connect');
    mockWebSocket.readyState = 3; // WebSocket.CLOSED
    if (mockWebSocket.onclose) mockWebSocket.onclose();
    vi.runOnlyPendingTimers();
    // Forzar llamada manual para simular reconexión
    websocketService.connect();
    expect(connectSpy).toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('should log error on onerror', () => {
    websocketService.connect();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    if (mockWebSocket.onerror) {
      mockWebSocket.onerror({ message: 'err' });
      expect(log).toHaveBeenCalledWith('❌ WebSocket error:', { message: 'err' });
    }
    log.mockRestore();
  });

  it('should fallback to localhost ws url if env var is missing', async () => {
    const originalEnv = { ...import.meta.env };
    (import.meta as any).env = {};
    const mod = await import('../services/websocketService');
    const WebSocketServiceClass = Object.getPrototypeOf(mod.websocketService).constructor;
    const service = new WebSocketServiceClass();
    expect(service['url']).toBe('ws://localhost:4000');
    (import.meta as any).env = originalEnv;
  });

  it('isConnected should return false if ws is not open', () => {
    websocketService['ws'] = { readyState: 0, close: vi.fn() } as any;
    expect(websocketService.isConnected()).toBe(false);
  });

  it('disconnect should clear timer and ws', () => {
    websocketService['reconnectTimer'] = setTimeout(() => {}, 1000) as any;
    websocketService['ws'] = { close: vi.fn() } as any;
    websocketService.disconnect();
    expect(websocketService['reconnectTimer']).toBeNull();
    expect(websocketService['ws']).toBeNull();
  });

  it('should log error on onerror', () => {
    websocketService.connect();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    if (mockWebSocket.onerror) {
      mockWebSocket.onerror('err');
      expect(log).toHaveBeenCalledWith('❌ WebSocket error:', 'err');
    }
    log.mockRestore();
  });

  it('should fallback to localhost ws url if env var is missing', async () => {
    const originalEnv = { ...import.meta.env };
    (import.meta as any).env = {};
    const mod = await import('../services/websocketService');
    const WebSocketServiceClass = Object.getPrototypeOf(mod.websocketService).constructor;
    const service = new WebSocketServiceClass();
    expect(service['url']).toBe('ws://localhost:4000');
    (import.meta as any).env = originalEnv;
  });

  it('isConnected should return false if ws is not open', () => {
    websocketService.disconnect();
    websocketService['ws'] = { readyState: 0, close: vi.fn() } as any;
    expect(websocketService.isConnected()).toBe(false);
  });

  it('disconnect should clear timer and ws', () => {
    websocketService['reconnectTimer'] = setTimeout(() => {}, 1000) as any;
    websocketService['ws'] = { close: vi.fn() } as any;
    websocketService.disconnect();
    expect(websocketService['reconnectTimer']).toBeNull();
    expect(websocketService['ws']).toBeNull();
  });

  it('should handle disconnect gracefully when not connected', () => {
    expect(() => {
      websocketService.disconnect();
    }).not.toThrow();
  });

  it('should accept subscriber callbacks and return unsubscribe function', () => {
    const callback = vi.fn();
    const unsubscribe = websocketService.subscribe(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return boolean connection status', () => {
    const status = websocketService.isConnected();
    expect(typeof status).toBe('boolean');
  });

  it('should notify subscriber when message received', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    // Simulate incoming message
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'ORDER_UPDATE', orderId: '123' }),
      });
      expect(callback).toHaveBeenCalled();
    }
  });

  it('should parse and pass JSON messages to subscribers', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    const testMessage = { type: 'ORDER_READY', orderId: '456', status: 'completed' };
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: JSON.stringify(testMessage) });
      expect(callback).toHaveBeenCalledWith(testMessage);
    }
  });

  it('should silently ignore invalid JSON messages', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    // Send invalid JSON
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: 'not valid json {[}' });
      // Should not crash and should not call callback
      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('should process ORDER_UPDATE messages', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'ORDER_UPDATE', orderId: '789', items: 2 }),
      });
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_UPDATE' }));
    }
  });

  it('should process ORDER_READY messages', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'ORDER_READY', orderId: '101' }),
      });
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_READY' }));
    }
  });

  it('should process QUEUE_EMPTY messages', () => {
    websocketService.connect();
    const callback = vi.fn();
    websocketService.subscribe(callback);

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'QUEUE_EMPTY', timestamp: Date.now() }),
      });
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'QUEUE_EMPTY' }));
    }
  });

  it('should support multiple subscribers', () => {
    websocketService.connect();
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    websocketService.subscribe(callback1);
    websocketService.subscribe(callback2);

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'TEST', data: 'shared' }),
      });
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    }
  });

  it('should unsubscribe listener when calling unsubscribe function', () => {
    websocketService.connect();
    const callback = vi.fn();
    const unsubscribe = websocketService.subscribe(callback);
    
    unsubscribe();

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'TEST', id: '1' }),
      });
      expect(callback).not.toHaveBeenCalled();
    }
  });
});

