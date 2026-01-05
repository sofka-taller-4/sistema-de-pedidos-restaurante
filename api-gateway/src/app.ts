import dotenv from 'dotenv';
dotenv.config();
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { corsConfig } from './middlewares/cors';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import ordersRoutes from './routes/orders.routes';
import kitchenRoutes from './routes/kitchen.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import { websocketProxy } from './routes/websocket.routes';

// Configura y retorna la aplicación Express
export function createApp(): Application {
  const app = express();

  // ✅ Configurar cookie-parser ANTES de las rutas
  app.use(cookieParser());
  
  // ✅ Sanitizar ANTES de procesar requests
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`⚠️ API Gateway - Sanitized malicious key: ${key} from ${req.ip}`);
    }
  }));

  // Middlewares globales
  app.use(corsConfig);
  app.use(express.json());
  app.use(requestLogger);

  // Rutas de la aplicación
  app.use('/api/orders', ordersRoutes);
  app.use('/api/kitchen', kitchenRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);

  // Proxy para WebSocket
  app.use('/api/ws', websocketProxy);

  // Manejo de errores (debe ir al final)
  app.use(errorHandler);

  return app;
}
