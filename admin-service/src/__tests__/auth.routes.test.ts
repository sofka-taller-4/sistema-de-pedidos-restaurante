import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from '../transport/http/routes/auth.routes';
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb, waitForMongo } from './helpers/testDb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/admin/auth', authRouter);

// Mock getDb para que use la del test
jest.mock('../storage/mongo', () => ({
  getDb: () => getTestDb(),
}));

// Mismos secretos que en tu código o defaults
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /admin/auth/login', () => {
    it('should login with valid credentials and set HttpOnly cookie', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // ✅ Esperar a que MongoDB procese la inserción
      await waitForMongo();

      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'test@example.com', password: 'password123', _encrypted: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // ✅ No token in response body
      expect(response.body.token).toBeUndefined();

      // ✅ User data in response
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.roles).toEqual(['admin']);

      // ✅ Verify HttpOnly cookies are set (access + refresh)
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const accessTokenCookie = cookies.find((cookie: string) => cookie.startsWith('accessToken='));
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Lax');

      const refreshTokenCookie = cookies.find((cookie: string) => cookie.startsWith('refreshToken='));
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/admin/auth/refresh');

      // ✅ Verify access token in cookie is valid
      const tokenMatch = (/accessToken=([^;]+)/).exec(accessTokenCookie!);
      expect(tokenMatch).toBeTruthy();
      const token = tokenMatch![1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roles).toEqual(['admin']);

      // ✅ Verify refresh token was saved in database
      await waitForMongo(); // Esperar a que el refresh token se guarde
      const savedRefreshToken = await db.collection('refresh_tokens').findOne({
        userId: String(decoded.sub)
      });
      expect(savedRefreshToken).toBeDefined();
      expect(savedRefreshToken?.token).toBeDefined();
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should reject login with short password (less than 6 chars)', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'test@example.com', password: '12345', _encrypted: false });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123', _encrypted: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with inactive user', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        name: 'Inactive User',
        email: 'inactive@example.com',
        passwordHash,
        roles: ['admin'],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'inactive@example.com', password: 'password123', _encrypted: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with wrong password', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword', _encrypted: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should include all user roles in cookie token', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        name: 'Multi-Role User',
        email: 'multirole@example.com',
        passwordHash,
        roles: ['admin', 'waiter', 'cook'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // ✅ Esperar a que MongoDB procese la inserción
      await waitForMongo();

      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'multirole@example.com', password: 'password123', _encrypted: false });

      expect(response.status).toBe(200);

      // ✅ Extract token from cookie
      const cookies = response.headers['set-cookie'] as unknown as string[];
      const accessTokenCookie = cookies.find((cookie: string) => cookie.startsWith('accessToken='));
      const tokenMatch = (/accessToken=([^;]+)/).exec(accessTokenCookie!);
      const token = tokenMatch![1];

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.roles).toEqual(['admin', 'waiter', 'cook']);
    });

    it('should not include passwordHash in response', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await waitForMongo();

      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'test@example.com', password: 'password123', _encrypted: false });

      expect(response.status).toBe(200);
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should handle case-sensitive email correctly', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // MongoDB es case-sensitive por defecto
      const response = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'TEST@EXAMPLE.COM', password: 'password123', _encrypted: false });

      expect(response.status).toBe(401); // No coincide exactamente
    });
  });

  describe('POST /admin/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // ✅ Insertar usuario con createdAt y updatedAt
      const userResult = await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userId = String(userResult.insertedId);

      // ✅ Crear el refresh token JWT
      const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // ✅ CRÍTICO: Insertar el refresh token en la colección refresh_tokens
      await db.collection('refresh_tokens').insertOne({
        userId: userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      // ✅ Ahora hacer la petición con el token en cookie
      const refreshResponse = await request(app)
        .post('/admin/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);

      // ✅ Verify new access token is set
      const newCookies = refreshResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(newCookies)).toBe(true);
      const newAccessTokenCookie = newCookies.find((cookie: string) => cookie.startsWith('accessToken='));
      expect(newAccessTokenCookie).toBeDefined();
      expect(newAccessTokenCookie).toContain('HttpOnly');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/admin/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject when no refresh token provided', async () => {
      const response = await request(app)
        .post('/admin/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No refresh token');
    });

    it('should reject refresh token not in database', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const userResult = await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userId = String(userResult.insertedId);

      // ✅ Crear token válido pero NO insertarlo en la base de datos
      const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // No insertar en refresh_tokens - esto simulará un token revocado

      const response = await request(app)
        .post('/admin/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject refresh token for disabled user', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const userResult = await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: false, // ✅ Usuario deshabilitado
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userId = String(userResult.insertedId);

      const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await db.collection('refresh_tokens').insertOne({
        userId: userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/admin/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User disabled');

      // ✅ Verificar que el token fue revocado
      const revokedToken = await db.collection('refresh_tokens').findOne({
        userId: userId,
        token: refreshToken
      });
      expect(revokedToken).toBeNull();
    });
  });

  describe('POST /admin/auth/logout', () => {
    it('should clear both access and refresh tokens', async () => {
      const response = await request(app)
        .post('/admin/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // ✅ Verify both cookies are cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const clearAccessCookie = cookies.find((cookie: string) => cookie.startsWith('accessToken='));
      expect(clearAccessCookie).toBeDefined();
      expect(clearAccessCookie).toContain('accessToken=;');

      const clearRefreshCookie = cookies.find((cookie: string) => cookie.startsWith('refreshToken='));
      expect(clearRefreshCookie).toBeDefined();
      expect(clearRefreshCookie).toContain('refreshToken=;');
    });

    it('should revoke refresh token from database on logout', async () => {
      const db = getTestDb();
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const userResult = await db.collection('users').insertOne({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        roles: ['admin'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userId = String(userResult.insertedId);

      const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await db.collection('refresh_tokens').insertOne({
        userId: userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      // ✅ Verificar que el token existe antes del logout
      const tokenBefore = await db.collection('refresh_tokens').findOne({ token: refreshToken });
      expect(tokenBefore).toBeDefined();

      // ✅ Hacer logout con el refresh token
      await request(app)
        .post('/admin/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`);

      // ✅ Verificar que el token fue eliminado de la base de datos
      const tokenAfter = await db.collection('refresh_tokens').findOne({ token: refreshToken });
      expect(tokenAfter).toBeNull();
    });
  });
});