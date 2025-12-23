import { Router } from 'express';
import { getDb } from '../../../storage/mongo';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { decryptPassword, isEncryptedPassword, secureLog } from '../../../utils/security';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-local';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

// ✅ Esquema actualizado para manejar contraseñas encriptadas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1), // Mínimo 1 para permitir contraseñas encriptadas
  _encrypted: z.boolean().optional() // Indica si la contraseña está encriptada
});

// Validación explícita para password faltante
authRouter.post('/login', async (req, res, next) => {
  if (typeof req.body.password === 'undefined') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }
  next();
});
authRouter.post('/login', async (req, res) => {
  console.log('🔍 Login request received from:', req.headers.origin || req.headers.referer);
  console.log('🔍 Raw login request body:', {
    email: req.body.email,
    passwordLength: req.body.password?.length,
    encrypted: req.body._encrypted,
    passwordPrefix: req.body.password?.substring(0, 10) + '...'
  });

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    // Evitar loguear .value que puede no existir
    console.log('❌ Schema validation failed:', parsed.error.toString());
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  let { email, password, _encrypted } = parsed.data;

  // ✅ Desencriptar contraseña si viene encriptada
  if (_encrypted && isEncryptedPassword(password)) {
    try {
      console.log('🔓 Decrypting password...');
      password = decryptPassword(password);
      console.log('✅ Password decrypted successfully, length:', password.length);
      secureLog.info('🔐 Login attempt for encrypted password:', { email, encrypted: true });
    } catch (error) {
      console.error('❌ Failed to decrypt password:', error);
      secureLog.error('❌ Failed to decrypt password:', error);
      return res.status(400).json({ success: false, message: 'Invalid password format' });
    }
  } else {
    console.log('🔐 Using plain password, length:', password.length);
    secureLog.info('🔐 Login attempt for plain password:', { email, encrypted: false });
  }
  const db = getDb();
  const user = await db.collection('users').findOne({ email });
  console.log('👤 User lookup result:', {
    found: !!user,
    active: user?.active,
    email: user?.email,
    hasPasswordHash: !!user?.passwordHash
  });

  if (!user || !user.active) {
    console.log('❌ User not found or inactive');
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  console.log('🔍 Comparing passwords...');
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log('🔍 Password comparison result:', ok);

  if (!ok) {
    console.log('❌ Password comparison failed');
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  console.log('🔐 Generando tokens:', { JWT_SECRET_LENGTH: JWT_SECRET.length, JWT_REFRESH_SECRET_LENGTH: JWT_REFRESH_SECRET.length });

  // ✅ Access token (corta duración)
  const accessToken = jwt.sign(
    { sub: String(user._id), email: user.email, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // ✅ Refresh token (larga duración)
  const refreshToken = jwt.sign(
    { sub: String(user._id), type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // ✅ Guardar refresh token en BD
  await db.collection('refresh_tokens').insertOne({
    userId: String(user._id),
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    createdAt: new Date()
  });

  // ✅ Enviar ambos tokens en cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // ✅ Cambiar de 'strict' a 'lax' para permitir cross-site
    maxAge: 15 * 60 * 1000 // 15 minutos
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // ✅ Cambiar de 'strict' a 'lax' para permitir cross-site
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/admin/auth/refresh' // Solo accesible en este endpoint
  });

  // ✅ NO enviar tokens en body
  const response = {
    success: true,
    user: { id: user._id, name: user.name, email: user.email, roles: user.roles }
  };

  console.log('📤 Sending login response:', response);
  return res.json(response);
});

// ✅ Endpoint de refresh
authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token' });
  }

  try {
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return res.status(403).json({ success: false, message: 'Invalid token type' });
    }

    // Verificar que existe en BD (no revocado)
    const db = getDb();
    const tokenDoc = await db.collection('refresh_tokens').findOne({
      userId: decoded.sub,
      token: refreshToken
    });

    if (!tokenDoc) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    // Verificar que el usuario sigue activo
    const user = await db.collection('users').findOne({ _id: decoded.sub });
    if (!user || !user.active) {
      // Revocar token si usuario está deshabilitado
      await db.collection('refresh_tokens').deleteMany({ userId: decoded.sub });
      return res.status(403).json({ success: false, message: 'User disabled' });
    }

    // Generar nuevo access token
    const newAccessToken = jwt.sign(
      { sub: decoded.sub, email: user.email, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Enviar nuevo access token
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // ✅ Cambiar de 'strict' a 'lax' para permitir cross-site
      maxAge: 15 * 60 * 1000
    });

    console.log('🔄 Token refreshed for user:', decoded.sub);
    return res.json({ success: true });

  } catch (error) {
    console.error('❌ Refresh token error:', (error as Error).message);
    return res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ✅ Endpoint de logout
authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  // Revocar refresh token si existe
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const db = getDb();
      await db.collection('refresh_tokens').deleteMany({
        userId: decoded.sub,
        token: refreshToken
      });
    } catch (error) {
      console.warn('⚠️ Error revoking refresh token on logout:', (error as Error).message);
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/admin/auth/refresh' });
  return res.json({ success: true, message: 'Logged out successfully' });
});
