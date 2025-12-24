import request from 'supertest';
import express from 'express';


import jwt from 'jsonwebtoken';

const createAdminToken = () => {
  return jwt.sign({ sub: '123', email: 'admin@example.com', roles: ['admin'] }, JWT_SECRET, { expiresIn: '1h' });
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

// Mock auth middleware
jest.mock('../transport/http/middlewares/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = { id: decoded.sub, email: decoded.email, roles: decoded.roles || [] };
    }
    next();
  },
  requireRole: (role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !req.user.roles.includes(role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      next();
    };
  },
}));

import { productsRouter } from '../transport/http/routes/products.routes';
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb, waitForMongo } from './helpers/testDb';

jest.mock('../storage/mongo', () => ({
  getDb: () => getTestDb(),
}));

const app = express();
app.use(express.json());
app.use('/admin/products', productsRouter);



describe('Products Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /admin/products - Create product', () => {
    it('should create a new product with valid data', async () => {
      const token = createAdminToken();
      const productData = {
        id: 1,
        name: 'Pizza Margherita',
        price: 12.99,
        description: 'Classic pizza',
        image: 'pizza.jpg',
        enabled: true,
        category: 'pizzas',
        preparationTime: 15,
      };

      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Pizza Margherita');
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should reject duplicate product name', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Existing Product',
        price: 10,
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 2,
          name: 'Existing Product',
          price: 15,
          preparationTime: 10,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Duplicate product (name)');
    });

    it('should reject product with short name', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 1,
          name: 'A',
          price: 10,
          preparationTime: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject product with negative price', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 1,
          name: 'Product',
          price: -5,
          preparationTime: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject product without preparationTime', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 1,
          name: 'Product',
          price: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should use default values for optional fields', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Minimal Product',
          price: 5,
          preparationTime: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.description).toBe('');
      expect(response.body.data.image).toBe('');
      expect(response.body.data.enabled).toBe(true);
    });

    it('should require admin role', async () => {
      const waiterToken = jwt.sign({ sub: '123', email: 'waiter@example.com', roles: ['waiter'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Product',
          price: 10,
          preparationTime: 10,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /admin/products - List all products (admin)', () => {
    it('should list all products for admin', async () => {
      const db = getTestDb();
      await db.collection('products').insertMany([
        { id: 1, name: 'Product 1', price: 10, enabled: true, preparationTime: 10 },
        { id: 2, name: 'Product 2', price: 20, enabled: false, preparationTime: 15 },
        { id: 3, name: 'Product 3', price: 30, enabled: true, preparationTime: 20 },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should sort products by id ascending', async () => {
      const db = getTestDb();
      await db.collection('products').insertMany([
        { id: 3, name: 'Product 3', price: 30, preparationTime: 10 },
        { id: 1, name: 'Product 1', price: 10, preparationTime: 10 },
        { id: 2, name: 'Product 2', price: 20, preparationTime: 10 },
      ]);

      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const products = response.body.data;
      expect(products[0].id).toBe(1);
      expect(products[1].id).toBe(2);
      expect(products[2].id).toBe(3);
    });

    it('should return empty array when no products exist', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .get('/admin/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should require admin role', async () => {
      const cookToken = jwt.sign({ sub: '123', email: 'cook@example.com', roles: ['cook'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .get('/admin/products')
        .set('Authorization', `Bearer ${cookToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /admin/products/active - List active products (public)', () => {
    it('should list only enabled products without authentication', async () => {
      const db = getTestDb();
      await db.collection('products').insertMany([
        { id: 1, name: 'Active 1', price: 10, enabled: true, preparationTime: 10 },
        { id: 2, name: 'Disabled', price: 20, enabled: false, preparationTime: 10 },
        { id: 3, name: 'Active 2', price: 30, enabled: true, preparationTime: 10 },
      ]);

      const response = await request(app)
        .get('/admin/products/active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((p: any) => p.enabled === true)).toBe(true);
    });

    it('should return empty array when no active products exist', async () => {
      const db = getTestDb();
      await db.collection('products').insertMany([
        { id: 1, name: 'Disabled 1', price: 10, enabled: false, preparationTime: 10 },
        { id: 2, name: 'Disabled 2', price: 20, enabled: false, preparationTime: 10 },
      ]);

      const response = await request(app)
        .get('/admin/products/active');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('PUT /admin/products/:id - Update product', () => {
    it('should update product name', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Old Name',
        price: 10,
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .put('/admin/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.name).toBe('New Name');
    });

    it('should update multiple fields at once', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        description: 'Old desc',
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .put('/admin/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Product',
          price: 15,
          description: 'New description',
        });

      expect(response.status).toBe(200);

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.name).toBe('Updated Product');
      expect(updated?.price).toBe(15);
      expect(updated?.description).toBe('New description');
    });

    it('should return 404 for non-existent product', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .put('/admin/products/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Product not found');
    });

    it('should reject invalid product id', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .put('/admin/products/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid id');
    });

    it('should update updatedAt timestamp', async () => {
      const db = getTestDb();
      const oldDate = new Date('2020-01-01');
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        preparationTime: 10,
        updatedAt: oldDate,
      });

      const token = createAdminToken();
      await request(app)
        .put('/admin/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 15 });

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.updatedAt).not.toEqual(oldDate);
    });

    it('should require admin role', async () => {
      const waiterToken = jwt.sign({ sub: '123', email: 'waiter@example.com', roles: ['waiter'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .put('/admin/products/1')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ price: 20 });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /admin/products/:id/toggle - Toggle enabled status', () => {
    it('should toggle product from enabled to disabled', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        enabled: true,
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .patch('/admin/products/1/toggle')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.enabled).toBe(false);
    });

    it('should toggle product from disabled to enabled', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        enabled: false,
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .patch('/admin/products/1/toggle')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.enabled).toBe(true);
    });

    it('should return 404 for non-existent product', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .patch('/admin/products/999/toggle')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Product not found');
    });

    it('should reject invalid product id', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .patch('/admin/products/invalid/toggle')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid id');
    });

    it('should update updatedAt timestamp', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        enabled: true,
        preparationTime: 10,
      });

      const token = createAdminToken();
      await request(app)
        .patch('/admin/products/1/toggle')
        .set('Authorization', `Bearer ${token}`);

      const updated = await db.collection('products').findOne({ id: 1 });
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should require admin role', async () => {
      const cookToken = jwt.sign({ sub: '123', email: 'cook@example.com', roles: ['cook'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .patch('/admin/products/1/toggle')
        .set('Authorization', `Bearer ${cookToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /admin/products/:id - Delete product', () => {
    it('should delete existing product', async () => {
      const db = getTestDb();
      await db.collection('products').insertOne({
        id: 1,
        name: 'Product',
        price: 10,
        preparationTime: 10,
      });

      const token = createAdminToken();
      const response = await request(app)
        .delete('/admin/products/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted');

      const deleted = await db.collection('products').findOne({ id: 1 });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .delete('/admin/products/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Product not found');
    });

    it('should reject invalid product id', async () => {
      const token = createAdminToken();
      const response = await request(app)
        .delete('/admin/products/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid id');
    });

    it('should require admin role', async () => {
      const waiterToken = jwt.sign({ sub: '123', email: 'waiter@example.com', roles: ['waiter'] }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .delete('/admin/products/1')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(response.status).toBe(403);
    });
  });
});
