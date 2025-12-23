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
    
    // ✅ ESPERAR que MongoDB procese las eliminaciones
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function getTestDb(): Db {
  return db;
}