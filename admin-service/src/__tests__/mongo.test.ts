import { connectMongo, getDb } from '../storage/mongo';
import { MongoClient, Db, Collection } from 'mongodb';

jest.mock('mongodb');

describe('mongo.ts', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('connectMongo', () => {
    it('should connect and return a Db instance', async () => {
      const createIndexMock = jest.fn().mockResolvedValue(undefined);
      const collectionMock = jest.fn().mockReturnValue({
        createIndex: createIndexMock,
      } as unknown as Collection);

      const dbMock = {
        collection: collectionMock,
        databaseName: 'test-db',
        client: {},
      } as unknown as Db;

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const clientMock = {
        connect: connectMock,
        db: jest.fn().mockReturnValue(dbMock),
      } as unknown as MongoClient;

      (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(
        () => clientMock
      );

      process.env.MONGO_URI = 'mongodb://localhost:27017/test-db';
      process.env.MONGO_DB = 'test-db';

      const db = await connectMongo();

      expect(db).toBeDefined();
      expect(db.databaseName).toBe('test-db');
      expect(connectMock).toHaveBeenCalled();
    });


  });

  describe('getDb', () => {
    it('should return db after connection', async () => {
      const createIndexMock = jest.fn().mockResolvedValue(undefined);
      const collectionMock = jest.fn().mockReturnValue({
        createIndex: createIndexMock,
      } as unknown as Collection);

      const dbMock = {
        collection: collectionMock,
        databaseName: 'test-db',
        client: {},
      } as unknown as Db;

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const clientMock = {
        connect: connectMock,
        db: jest.fn().mockReturnValue(dbMock),
      } as unknown as MongoClient;

      (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(
        () => clientMock
      );

      process.env.MONGO_URI = 'mongodb://localhost:27017/test-db';

      await connectMongo();
      const db = getDb();

      expect(db).toBeDefined();
    });

    it('should return same instance on multiple calls', async () => {
      const createIndexMock = jest.fn().mockResolvedValue(undefined);
      const collectionMock = jest.fn().mockReturnValue({
        createIndex: createIndexMock,
      } as unknown as Collection);

      const dbMock = {
        collection: collectionMock,
        databaseName: 'test-db',
        client: {},
      } as unknown as Db;

      const connectMock = jest.fn().mockResolvedValue(undefined);
      const clientMock = {
        connect: connectMock,
        db: jest.fn().mockReturnValue(dbMock),
      } as unknown as MongoClient;

      (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(
        () => clientMock
      );

      process.env.MONGO_URI = 'mongodb://localhost:27017/test-db';

      await connectMongo();
      const db1 = getDb();
      const db2 = getDb();

      expect(db1).toBe(db2);
    });
  });
});
