import { Router } from 'express';
import * as controller from './services.controller.js';
import { validate } from '../../middleware/validate.js';
import { listServicesQuerySchema } from './services.schema.js';

// The catalog is public: citizens browse services and tariffs before logging in.
const router = Router();

router.get('/services/modules', controller.listModules);
router.get('/services', validate(listServicesQuerySchema, 'query'), controller.listServices);
router.get('/services/:code', controller.getService);

export default router;
