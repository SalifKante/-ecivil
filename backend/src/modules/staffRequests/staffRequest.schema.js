import { z } from 'zod';
import { REQUEST_STATUS, MODULE_KEYS } from '../../constants/index.js';

export const listRequestsSchema = z.object({
  status: z.enum(Object.values(REQUEST_STATUS)).optional(),
  moduleKey: z.enum(Object.values(MODULE_KEYS)).optional(),
  // Reference lookup, e.g. ECV-2026-000042.
  q: z.string().trim().max(40).optional(),
  assigned: z.enum(['me', 'unassigned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Capped: an unbounded limit is a denial-of-service lever on a shared database.
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** A rejection must say why — the citizen sees this reason. */
export const rejectSchema = z.object({
  reason: z.string().trim().min(10, 'Give the citizen a usable reason').max(500),
});

/** Asking for more information must say what is missing. */
export const requestInfoSchema = z.object({
  note: z.string().trim().min(10, 'Say precisely what is missing').max(500),
});

export const approveSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
