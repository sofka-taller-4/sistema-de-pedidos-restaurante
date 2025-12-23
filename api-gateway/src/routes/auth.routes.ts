import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/emailService';
import { getUserByEmail, getUserById, updateUserPassword } from '../services/UserService';
import { passwordResetTemplate } from '../utils/emailTemplates';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Extrae el ID del usuario desde diferentes posibles campos
 */
function extractUserId(userData: any): string | null {
  return userData?.id || userData?._id || userData?.userId || null;
}

/**
 * POST /api/auth/forgot-password
 * Envía un email con instrucciones para recuperar la contraseña
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || !email.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'El correo electrónico es requerido.' 
    });
  }
  
  const user = await getUserByEmail(email);
  
  if (!user || !user.success || !user.data) {
    return res.status(404).json({ 
      success: false, 
      message: 'No existe un usuario registrado con ese correo electrónico.' 
    });
  }
  
  const userId = extractUserId(user.data);
  if (!userId) {
    return res.status(500).json({ 
      success: false, 
      message: 'No se pudo generar el token de recuperación.' 
    });
  }
  
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Recupera tu contraseña',
    html: passwordResetTemplate(resetLink)
  });
  
  res.json({ 
    success: true,
    message: 'Se ha enviado un correo con las instrucciones para recuperar tu contraseña.'
  });
});

/**
 * POST /api/auth/reset-password
 * Actualiza la contraseña del usuario usando un token válido
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Token y contraseña requeridos.' 
    });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload.userId || payload.sub || payload.id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido: no contiene userId.' 
      });
    }
    
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado.' 
      });
    }
    
    const idToUse = extractUserId(user.data);
    if (!idToUse) {
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo procesar la solicitud.' 
      });
    }
    await updateUserPassword(idToUse, password);
    
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('Error resetting password:', err);
    return res.status(400).json({ 
      success: false, 
      message: 'Token inválido o expirado.' 
    });
  }
});

export default router;
