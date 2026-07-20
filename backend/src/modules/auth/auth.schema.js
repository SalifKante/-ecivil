import { z } from 'zod';
import { NINA_REGEX } from '../../constants/index.js';

const nina = z
  .string()
  .trim()
  .regex(NINA_REGEX, 'NINA must be exactly 14 digits');

export const requestOtpSchema = z.object({ nina });

export const verifyOtpSchema = z.object({
  nina,
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
});
