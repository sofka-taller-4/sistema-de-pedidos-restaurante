import { Request, Response, NextFunction } from 'express';
import { verifyJWT, requireRole } from '../../src/middlewares/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

describe('Auth Middleware - Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

 describe('verifyJWT', () => {
  it('should return 401 when no cookie is present', () => {
    // Mock request sin cookies ni header Authorization
    const req: any = { cookies: undefined, headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    verifyJWT(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

    it('should return 401 when cookies object is undefined', () => {
      mockReq.cookies = undefined;

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      mockReq.cookies = { accessToken: 'invalid-token' };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );
      mockReq.cookies = { accessToken: expiredToken };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() when token is valid', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { accessToken: validToken };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe('123');
      expect(mockReq.user?.email).toBe('test@example.com');
      expect(mockReq.user?.roles).toEqual(['admin']);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle empty accessToken cookie', () => {
      mockReq.cookies = { accessToken: '' };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set empty roles array when roles not in token', () => {
      const tokenWithoutRoles = jwt.sign(
        { sub: '456', email: 'noroles@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { accessToken: tokenWithoutRoles };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.roles).toEqual([]);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple roles in token', () => {
      const multiRoleToken = jwt.sign(
        { sub: '789', email: 'multi@example.com', roles: ['admin', 'waiter'] },     
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { accessToken: multiRoleToken };

      verifyJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.roles).toEqual(['admin', 'waiter']);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 when req.user is not set', () => {
      const middleware = requireRole('admin');
      mockReq.user = undefined;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required role', () => {
      const middleware = requireRole('admin');
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['waiter'],
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required role', () => {
      const middleware = requireRole('admin');
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['admin'],
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should work with multiple roles', () => {
      const middleware = requireRole('waiter');
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['admin', 'waiter'],
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty roles array', () => {
      const middleware = requireRole('admin');
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: [],
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration: verifyJWT + requireRole', () => {
    it('should work together in middleware chain', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'admin@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { accessToken: validToken };

      // First middleware: verifyJWT
      verifyJWT(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();

      // Reset mockNext
      mockNext.mockClear();

      // Second middleware: requireRole
      const roleMiddleware = requireRole('admin');
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail at requireRole when user lacks permission', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'waiter@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { accessToken: validToken };

      // First middleware: verifyJWT
      verifyJWT(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Reset mocks
      mockNext.mockClear();
      (mockRes.status as jest.Mock).mockClear();
      (mockRes.json as jest.Mock).mockClear();

      // Second middleware: requireRole
      const roleMiddleware = requireRole('admin');
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
