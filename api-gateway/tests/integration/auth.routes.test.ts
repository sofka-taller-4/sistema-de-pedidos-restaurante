import request from 'supertest';
import express, { Express } from 'express';
import authRouter from '../../src/routes/auth.routes';
import jwt from 'jsonwebtoken';
import * as UserService from '../../src/services/UserService';
import * as emailService from '../../src/utils/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

jest.mock('../../src/services/UserService');
jest.mock('../../src/utils/emailService');

describe('Auth Routes - forgot-password', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  it('should send reset email when user exists', async () => {
    const mockUser = {
      success: true,
      data: { id: '123', email: 'user@example.com', name: 'Test User' }
    };

    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (emailService.sendEmail as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalled();
  });

  it('should call sendEmail with correct parameters', async () => {
    const mockUser = {
      success: true,
      data: { id: '123', email: 'user@example.com', name: 'Test User' }
    };

    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (emailService.sendEmail as jest.Mock).mockResolvedValue(true);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.any(String),
        html: expect.any(String)
      })
    );
  });

  it('should include reset link in email', async () => {
    const mockUser = {
      success: true,
      data: { id: '123', email: 'user@example.com', name: 'Test User' }
    };

    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (emailService.sendEmail as jest.Mock).mockResolvedValue(true);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });

    const emailCall = (emailService.sendEmail as jest.Mock).mock.calls[0][0];
    expect(emailCall.html).toContain('reset-password');
  });

  it('should return 400 when email is empty', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when user does not exist', async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({
      success: false,
      data: null
    });

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 500 when user has no id field', async () => {
    const mockUser = {
      success: true,
      data: { email: 'user@example.com', name: 'Test User' }
    };

    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth Routes - reset-password', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  it('should reset password with valid token', async () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { id: '123', email: 'user@example.com', _id: '123' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (UserService.updateUserPassword as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should call updateUserPassword with correct parameters', async () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { id: '123', email: 'user@example.com', _id: '123' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (UserService.updateUserPassword as jest.Mock).mockResolvedValue(true);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(UserService.updateUserPassword).toHaveBeenCalledWith('123', 'newPassword123');
  });

  it('should return 400 when token is missing', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ password: 'newPassword123' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when password is missing', async () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when token is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', password: 'newPassword123' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when token is expired', async () => {
    const expiredToken = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '-1h' });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: expiredToken, password: 'newPassword123' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when user not found', async () => {
    const token = jwt.sign({ userId: '999' }, JWT_SECRET, { expiresIn: '1h' });

    (UserService.getUserById as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should use _id field when id is not available', async () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { _id: '123', email: 'user@example.com' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (UserService.updateUserPassword as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(response.status).toBe(200);
    expect(UserService.updateUserPassword).toHaveBeenCalledWith('123', 'newPassword123');
  });

  it('should return 400 when token does not contain userId', async () => {
    const token = jwt.sign({}, JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('userId');
  });

  it('should return 500 when user data has no id field', async () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { email: 'user@example.com' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  it('should use userId from payload when available', async () => {
    const token = jwt.sign({ userId: '456' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { id: '456', email: 'user@example.com' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (UserService.updateUserPassword as jest.Mock).mockResolvedValue(true);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(UserService.getUserById).toHaveBeenCalledWith('456');
  });

  it('should use sub from payload when userId is not available', async () => {
    const token = jwt.sign({ sub: '789' }, JWT_SECRET, { expiresIn: '1h' });
    const mockUser = {
      success: true,
      data: { id: '789', email: 'user@example.com' }
    };

    (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (UserService.updateUserPassword as jest.Mock).mockResolvedValue(true);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newPassword123' });

    expect(UserService.getUserById).toHaveBeenCalledWith('789');
  });
});
