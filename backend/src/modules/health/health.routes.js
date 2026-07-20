import { Router } from 'express';
import { isDatabaseConnected } from '../../config/db.js';
import { isStorageHealthy } from '../../adapters/storage.js';
import { env } from '../../config/env.js';

const router = Router();

/** Liveness + dependency check. Public, unauthenticated. */
router.get('/health', async (req, res) => {
  const [dbConnected, storageUp] = await Promise.all([
    Promise.resolve(isDatabaseConnected()),
    isStorageHealthy(),
  ]);

  const healthy = dbConnected && storageUp;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'ecivil-api',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    dependencies: {
      mongodb: dbConnected ? 'up' : 'down',
      storage: storageUp ? 'up' : 'down',
    },
  });
});

export default router;
