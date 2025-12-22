import request from 'supertest';
import express from 'express';
import { usersRouter } from '../transport/http/routes/users.routes';
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from './helpers/testDb';
// import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Mock storage/mongo to use test database
jest.mock('../storage/mongo', () => ({
  getDb: () => require('./helpers/testDb').getTestDb()
}));

// Mock auth middleware for protected routes
jest.mock('../transport/http/middlewares/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    req.userRoles = ['admin'];
    next();
  },
  requireRole: (role: string) => (req: any, res: any, next: any) => {
    if (req.userRoles?.includes(role)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Forbidden' });
    }
  }
}));

describe('Users Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    await setupTestDatabase();
    app = express();
    app.use(express.json());
    app.use('/admin/users', usersRouter);
  }, 30000); // Timeout aumentado a 30 segundos

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('PUT /:id/password', () => {
    it('should update password for existing user (unauthenticated)', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        email: 'user@test.com',
        passwordHash: await bcrypt.hash('oldpassword', 10),
        name: 'Test User',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}/password`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated');

      // Verify password was actually updated
      const user = await db.collection('users').findOne({ _id: userId });
      const isMatch = await bcrypt.compare('newpassword123', user?.passwordHash as string);
      expect(isMatch).toBe(true);
    });

    it('should reject short password', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        email: 'user@test.com',
        passwordHash: 'hash',
        name: 'Test User',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}/password`)
        .send({ password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 6 characters');
    });

    it('should reject invalid user ID format', async () => {
      const response = await request(app)
        .put('/admin/users/invalid-id/password')
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new ObjectId();
      const response = await request(app)
        .put(`/admin/users/${fakeId.toString()}/password`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /', () => {
    it('should create new user with valid data (admin auth required)', async () => {
      const response = await request(app)
        .post('/admin/users')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
          roles: ['waiter']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'New User',
        email: 'newuser@test.com',
        roles: ['waiter'],
        active: true
      });
      expect(response.body.data).toHaveProperty('id');

      // Verify user exists in database
      const db = getTestDb();
      const user = await db.collection('users').findOne({ email: 'newuser@test.com' });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('New User');
    });

    it('should reject duplicate email', async () => {
      const db = getTestDb();
      await db.collection('users').insertOne({
        name: 'Existing User',
        email: 'existing@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/admin/users')
        .send({
          name: 'New User',
          email: 'existing@test.com',
          password: 'password123',
          roles: ['waiter']
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/admin/users')
        .send({
          name: 'New User',
          email: 'not-an-email',
          password: 'password123',
          roles: ['waiter']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should reject short name', async () => {
      const response = await request(app)
        .post('/admin/users')
        .send({
          name: 'A',
          email: 'user@test.com',
          password: 'password123',
          roles: ['waiter']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should use default role "waiter" if not provided', async () => {
      const response = await request(app)
        .post('/admin/users')
        .send({
          name: 'Default Role User',
          email: 'default@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.roles).toEqual(['waiter']);
    });
  });

  describe('GET /', () => {
    beforeEach(async () => {
      const db = getTestDb();
      await db.collection('users').insertMany([
        { name: 'Alice Admin', email: 'alice@test.com', passwordHash: 'hash', roles: ['admin'], active: true, createdAt: new Date('2024-01-01') },
        { name: 'Bob Waiter', email: 'bob@test.com', passwordHash: 'hash', roles: ['waiter'], active: true, createdAt: new Date('2024-01-02') },
        { name: 'Charlie Cook', email: 'charlie@test.com', passwordHash: 'hash', roles: ['cook'], active: false, createdAt: new Date('2024-01-03') },
        { name: 'Diana Multi', email: 'diana@test.com', passwordHash: 'hash', roles: ['waiter', 'cook'], active: true, createdAt: new Date('2024-01-04') }
      ]);
    });

    it('should list all users (admin auth required)', async () => {
      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      // Should be sorted by createdAt descending
      expect(response.body.data[0].name).toBe('Diana Multi');
    });

    it('should filter users by role', async () => {
      const response = await request(app).get('/admin/users?role=admin');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Alice Admin');
    });

    it('should filter users by active status', async () => {
      const response = await request(app).get('/admin/users?active=false');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Charlie Cook');
    });

    it('should filter users by name (case-insensitive)', async () => {
      const response = await request(app).get('/admin/users?name=alice');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Alice Admin');
    });

    it('should not expose passwordHash field', async () => {
      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('passwordHash');
      });
    });
  });

  describe('PUT /:id', () => {
    it('should update user name', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'Old Name',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated');

      const user = await db.collection('users').findOne({ _id: userId });
      expect(user?.name).toBe('New Name');
    });

    it('should update user active status', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}`)
        .send({ active: false });

      expect(response.status).toBe(200);
      const user = await db.collection('users').findOne({ _id: userId });
      expect(user?.active).toBe(false);
    });

    it('should update user password and hash it', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      const oldHash = await bcrypt.hash('oldpassword', 10);
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: oldHash,
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(200);

      const user = await db.collection('users').findOne({ _id: userId });
      expect(user?.passwordHash).not.toBe(oldHash);
      const isMatch = await bcrypt.compare('newpassword123', user?.passwordHash as string);
      expect(isMatch).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new ObjectId();
      const response = await request(app)
        .put(`/admin/users/${fakeId.toString()}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should reject invalid payload', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .put(`/admin/users/${userId.toString()}`)
        .send({ name: 'X' }); // Name too short

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid payload');
    });
  });

  describe('PATCH /:id/role', () => {
    it('should update user roles', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .patch(`/admin/users/${userId.toString()}/role`)
        .send({ roles: ['waiter', 'cook'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Roles updated');

      const user = await db.collection('users').findOne({ _id: userId });
      expect(user?.roles).toEqual(['waiter', 'cook']);
    });

    it('should reject empty roles array', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .patch(`/admin/users/${userId.toString()}/role`)
        .send({ roles: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should reject invalid role', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User',
        email: 'user@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .patch(`/admin/users/${userId.toString()}/role`)
        .send({ roles: ['invalid-role'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid payload');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete existing user', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'User to Delete',
        email: 'delete@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .delete(`/admin/users/${userId.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted');

      const user = await db.collection('users').findOne({ _id: userId });
      expect(user).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new ObjectId();
      const response = await request(app)
        .delete(`/admin/users/${fakeId.toString()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /email/:email', () => {
    it('should find user by email (unauthenticated)', async () => {
      const db = getTestDb();
      await db.collection('users').insertOne({
        name: 'Email User',
        email: 'find@test.com',
        passwordHash: 'secret-hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/admin/users/email/find@test.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('find@test.com');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should handle URL-encoded emails', async () => {
      const db = getTestDb();
      await db.collection('users').insertOne({
        name: 'Special Email User',
        email: 'user+test@test.com',
        passwordHash: 'hash',
        roles: ['waiter'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/admin/users/email/' + encodeURIComponent('user+test@test.com'));

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('user+test@test.com');
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get('/admin/users/email/nonexistent@test.com');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /:id', () => {
    it('should get user by ID (unauthenticated)', async () => {
      const db = getTestDb();
      const userId = new ObjectId();
      await db.collection('users').insertOne({
        _id: userId,
        name: 'ID User',
        email: 'id@test.com',
        passwordHash: 'secret-hash',
        roles: ['cook'],
        active: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/admin/users/${userId.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('ID User');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/admin/users/invalid-id-format');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = new ObjectId();
      const response = await request(app)
        .get(`/admin/users/${fakeId.toString()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});
