import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi.js';

const router = Router();

// Raw spec, handy for client generation or importing into Postman/Insomnia.
router.get('/api/docs.json', (req, res) => res.json(openapiSpec));

router.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'eCivil API — Documentation',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
  }),
);

export default router;
