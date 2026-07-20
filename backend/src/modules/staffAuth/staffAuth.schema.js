import { z } from 'zod';

export const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  // No max-length ceiling below the hash's capacity, and no composition rules here:
  // credential policy belongs to account creation, not to the login check.
  password: z.string().min(1, 'Password is required').max(200),
});
