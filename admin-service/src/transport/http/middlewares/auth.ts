import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '../../../domain/models';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; roles: Role[] };
    }
  }
}


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token && token.trim() !== '' ? token : null;
  }
  return null;
}

function buildUserFromPayload(payload: any): { id: string; email: string; roles: Role[] } {
  return {
    id: payload.sub,
    email: payload.email,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = buildUserFromPayload(payload);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}
