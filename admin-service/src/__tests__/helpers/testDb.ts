
// Aumentar el timeout de arranque de MongoMemoryServer y activar debug
process.env.MONGOMS_START_TIMEOUT = '60000';
process.env.DEBUG = 'mongodb-memory-server*';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let db: Db;

export async function setupTestDatabase(): Promise<Db> {
  // Forzar versión compatible de MongoDB en memoria
  console.log('Iniciando MongoMemoryServer...');
  try {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '4.2.0' } });
    console.log('MongoMemoryServer iniciado');
    const uri = await mongoServer.getUri();
    console.log('URI obtenida:', uri);
    client = new MongoClient(uri);
    await client.connect();
    console.log('MongoClient conectado');
    db = client.db('test-admin-db');
    return db;
  } catch (err) {
    console.error('Error iniciando MongoMemoryServer:', err);
    throw err;
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export async function clearDatabase(): Promise<void> {
  if (db) {
    const collections = await db.collections();
    await Promise.all(collections.map(c => c.deleteMany({})));
  }
}

export function getTestDb(): Db {
  return db;
}
