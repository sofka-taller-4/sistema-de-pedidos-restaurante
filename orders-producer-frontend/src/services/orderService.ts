import { API_ENDPOINTS } from '../config/api';
import type { OrderPayload, ApiResponse, ApiOrder } from '../types/order';

/**
 * Create a new order through the API Gateway
 */
export async function createOrder(orderData: OrderPayload): Promise<ApiResponse<ApiOrder>> {
  const response = await fetch(API_ENDPOINTS.CREATE_ORDER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al crear pedido');
  }

  return data;
}

/**
 * Get an order by ID through the API Gateway
 */
export async function getOrderById(orderId: string): Promise<ApiResponse<ApiOrder>> {
  const response = await fetch(API_ENDPOINTS.GET_ORDER(orderId));
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al obtener pedido');
  }

  return data;
}

/**
 * Get all kitchen orders through the API Gateway
 */
export async function getKitchenOrders(): Promise<ApiResponse<ApiOrder[]>> {
  const response = await fetch(`${API_ENDPOINTS.KITCHEN_ORDERS}?status=all`);
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al obtener pedidos de cocina');
  }

  return data;
}

/**
 * Update order details (customer name, table, items)
 */
export async function updateOrder(
  orderId: string,
  updates: {
    customerName?: string;
    table?: string;
    items?: {
      productName: string;
      quantity: number;
      unitPrice: number;
      note?: string | null;
    }[];
  }
): Promise<ApiResponse<ApiOrder>> {
  try {
    const response = await fetch(API_ENDPOINTS.UPDATE_ORDER(orderId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    // ✅ 1. SI ES ERROR HTTP → LEER BODY
    if (!response.ok) {
      let data: any = null;

      try {
        data = await response.json();
      } catch {
      // ignoramos error de parseo
      }
      throw new Error(
     data?.error?.message ||
     data?.error ||
     data?.detail ||
     'Server error'
  );
    }

    // ✅ 2. SOLO SI ES OK, VALIDAR CONTENT-TYPE
    const contentType =
      response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('content-type')
        : null;

    if (!contentType || !contentType.includes('application/json')) {
      if (response.text) await response.text();
      throw new Error('Non-JSON response');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Server error');
  }
}


/**
 * Update order status through the API Gateway
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
): Promise<ApiResponse<{ success: boolean; id: string; status: string }>> {
  const response = await fetch(API_ENDPOINTS.UPDATE_ORDER_STATUS(orderId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al actualizar estado del pedido');
  }

  return data;
}
