import MongoSingleton from "../../../infrastructure/database/mongo";
import { MongoClient, Db, Collection } from "mongodb";

jest.mock("mongodb", () => {
  const createIndex = jest.fn().mockResolvedValue(undefined);
  const collection = jest.fn().mockImplementation((name: string) => ({
    createIndex,
    name,
  } as unknown as Collection));
  const db = {
    collection,
  } as unknown as Db;
  const connect = jest.fn().mockResolvedValue(undefined);
  const close = jest.fn().mockResolvedValue(undefined);
  const client = {
    connect,
    close,
    db: jest.fn().mockImplementation((dbName: string) => db),
  } as unknown as MongoClient;
  return {
    MongoClient: jest.fn().mockImplementation(() => client),
  };
});

describe("MongoSingleton", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("throws when URI not provided", async () => {
    delete process.env.MONGO_URI;
    delete process.env.MONGO_URL;
    await expect(MongoSingleton.connect()).rejects.toThrow("MONGO_URI not provided");
  });

  test("connects and derives dbName from URI path", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/mydb";
    // Cerrar cualquier conexión previa
    await MongoSingleton.close();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const db = await MongoSingleton.connect();
    expect(db).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith("🟢 MongoDB connected to", "mydb");
    logSpy.mockRestore();
  });

  test("falls back to default dbName when URL parsing fails", async () => {
    // invalid URL triggers catch branch; uses env or default orders_db
    process.env.MONGO_URI = "mongodb://localhost"; // no pathname, uses env/default dbName
    process.env.MONGO_DB = "customdb";
    // close previous connection if any
    await MongoSingleton.close();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const db = await MongoSingleton.connect();
    expect(db).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith("🟢 MongoDB connected to", "customdb");
    logSpy.mockRestore();
  });

  test("reuses existing db on subsequent connect calls", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/anotherdb";
    await MongoSingleton.close();
    const first = await MongoSingleton.connect();
    const second = await MongoSingleton.connect();
    expect(second).toBe(first);
  });

  test("close resets client and db, allowing reconnect", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/reconnectdb";
    await MongoSingleton.connect();
    await MongoSingleton.close();
    const second = await MongoSingleton.connect();
    expect(second).toBeDefined();
  });

  test("getDb returns current db instance", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
    await MongoSingleton.close();
    const db = await MongoSingleton.connect();
    const retrieved = MongoSingleton.getDb();
    expect(retrieved).toBe(db);
  });

  test("getDb returns null when not connected", async () => {
    await MongoSingleton.close();
    const retrieved = MongoSingleton.getDb();
    expect(retrieved).toBeNull();
  });
});
