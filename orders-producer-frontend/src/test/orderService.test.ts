import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOrder,
  getOrderById,
  getKitchenOrders,
  updateOrder,
  updateOrderStatus,
} from '../services/orderService';
import { API_ENDPOINTS } from '../config/api';
import type { OrderPayload, ApiOrder } from '../types/order';

describe('Order Service', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order successfully', async () => {
      const orderData: OrderPayload = {
        customerName: 'John Doe',
        table: '5',
        items: [
          { productName: 'Pizza', quantity: 2, unitPrice: 100, note: '' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: '1', ...orderData, status: 'pending' },
        }),
      });

      const result = await createOrder(orderData);

      expect(mockFetch).toHaveBeenCalledWith(
        API_ENDPOINTS.CREATE_ORDER,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors when creating order fails', async () => {
      const orderData: OrderPayload = {
        customerName: 'Jane',
        table: '1',
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Order validation failed' },
        }),
      });

      await expect(createOrder(orderData)).rejects.toThrow(
        'Order validation failed'
      );
    });

    it('should throw generic error if no specific error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(
        createOrder({ customerName: 'test', table: '1', items: [] })
      ).rejects.toThrow('Error al crear pedido');
    });

    it('should create order with multiple items', async () => {
      const orderData: OrderPayload = {
        customerName: 'Multi Item',
        table: '3',
        items: [
          { productName: 'Pizza', quantity: 1, unitPrice: 100 },
          { productName: 'Coke', quantity: 2, unitPrice: 30 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: '2', ...orderData },
        }),
      });

      const result = await createOrder(orderData);
      expect(result.success).toBe(true);
    });
  });

  describe('getOrderById', () => {
    it('should fetch order by ID successfully', async () => {
      const orderId = 'order-123';
      const mockOrder: Partial<ApiOrder> = {
        id: orderId,
        customerName: 'John',
        table: '5',
        status: 'preparing',
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockOrder }),
      });

      const result = await getOrderById(orderId);

      expect(mockFetch).toHaveBeenCalledWith(API_ENDPOINTS.GET_ORDER(orderId));
      expect(result.data).toEqual(mockOrder);
    });

    it('should handle errors when fetching order fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Order not found' },
        }),
      });

      await expect(getOrderById('invalid-id')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should throw generic error if order fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(getOrderById('123')).rejects.toThrow('Error al obtener pedido');
    });
  });

  describe('getKitchenOrders', () => {
    it('should fetch kitchen orders successfully', async () => {
      const mockOrders: Partial<ApiOrder>[] = [
        {
          id: '1',
          customerName: 'Customer 1',
          table: '1',
          status: 'pending',
          items: [],
        },
        {
          id: '2',
          customerName: 'Customer 2',
          table: '2',
          status: 'preparing',
          items: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockOrders }),
      });

      const result = await getKitchenOrders();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.KITCHEN_ORDERS)
      );
      expect(result.data).toEqual(mockOrders);
      expect(result.data).toHaveLength(2);
    });

    it('should handle errors when fetching kitchen orders fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Failed to fetch orders' },
        }),
      });

      await expect(getKitchenOrders()).rejects.toThrow('Failed to fetch orders');
    });

    it('should handle empty kitchen orders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const result = await getKitchenOrders();
      expect(result.data).toEqual([]);
    });
  });

  describe('updateOrder', () => {
    it('should update order successfully', async () => {
      const orderId = 'order-123';
      const updates = {
        customerName: 'Jane Doe',
        table: '10',
        items: [{ productName: 'Burger', quantity: 1, unitPrice: 50 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true, data: { id: orderId, ...updates } }),
      });

      const result = await updateOrder(orderId, updates);

      expect(mockFetch).toHaveBeenCalledWith(
        API_ENDPOINTS.UPDATE_ORDER(orderId),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle non-JSON response content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        status: 200,
        text: async () => '<html>Error page</html>',
      });

      await expect(
        updateOrder('123', { customerName: 'test' })
      ).rejects.toThrow('Non-JSON response');
    });

    it('should handle update errors with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: { message: 'Update failed' } }),
      });

      await expect(
        updateOrder('123', { customerName: 'test' })
      ).rejects.toThrow('Update failed');
    });

    it('should handle update with null or missing content-type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        status: 200,
        text: async () => 'error',
      });

      await expect(
        updateOrder('123', { customerName: 'test' })
      ).rejects.toThrow('Non-JSON response');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status to preparing', async () => {
      const orderId = 'order-456';
      const status = 'preparing' as const;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, id: orderId, status },
        }),
      });

      const result = await updateOrderStatus(orderId, status);

      expect(mockFetch).toHaveBeenCalledWith(
        API_ENDPOINTS.UPDATE_ORDER_STATUS(orderId),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
      );
      expect(result.data.status).toBe('preparing');
    });

    it('should update order status to ready', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, id: '123', status: 'ready' },
        }),
      });

      const result = await updateOrderStatus('123', 'ready');
      expect(result.data.status).toBe('ready');
    });

    it('should update order status to completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, id: '123', status: 'completed' },
        }),
      });

      const result = await updateOrderStatus('123', 'completed');
      expect(result.data.status).toBe('completed');
    });

    it('should update order status to cancelled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, id: '123', status: 'cancelled' },
        }),
      });

      const result = await updateOrderStatus('123', 'cancelled');
      expect(result.data.status).toBe('cancelled');
    });

    it('should handle status update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Status update failed' },
        }),
      });

      await expect(updateOrderStatus('123', 'ready')).rejects.toThrow(
        'Status update failed'
      );
    });

    it('should throw generic error for failed status update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(updateOrderStatus('123', 'pending')).rejects.toThrow(
        'Error al actualizar estado del pedido'
      );
    });

    it('should handle pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, id: '123', status: 'pending' },
        }),
      });

      const result = await updateOrderStatus('123', 'pending');
      expect(result.data.status).toBe('pending');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle fetch network errors on create', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        createOrder({ customerName: 'test', table: '1', items: [] })
      ).rejects.toThrow('Network error');
    });

    it('should handle fetch network errors on get order', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getOrderById('123')).rejects.toThrow('Network error');
    });

    it('should handle malformed error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Server error' }),
      });

      await expect(
        updateOrder('123', { customerName: 'test' })
      ).rejects.toThrow('Server error');
    });
  });
});
