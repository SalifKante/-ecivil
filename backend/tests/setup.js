import { beforeAll, afterAll } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';

// A dedicated database — tests must never touch the dev data.
const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/ecivil_test';

beforeAll(async () => {
  await connectDatabase(TEST_URI);
});

afterAll(async () => {
  await disconnectDatabase();
});
