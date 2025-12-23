import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';

export const createAdminToken = (secret: string) => {
  return jwt.sign(
    { sub: '123', email: 'admin@example.com', roles: ['admin'] },
    secret,
    { expiresIn: '1h' }
  );
};
