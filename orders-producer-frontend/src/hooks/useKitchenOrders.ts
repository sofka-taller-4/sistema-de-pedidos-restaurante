import { useState, useEffect, useRef, useCallback } from 'react';
import { getKitchenOrders, updateOrderStatus as updateOrderStatusAPI } from '../services/orderService';
import type { ApiOrder, KitchenOrder } from '../types/order';
import type { OrderStatus } from '../components/KitchenOrderCard';

// Get WebSocket URL from environment variables
export const getWebSocketUrl = (): string => {
  const nodeServiceUrl = import.meta.env.VITE_NODE_MS_URL;
  if (nodeServiceUrl) {
    // Convert HTTP(S) URL to WebSocket URL
    return nodeServiceUrl.replace(/^https?/, nodeServiceUrl.startsWith('https') ? 'wss' : 'ws');
  }
  // Fallback to localhost for development
  return 'ws://localhost:4000';
};

// Order type matching KitchenOrderCard interface
// Map API status to KitchenOrderCard status
export const mapApiStatusToOrderStatus = (status?: string): OrderStatus => {
  switch (status) {
    case 'preparing':
      return 'Preparando';
    case 'ready':
      return 'Listo';
    case 'completed':
      return 'Finalizada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Nueva Orden';
  }
};

// Format time from ISO string to local time (Colombia timezone)
export const formatTime = (isoString: string): string => {
  try {
    const cleanedIso = isoString.substring(0, 19); // Keep only up to seconds: YYYY-MM-DDTHH:mm:ss
    const date = new Date(cleanedIso + 'Z'); // Add Z to indicate UTC
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    const formatted = date.toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota',
    });
    console.log(`⏰ UTC: ${cleanedIso}Z -> Colombia: ${formatted}`);
    return formatted;
  } catch (e) {
    console.error(`❌ Error formatting time: ${isoString}`, e);
    return 'N/A';
  }
};
// Helper puro para actualizar el estado de una orden en un array (no hook)
export const updateOrderStatus = (
  orders: KitchenOrder[],
  orderId: string,
  newStatus: OrderStatus
): KitchenOrder[] => {
  let found = false;
  const updated = orders.map((order) => {
    if (order.id === orderId) {
      found = true;
      return { ...order, status: newStatus };
    }
    return order;
  });
  return found ? updated : orders;
};

// Calculate total preparation time based on products
// Formula: base_time = max(product_times), penalty = (quantity - 1) * factor, total = base + penalty
export const calculatePrepTime = (products: { preparationTime?: number; quantity: number }[]): number => {
  if (!products || products.length === 0) return 5; // Default 5 minutes
  const baseTimes = products
    .map(p => (p.preparationTime || 5) * (p.quantity || 1))
    .sort((a, b) => b - a);
  
  const maxTime = baseTimes[0];
  const penalty = (products.length - 1) * 1; // 1 minute per extra product
  
  return Math.ceil(maxTime + penalty);
};

// Map API Order to KitchenOrder format
export const mapApiOrderToKitchenOrder = (order: ApiOrder): KitchenOrder => {
  const products = (order.items || []).map((item: any) => {
    const seconds = item.preparationTimeSeconds;
    const minutesFromSeconds = typeof seconds === 'number' ? Math.ceil(seconds / 60) : undefined;
    return {
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
      // prefer explicit minutes if ever provided; else convert seconds; else default 5
      preparationTime: item.preparationTime ?? minutesFromSeconds ?? 5,
    };
  });

  const total = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const estimatedPrepTime = calculatePrepTime(products);

  return {
    id: `#${order.id.slice(0, 3).toUpperCase()}`,
    fullId: order.id, // Store full ID for API calls
    customerName: order.customerName,
    phone: 'N/A', // Phone not available from API
    time: formatTime(order.createdAt),
    table: order.table,
    products,
    total,
    status: mapApiStatusToOrderStatus(order.status),
    estimatedPrepTime,
  };
};

export const useKitchenOrders = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch orders from API Gateway
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getKitchenOrders();
      if (response.success && response.data) {
        const lista = Array.isArray(response.data) ? response.data : [response.data];
        const incoming = lista.map(mapApiOrderToKitchenOrder);
        // Merge incoming with existing by id, preserve higher-precedence statuses
        setOrders((prev: KitchenOrder[]) => {
          // If no previous orders, just use incoming data directly
          if (prev.length === 0) {
            return incoming;
          }
          
          const statusRank = { 'Nueva Orden': 0, 'Preparando': 1, 'Listo': 2, 'Finalizada': 3, 'Cancelada': 99 };
          const byId = new Map<string, KitchenOrder>();
          
          // Start with incoming orders (latest from API)
          for (const o of incoming) {
            byId.set(o.id, o);
          }
          
          // Update with existing orders only if they have higher-precedence status
          for (const existing of prev) {
            const incoming = byId.get(existing.id);
            if (incoming) {
              const existingRank = statusRank[existing.status] || 0;
              const incomingRank = statusRank[incoming.status] || 0;
              
              // Keep existing status only if it's more advanced
              if (existingRank > incomingRank) {
                byId.set(existing.id, { ...incoming, status: existing.status });
              }
            }
          }
          
          return Array.from(byId.values());
        });
      }
    } catch (err) {
      console.error('Error loading kitchen orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch from API Gateway
    fetchOrders();

    // WebSocket connection for real-time updates
    const connect = () => {
      try {
        wsRef.current = new WebSocket(getWebSocketUrl());

        wsRef.current.onopen = () => {
          console.log('✅ Connected to kitchen WebSocket');
          setConnected(true);
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('Kitchen WS message:', msg);

            if (msg.type === 'ORDER_NEW' && msg.order) {
              const newOrder = mapApiOrderToKitchenOrder(msg.order);
              const updateOrdersWithNew = (prev: KitchenOrder[]) => {
                const exists = prev.some((o: KitchenOrder) => o.id === newOrder.id);
                if (exists) {
                  return prev.map((o: KitchenOrder) => (o.id === newOrder.id ? newOrder : o));
                }
                // Add new orders at the beginning so they appear first
                return [newOrder, ...prev];
              };
              setOrders(updateOrdersWithNew);
            }

            if (msg.type === 'ORDER_UPDATED' && msg.order) {
              const updatedOrder = mapApiOrderToKitchenOrder(msg.order);
              const updateOrdersWithUpdated = (prev: KitchenOrder[]) => {
                const exists = prev.some((o: KitchenOrder) => o.fullId === updatedOrder.fullId);
                if (exists) {
                  // Update existing order while preserving status if it's more advanced
                  return prev.map((o: KitchenOrder) => {
                    if (o.fullId === updatedOrder.fullId) {
                      const statusRank = { 'Nueva Orden': 0, 'Preparando': 1, 'Listo': 2, 'Finalizada': 3, 'Cancelada': 99 };
                      const existingRank = statusRank[o.status] || 0;
                      const updatedRank = statusRank[updatedOrder.status] || 0;
                      // Keep existing status if more advanced, otherwise use updated
                      return existingRank > updatedRank ? { ...updatedOrder, status: o.status } : updatedOrder;
                    }
                    return o;
                  });
                }
                // If order doesn't exist, add it
                return [updatedOrder, ...prev];
              };
              setOrders(updateOrdersWithUpdated);
            }

            if (msg.type === 'ORDER_READY' && msg.id) {
              setOrders((prev: KitchenOrder[]) =>
                prev.map((o: KitchenOrder) =>
                  o.id.includes(msg.id.slice(0, 3).toUpperCase())
                    ? { ...o, status: 'Listo' as OrderStatus }
                    : o
                )
              );
            }

            if (msg.type === 'ORDER_STATUS_UPDATE' && msg.id && msg.status) {
              const newStatus = mapApiStatusToOrderStatus(msg.status);
              setOrders((prev: KitchenOrder[]) =>
                prev.map((o: KitchenOrder) =>
                  o.id.includes(msg.id.slice(0, 3).toUpperCase())
                    ? { ...o, status: newStatus }
                    : o
                )
              );
            }

            // Handler para ORDER_STATUS_CHANGED (enviado por el backend)
            if (msg.type === 'ORDER_STATUS_CHANGED' && msg.order) {
              const orderId = msg.order.id;
              const newStatus = mapApiStatusToOrderStatus(msg.order.status);
              console.log(`🔄 Estado de orden ${orderId} cambió a: ${msg.order.status} → ${newStatus}`);
              
              setOrders((prev: KitchenOrder[]) =>
                prev.map((o: KitchenOrder) => {
                  // Comparar por fullId (ID completo)
                  if (o.fullId === orderId) {
                    console.log(`✅ Actualizando orden ${o.id} de ${o.status} a ${newStatus}`);
                    return { ...o, status: newStatus };
                  }
                  return o;
                })
              );
            }
          } catch (err) {
            console.error('Error processing WS message', err);
          }
        };

        wsRef.current.onclose = () => {
          console.log('❌ WebSocket disconnected');
          setConnected(false);

          // Reconnect after 5 seconds
          reconnectTimerRef.current = setTimeout(() => {
            console.log('🔄 Attempting WebSocket reconnection...');
            connect();
          }, 5000);
        };

        wsRef.current.onerror = (err: Event) => {
          console.error('Kitchen WebSocket error', err);
        };
      } catch (err) {
        console.error('Failed to connect to kitchen WebSocket', err);
      }
    };

    connect();

    // Cleanup
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchOrders]);

  // Update order status locally
  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrders((prev: KitchenOrder[]) =>
      prev.map((order: KitchenOrder) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  }, []);

  // Handler for starting cooking
  const startCooking = useCallback(async (orderId: string) => {
    // Find the order to get the full ID
    const order = orders.find((o: KitchenOrder) => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }
    
    try {
      // Update status on backend via API using full ID
      await updateOrderStatusAPI(order.fullId, 'preparing');
      // Update local state and register prep start time
      setOrders((prev: KitchenOrder[]) =>
        prev.map((o: KitchenOrder) =>
          o.id === orderId ? { ...o, status: 'Preparando', prepStartTime: Date.now() } : o
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      // Optionally show error to user
    }
  }, [orders]);

  // Handler for marking as ready
  const markAsReady = useCallback(async (orderId: string) => {
    // Find the order to get the full ID
    const order = orders.find((o: KitchenOrder) => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }
    
    try {
      // Update status on backend via API using full ID
      await updateOrderStatusAPI(order.fullId, 'ready');
      // Update local state
      updateOrderStatus(orderId, 'Listo');
    } catch (error) {
      console.error('Error updating order status:', error);
      // Optionally show error to user
    }
  }, [orders, updateOrderStatus]);

  // Handler for completing order
  const completeOrder = useCallback(async (orderId: string) => {
    // Find the order to get the full ID
    const order = orders.find((o: KitchenOrder) => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }
    
    try {
      // Update status on backend via API using full ID
      await updateOrderStatusAPI(order.fullId, 'completed');
      // Update local state
      updateOrderStatus(orderId, 'Finalizada');
    } catch (error) {
      console.error('Error updating order status:', error);
      // Optionally show error to user
    }
  }, [orders, updateOrderStatus]);

  return {
    orders,
    connected,
    loading,
    startCooking,
    markAsReady,
    completeOrder,
    refetch: fetchOrders,
  };
};
