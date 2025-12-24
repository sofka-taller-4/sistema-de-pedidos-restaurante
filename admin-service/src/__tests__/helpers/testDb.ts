import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let db: Db;

export async function setupTestDatabase(): Promise<Db> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (mongoUri) {
      console.log('🔗 Usando MongoDB del servicio (CI)');
      client = new MongoClient(mongoUri);
      await client.connect();
      db = client.db('test-admin-db');
      return db;
    }
    
    console.log('🐇 Iniciando MongoMemoryServer (local)');
    mongoServer = await MongoMemoryServer.create({ 
      binary: { version: '6.0.13' }
    });
    
    const uri = await mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test-admin-db');
    return db;
    
  } catch (err) {
    console.error('❌ Error iniciando MongoDB:', err);
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
    
    // ✅ ESPERAR MUCHO MÁS para CI (aumentado drásticamente)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ✅ Helper para asegurar que las escrituras se completan (aumentado para CI)
export async function waitForMongo(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export function getTestDb(): Db {
  return db;
}