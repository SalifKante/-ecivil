import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    // Shared database: parallel files would race on the same collections.
    fileParallelism: false,
    // NODE_ENV/JWT/Mongo are overridden for isolation. MinIO credentials are NOT
    // set here, so they load from backend/.env (dotenv) and point at the real
    // local MinIO — the storage integration is genuinely exercised, not stubbed.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-that-is-definitely-long-enough-32',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ecivil_test',
    },
  },
});
