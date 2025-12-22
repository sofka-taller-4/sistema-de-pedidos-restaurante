import { Request, Response, NextFunction } from 'express';
import { KitchenController } from '../../src/controllers/KitchenController';
import { KitchenProxyService } from '../../src/services/KitchenProxyService';

jest.mock('../../src/services/KitchenProxyService');

describe('KitchenController - Unit Tests', () => {
  let controller: KitchenController;
  let mockProxyService: jest.Mocked<KitchenProxyService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockProxyService = new KitchenProxyService() as jest.Mocked<KitchenProxyService>;
    controller = new KitchenController(mockProxyService);

    mockReq = {
      body: {},
      params: {},
      headers: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('updateOrderStatus', () => {
    it('should validate valid status and forward to kitchen service', async () => {
      const validStatuses = ['pending', 'preparing', 'ready', 'completed'];
      
      for (const status of validStatuses) {
        mockReq.params = { id: '123' };
        mockReq.body = { status };

        mockProxyService.forward = jest.fn().mockResolvedValue({
          data: { orderId: '123', status },
          status: 200,
        });

        await controller.updateOrderStatus(mockReq as Request, mockRes as Response, mockNext);

        expect(mockProxyService.forward).toHaveBeenCalledWith(
          '/kitchen/orders/123',
          'PATCH',
          { status }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({ status }),
          })
        );
      }
    });

    it('should reject invalid status with 400', async () => {
      const invalidStatuses = ['invalid', 'unknown', 'cancelled', ''];
      
      for (const status of invalidStatuses) {
        mockReq.params = { id: '123' };
        mockReq.body = { status };

        await controller.updateOrderStatus(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      }
    });
  });

  describe('getOrders', () => {
    it('should filter orders by status when status query parameter is provided', async () => {
      const status = 'preparing';
      mockReq.query = { status };

      const mockOrders = [
        { orderId: '1', status: 'preparing' },
        { orderId: '2', status: 'preparing' },
      ];

      mockProxyService.forward = jest.fn().mockResolvedValue({
        data: mockOrders,
        status: 200,
      });

      await controller.getOrders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProxyService.forward).toHaveBeenCalledWith(
        '/kitchen/orders?status=preparing',
        'GET'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockOrders,
        })
      );
    });
  });

  describe('updateOrder', () => {
    it('should handle service unavailable error with 503', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = { status: 'ready' };

      const error = new Error('Service unavailable');
      (error as any).response = { status: 503 };
      mockProxyService.forward = jest.fn().mockRejectedValue(error);

      await controller.updateOrder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should calculate estimated time when preparation time is provided', async () => {
      mockReq.params = { id: '123' };
      const preparationTime = 30; // 30 minutos
      mockReq.body = { preparationTime };

      mockProxyService.forward = jest.fn().mockResolvedValue({
        data: { orderId: '123', estimatedTime: expect.any(Number) },
        status: 200,
      });

      await controller.updateOrder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProxyService.forward).toHaveBeenCalledWith(
        '/kitchen/orders/123',
        'PUT',
        mockReq.body,
        mockReq.headers
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            estimatedTime: expect.any(Number),
          }),
        })
      );
    });
  });
});
