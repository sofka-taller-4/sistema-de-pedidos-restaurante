import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../../transport/http/middlewares/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {} as Record<string, any>
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('requireAuth', () => {
    it('should return 401 when no authorization header is present', () => {
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic sometoken' };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() and set req.user when token is valid', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers = { authorization: `Bearer ${validToken}` };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.email).toBe('test@example.com');
      expect(mockReq.user?.roles).toEqual(['admin']);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix gracefully', () => {
      mockReq.headers = { authorization: 'sometoken' };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set empty roles array when roles not in token', () => {
      const tokenWithoutRoles = jwt.sign(
        { sub: '123', email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers = { authorization: `Bearer ${tokenWithoutRoles}` };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.roles).toEqual([]);
    });

    it('should handle multiple roles in token', () => {
      const multiRoleToken = jwt.sign(
        { sub: '123', email: 'test@example.com', roles: ['admin', 'waiter', 'cook'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers = { authorization: `Bearer ${multiRoleToken}` };
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 when req.user is not set', () => {
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['waiter']
      };
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required role', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['admin']
      };
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has multiple roles including required one', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['waiter', 'admin', 'cook']
      };
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should work for waiter role', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['waiter']
      };
      const middleware = requireRole('waiter');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should work for cook role', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: ['cook']
      };
      const middleware = requireRole('cook');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access when user has no roles', () => {
      mockReq.user = {
        id: '123',
        email: 'test@example.com',
        roles: []
      };
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration: requireAuth + requireRole', () => {
    it('should work together in middleware chain', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'admin@example.com', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers = { authorization: `Bearer ${validToken}` };
      // Primero requireAuth
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      // Reset mock
      mockNext = jest.fn();
      // Luego requireRole
      const roleMiddleware = requireRole('admin');
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should fail at requireRole when user lacks permission', () => {
      const validToken = jwt.sign(
        { sub: '123', email: 'waiter@example.com', roles: ['waiter'] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers = { authorization: `Bearer ${validToken}` };
      // Primero requireAuth (pasa)
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      // Reset mocks
      mockNext = jest.fn();
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn().mockReturnThis();
      // Luego requireRole (falla)
      const roleMiddleware = requireRole('admin');
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
