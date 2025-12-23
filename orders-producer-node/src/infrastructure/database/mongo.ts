import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

class MongoSingleton {
  private static instance: MongoSingleton | null = null;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): MongoSingleton {
    MongoSingleton.instance ??= new MongoSingleton();
    return MongoSingleton.instance;
  }

  private getUri(): string {
    // Leer URI de forma lazy para permitir que scripts la establezcan antes de conectar
    const uri = process.env.MONGO_URI || process.env.MONGO_URL || "";
    return uri;
  }

  async connect(): Promise<Db> {
    if (this.db) return this.db;

    const uri = this.getUri();
    if (!uri) throw new Error("MONGO_URI not provided");

    // Extraer nombre de base de datos de la URI si está presente
    // Formato: mongodb://host:port/database_name
    let dbName = process.env.MONGO_DB || "orders_db";

    try {
      const url = new URL(uri);
      // Si la URI tiene pathname (nombre de BD), usarlo
      if (url.pathname && url.pathname.length > 1) {
        dbName = url.pathname.substring(1); // Remover el "/" inicial
      }
    } catch (e) {
      // Si la URI no es válida como URL, usar el valor por defecto
    }

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(dbName);

    // ensure orders collection index
    await this.db.collection("orders").createIndex({ id: 1 }, { unique: true, background: true });
    await this.db.collection("orders").createIndex({ createdAt: -1 });
    await this.db.collection("orders").createIndex({ status: 1 });

    // ensure preparation_times collection index
    await this.db.collection("preparation_times").createIndex(
      { productName: 1 },
      { unique: true, background: true }
    );
    await this.db.collection("preparation_times").createIndex({ enabled: 1 });

    // ensure products collection index
    await this.db.collection("products").createIndex(
      { id: 1 },
      { unique: true, background: true }
    );
    await this.db.collection("products").createIndex({ name: 1 }, { unique: true, background: true });
    await this.db.collection("products").createIndex({ enabled: 1 });

    console.log("🟢 MongoDB connected to", dbName);
    return this.db;
  }

  getDb(): Db | null {
    return this.db;
  }

  async close(): Promise<void> {
    if (this.client) await this.client.close();
    this.client = null;
    this.db = null;
  }
}

export default MongoSingleton.getInstance();
