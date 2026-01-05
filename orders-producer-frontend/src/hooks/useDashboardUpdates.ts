import { useEffect, useCallback, useRef } from 'react';

interface DashboardMessage {
  type: 'ORDER_NEW' | 'ORDER_STATUS_CHANGED' | 'QUEUE_EMPTY' | string;
  order?: any;
  message?: string;
}

interface UseDashboardUpdatesReturn {
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

export const useDashboardUpdates = (
  onOrderNew: (order: any) => void,
  onStatusChanged: (order: any) => void
): UseDashboardUpdatesReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ Dashboard WebSocket ya está conectado');
      return;
    }

    try {
      // Get WebSocket URL from environment variables
      const getWebSocketUrl = (): string => {
        const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
        if (wsUrl) {
          return wsUrl;
        }
        // Fallback para desarrollo
        return 'ws://localhost:5173/ws';
      };
      wsRef.current = new WebSocket(getWebSocketUrl());

      wsRef.current.onopen = () => {
        console.log('✅ Dashboard WebSocket conectado');
        isConnectedRef.current = true;
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const message: DashboardMessage = JSON.parse(event.data);
          console.log('📊 Dashboard WS message:', message);

          switch (message.type) {
            case 'ORDER_NEW':
              if (message.order) {
                console.log('📝 Nueva orden detectada:', message.order.orderNumber);
                onOrderNew(message.order);
              }
              break;

            case 'ORDER_STATUS_CHANGED':
              if (message.order) {
                console.log('🔄 Status de orden cambió:', message.order.orderNumber, '->', message.order.status);
                onStatusChanged(message.order);
              }
              break;

            case 'QUEUE_EMPTY':
              console.log('🕒 Cola vacía');
              break;

            default:
              console.log('❓ Mensaje desconocido:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parseando mensaje WebSocket:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Dashboard WebSocket error:', error);
        isConnectedRef.current = false;
      };

      wsRef.current.onclose = () => {
        console.log('❌ Dashboard WebSocket desconectado');
        isConnectedRef.current = false;
        // Intentar reconectar después de 3 segundos
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    } catch (error) {
      console.error('❌ Error conectando WebSocket:', error);
      isConnectedRef.current = false;
    }
  }, [onOrderNew, onStatusChanged]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: isConnectedRef.current,
  };
};
