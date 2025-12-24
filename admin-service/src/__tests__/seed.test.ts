import { ensureDefaultAdmin } from '../startup/seed';
import { getTestDb, setupTestDatabase, teardownTestDatabase, clearDatabase } from './helpers/testDb';
import bcrypt from 'bcryptjs';

// Mock storage/mongo para usar la base de test
jest.mock('../storage/mongo', () => ({
  getDb: () => require('./helpers/testDb').getTestDb()
}));

describe('ensureDefaultAdmin', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  afterAll(async () => {
    await teardownTestDatabase();
  });
  beforeEach(async () => {
    await clearDatabase();
    process.env.DEFAULT_ADMIN_EMAIL = 'admin@test.com';
    process.env.DEFAULT_ADMIN_NAME = 'Admin';
    process.env.DEFAULT_ADMIN_PASSWORD = 'adminpass';
  });

  it('should create admin user if not exists', async () => {
    await ensureDefaultAdmin();
    const db = getTestDb();
    const user = await db.collection('users').findOne({ email: 'admin@test.com' });
    expect(user).toBeTruthy();
    expect(user?.name).toBe('Admin');
    expect(user?.roles).toContain('admin');
    const isMatch = await bcrypt.compare('adminpass', user?.passwordHash);
    expect(isMatch).toBe(true);
  });

  it('should not create admin if already exists', async () => {
    const db = getTestDb();
    await db.collection('users').insertOne({
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash: await bcrypt.hash('adminpass', 10),
      roles: ['admin'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await ensureDefaultAdmin();
    const users = await db.collection('users').find({ email: 'admin@test.com' }).toArray();
    expect(users.length).toBe(1);
  });
});
