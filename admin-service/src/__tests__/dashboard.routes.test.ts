import request from 'supertest';
import express from 'express';


import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

// Mock auth middleware - define BEFORE imports

// Helper to create admin token
const createAdminToken = () => {
  return jwt.sign({ sub: '123', email: 'admin@example.com', roles: ['admin'] }, JWT_SECRET, { expiresIn: '1h' });
};
jest.mock('../transport/http/middlewares/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = { id: decoded.sub, email: decoded.email, roles: decoded.roles || [] };
    }
    next();
  },
  requireRole: (_role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !req.user.roles.includes('admin')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      next();
    };
  },
}));

// Now import after mocking
import { dashboardRouter } from '../transport/http/routes/dashboard.routes';
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from './helpers/testDb';

jest.mock('../storage/mongo', () => ({
  getDb: () => getTestDb(),
}));

const app = express();
app.use(express.json());
app.use('/admin/dashboard', dashboardRouter);



describe('Dashboard Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /admin/dashboard/orders', () => {
    it('should return orders grouped by status', async () => {
      const db = getTestDb();
      await db.collection('orders').insertMany([
        { orderId: 1, status: 'pending', createdAt: new Date() },
        { orderId: 2, status: 'pending', createdAt: new Date() },
        { orderId: 3, status: 'completed', createdAt: new Date() },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.byStatus).toBeDefined();
      expect(response.body.data.recent).toBeDefined();

      const byStatus = response.body.data.byStatus;
      expect(byStatus.some((item: any) => item._id === 'pending' && item.count === 2)).toBe(true);
      expect(byStatus.some((item: any) => item._id === 'completed' && item.count === 1)).toBe(true);
    });

    it('should return recent orders sorted by createdAt descending', async () => {
      const db = getTestDb();
      const now = new Date();
      const orders = Array.from({ length: 15 }, (_, i) => ({
        orderId: i + 1,
        status: 'pending',
        createdAt: new Date(now.getTime() - i * 1000),
      }));
      await db.collection('orders').insertMany(orders);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.recent).toHaveLength(10); // Limit 10

      // Verify sorted descending
      const recent = response.body.data.recent;
      expect(recent[0].orderId).toBe(1); // Most recent
      expect(recent[9].orderId).toBe(10);
    });

    it('should return empty arrays when no orders exist', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.byStatus).toEqual([]);
      expect(response.body.data.recent).toEqual([]);
    });

    it('should reject requests without admin role', async () => {
      const token = jwt.sign({ sub: '123', email: 'user@example.com', roles: ['waiter'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .get('/admin/dashboard/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should handle multiple statuses correctly', async () => {
      const db = getTestDb();
      await db.collection('orders').insertMany([
        { orderId: 1, status: 'pending', createdAt: new Date() },
        { orderId: 2, status: 'preparing', createdAt: new Date() },
        { orderId: 3, status: 'ready', createdAt: new Date() },
        { orderId: 4, status: 'delivered', createdAt: new Date() },
        { orderId: 5, status: 'cancelled', createdAt: new Date() },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const byStatus = response.body.data.byStatus;
      expect(byStatus).toHaveLength(5);
      expect(byStatus.every((item: any) => item.count === 1)).toBe(true);
    });
  });

  describe('GET /admin/dashboard/metrics', () => {
    it('should return metrics with orders count and active products', async () => {
      const db = getTestDb();
      await db.collection('orders').insertMany([
        { orderId: 1, status: 'pending' },
        { orderId: 2, status: 'completed' },
      ]);
      await db.collection('products').insertMany([
        { id: 1, name: 'Product 1', enabled: true },
        { id: 2, name: 'Product 2', enabled: true },
        { id: 3, name: 'Product 3', enabled: false },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ordersCount).toBe(2);
      expect(response.body.data.activeProducts).toBe(2);
      expect(response.body.data.rabbit).toBeDefined();
      expect(response.body.data.rabbit.orders_new_depth).toBeNull();
    });

    it('should return zero counts when no data exists', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.ordersCount).toBe(0);
      expect(response.body.data.activeProducts).toBe(0);
    });

    it('should count only enabled products', async () => {
      const db = getTestDb();
      await db.collection('products').insertMany([
        { id: 1, name: 'Active 1', enabled: true },
        { id: 2, name: 'Active 2', enabled: true },
        { id: 3, name: 'Disabled 1', enabled: false },
        { id: 4, name: 'Disabled 2', enabled: false },
        { id: 5, name: 'Active 3', enabled: true },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activeProducts).toBe(3);
    });

    it('should reject requests without admin role', async () => {
      const token = jwt.sign({ sub: '123', email: 'user@example.com', roles: ['cook'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should include rabbit placeholder object', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rabbit).toEqual({ orders_new_depth: null });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for orders endpoint', async () => {
      const response = await request(app)
        .get('/admin/dashboard/orders');

      // Sin Authorization header, req.user no se setea
      expect([401, 403]).toContain(response.status);
    });

    it('should require authentication for metrics endpoint', async () => {
      const response = await request(app)
        .get('/admin/dashboard/metrics');

      expect([401, 403]).toContain(response.status);
    });
  });
});
