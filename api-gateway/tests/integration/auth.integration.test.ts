import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { verifyJWT, requireRole } from '../../src/middlewares/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

describe('Auth Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser()); // ✅ Required for cookie-based auth

    // Protected routes
    app.get('/api/public', (_req, res) => {
      res.json({ message: 'Public endpoint' });
    });

    app.get('/api/authenticated', verifyJWT, (_req, res) => {
      res.json({ message: 'Authenticated endpoint', user: _req.user });
    });

    app.get('/api/admin', verifyJWT, requireRole('admin'), (_req, res) => {        
      res.json({ message: 'Admin endpoint', user: _req.user });
    });

    app.get('/api/waiter', verifyJWT, requireRole('waiter'), (_req, res) => {      
      res.json({ message: 'Waiter endpoint', user: _req.user });
    });
  });

  describe('Public endpoint', () => {
    it('should allow access without authentication', async () => {
      const response = await request(app).get('/api/public');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Public endpoint');
    });
  });

  describe('Authenticated endpoint', () => {
    it('should allow access with valid token', async () => {
      const token = jwt.sign(
        { sub: '123', email: 'user@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/authenticated')
        .set('Cookie', [`accessToken=${token}`]); // ✅ Use cookie instead of header   

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Authenticated endpoint');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('user@example.com');
    });

    it('should deny access without token', async () => {
      const response = await request(app).get('/api/authenticated');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/authenticated')
        .set('Cookie', ['accessToken=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should deny access with expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'user@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/authenticated')
        .set('Cookie', [`accessToken=${expiredToken}`]);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('Role-based access control', () => {
    it('should allow admin to access admin endpoint', async () => {
      const token = jwt.sign(
        { sub: '123', email: 'admin@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin endpoint');
    });

    it('should deny waiter access to admin endpoint', async () => {
      const token = jwt.sign(
        { sub: '123', email: 'waiter@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden');
    });

    it('should allow waiter to access waiter endpoint', async () => {
      const token = jwt.sign(
        { sub: '456', email: 'waiter@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/waiter')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Waiter endpoint');
    });

    it('should allow multi-role user to access any endpoint', async () => {
      const token = jwt.sign(
        { sub: '789', email: 'multi@example.com', roles: ['admin', 'waiter'] },    
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const adminResponse = await request(app)
        .get('/api/admin')
        .set('Cookie', [`accessToken=${token}`]);
      expect(adminResponse.status).toBe(200);

      const waiterResponse = await request(app)
        .get('/api/waiter')
        .set('Cookie', [`accessToken=${token}`]);
      expect(waiterResponse.status).toBe(200);
    });

    it('should handle user with no roles', async () => {
      const token = jwt.sign(
        { sub: '999', email: 'noroles@example.com', roles: [] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden');
    });
  });
});
