import { z } from 'zod';
import { ROLES, MODULE_KEYS } from '../../constants/index.js';

const moduleKey = z.enum(Object.values(MODULE_KEYS));

/**
 * Roles a caller may create. SUPER_ADMIN is absent on purpose: minting another
 * global operator is not a routine management action, and allowing it here would
 * make the endpoint the easiest path to full platform control.
 */
export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(10, 'Use at least 10 characters').max(200),
  role: z.enum([ROLES.AGENT, ROLES.ADMIN]),
  moduleScope: z.array(moduleKey).min(1, 'A scoped role needs at least one module'),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    isActive: z.boolean().optional(),
    moduleScope: z.array(moduleKey).min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const listUsersSchema = z.object({
  role: z.enum([ROLES.AGENT, ROLES.ADMIN, ROLES.SUPER_ADMIN]).optional(),
  moduleKey: moduleKey.optional(),
});

export const createServiceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, 'Use letters, digits and dashes'),
  moduleKey,
  label: z.string().trim().min(3).max(160),
  description: z.string().trim().max(500).optional(),
  partner: z.string().trim().max(120).optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
  // XOF has no decimals — an integer, and never negative.
  fee: z.number().int().min(0),
  processingDays: z.number().int().min(1).max(365),
});

export const updateServiceSchema = z
  .object({
    label: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(500).optional(),
    partner: z.string().trim().max(120).optional(),
    requiredDocuments: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
    fee: z.number().int().min(0).optional(),
    processingDays: z.number().int().min(1).max(365).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// `moduleKey` is deliberately absent from the update schema: moving a service
// between modules would move it out of the admin's own scope in one call.
