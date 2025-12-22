import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; roles: string[] };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  // Try to get token from Authorization header first, then from cookies
  let token = req.cookies?.accessToken;
  
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles || [] };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
  };
}
