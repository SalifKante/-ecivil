import { z } from 'zod';
import { MODULE_KEYS } from '../../constants/index.js';

export const listServicesQuerySchema = z.object({
  moduleKey: z.enum(Object.values(MODULE_KEYS)).optional(),
});
