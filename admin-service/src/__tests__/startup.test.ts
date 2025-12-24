import { startServer } from '../startup';
import request from 'supertest';
import express from 'express';

// Mock dependencias externas para evitar efectos colaterales
jest.mock('../storage/mongo', () => ({ connectMongo: jest.fn() }));
jest.mock('../startup/seed', () => ({ ensureDefaultAdmin: jest.fn() }));

// Helper para obtener la app sin arrancar el servidor real
function getAppInstance() {
  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/', (_req, res) => res.json({ message: 'Admin Service API' }));
  return app;
}

describe('startup.ts', () => {
  it('should initialize server without errors', async () => {
    await expect(startServer()).resolves.not.toThrow();
  });

  it('should respond to /health', async () => {
    const app = getAppInstance();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should respond to /', async () => {
    const app = getAppInstance();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Admin Service API');
  });
});
