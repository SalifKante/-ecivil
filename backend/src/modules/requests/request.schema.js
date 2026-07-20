import { z } from 'zod';
import { DELIVERY_MODES } from '../../constants/index.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

// formData is service-specific and free-form at this stage; validated per service later.
const formData = z.record(z.string(), z.unknown()).optional();

const delivery = z
  .object({
    mode: z.enum(Object.values(DELIVERY_MODES)),
    address: z.string().trim().max(300).optional(),
    pickupPoint: z.string().trim().max(120).optional(),
  })
  .optional();

export const createRequestSchema = z.object({
  serviceId: objectId,
  formData,
});

export const updateRequestSchema = z
  .object({ formData, delivery })
  .refine((v) => v.formData || v.delivery, 'Nothing to update');
