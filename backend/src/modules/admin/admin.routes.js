import { Router } from 'express';
import * as controller from './admin.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireStaffRole } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/index.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  createServiceSchema,
  updateServiceSchema,
} from './admin.schema.js';

/**
 * Module-admin and super-admin management.
 *
 * AGENTs are excluded at the door: working requests is not running a module. What
 * each of the two remaining tiers may actually reach is decided per call in the
 * service layer, where the target's role and scope are known.
 *
 * Mounted under /api/v1/staff — the pathless guard below applies to these routes
 * only, never to the wider API.
 */
const router = Router();

router.use(requireAuth, requireStaffRole(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/admin/stats', controller.getStats);

router.get('/admin/users', validate(listUsersSchema, 'query'), controller.listUsers);
router.post('/admin/users', validate(createUserSchema), controller.createUser);
router.patch('/admin/users/:id', validate(updateUserSchema), controller.updateUser);

router.get('/admin/services', controller.listServices);
router.post('/admin/services', validate(createServiceSchema), controller.createService);
router.patch('/admin/services/:id', validate(updateServiceSchema), controller.updateService);

export default router;
