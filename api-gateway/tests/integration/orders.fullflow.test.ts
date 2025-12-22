import request from 'supertest';
import express, { Express } from 'express';
import { OrdersController } from '../../src/controllers/OrdersController';
import cookieParser from 'cookie-parser';
import { OrdersProxyService } from '../../src/services/OrdersProxyService';
import { verifyJWT } from '../../src/middlewares/auth';
import { errorHandler } from '../../src/middlewares/errorHandler';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

// Mock ProxyService
jest.mock('../../src/services/OrdersProxyService');

describe('Orders Full Flow Integration Tests', () => {
  let app: Express;
  let mockProxyService: jest.Mocked<OrdersProxyService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    mockProxyService = new OrdersProxyService() as jest.Mocked<OrdersProxyService>;
    const ordersController = new OrdersController(mockProxyService);

    // Setup routes
    app.post('/api/orders', verifyJWT, ordersController.createOrder);
    app.get('/api/orders/:id', verifyJWT, ordersController.getOrder);
    app.put('/api/orders/:id', verifyJWT, ordersController.updateOrder);

    // Error handler
    app.use(errorHandler);
  });

  const createToken = (roles: string[] = ['waiter']) => {
    return jwt.sign(
      { sub: '123', email: 'test@example.com', roles },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  describe('Complete order lifecycle', () => {
    it('should create, get, and update an order', async () => {
      const token = createToken(['waiter']);
      const orderId = 'order-123';

      // 1. Create order
      mockProxyService.forward = jest.fn().mockResolvedValueOnce({
        data: { orderId, status: 'pending', items: [] },
        status: 201,
      });

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          items: [{ productId: 1, quantity: 2 }],
          tableNumber: 5,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // 2. Get order
      mockProxyService.forward = jest.fn().mockResolvedValueOnce({
        data: { orderId, status: 'pending', items: [] },
        status: 200,
      });

      const getResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', [`accessToken=${token}`]);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);

      // 3. Update order
      mockProxyService.forward = jest.fn().mockResolvedValueOnce({
        data: { orderId, status: 'preparing', items: [] },
        status: 200,
      });

      const updateResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Cookie', [`accessToken=${token}`])
        .send({ status: 'preparing' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
    });
  });

  describe('Error scenarios', () => {
    it('should handle service unavailable during order creation', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockRejectedValue({
        code: 'ECONNREFUSED',
      });

      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${token}`])
        .send({ items: [], tableNumber: 1 });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('unavailable');
    });

    it('should handle timeout during order retrieval', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockRejectedValue({
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'timeout',
      });

      const response = await request(app)
        .get('/api/orders/123')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
    });

    it('should handle 404 not found from microservice', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Order not found' },
        },
      });

      const response = await request(app)
        .get('/api/orders/nonexistent')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors from microservice', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid order data' },
        },
      });

      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${token}`])
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication integration', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ items: [], tableNumber: 1 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', ['accessToken=invalid-token'])
        .send({ items: [], tableNumber: 1 });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${expiredToken}`])
        .send({ items: [], tableNumber: 1 });

      expect(response.status).toBe(401);
    });
  });

  describe('Request/Response flow', () => {
    it('should pass headers through proxy service', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockResolvedValue({
        data: { orderId: '123' },
        status: 201,
      });

      await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${token}`])
        .set('X-Custom-Header', 'test-value')
        .send({ items: [] });

      expect(mockProxyService.forward).toHaveBeenCalledWith(
        '/api/v1/orders/',
        'POST',
        { items: [] },
        expect.objectContaining({
          cookie: `accessToken=${token}`,
          'x-custom-header': 'test-value',
        })
      );
    });

    it('should maintain response data structure', async () => {
      const token = createToken(['waiter']);
      const orderData = {
        orderId: '123',
        items: [{ productId: 1, quantity: 2, name: 'Pizza' }],
        status: 'pending',
        tableNumber: 5,
        total: 25.99,
      };

      mockProxyService.forward = jest.fn().mockResolvedValue({
        data: orderData,
        status: 201,
      });

      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${token}`])
        .send({ items: [{ productId: 1, quantity: 2 }] });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(orderData);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const token = createToken(['waiter']);
      mockProxyService.forward = jest.fn().mockResolvedValue({
        data: { orderId: '123' },
        status: 201,
      });

      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/orders')
          .set('Cookie', [`accessToken=${token}`])
          .send({ items: [], tableNumber: i })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      expect(mockProxyService.forward).toHaveBeenCalledTimes(5);
    });
  });
});
