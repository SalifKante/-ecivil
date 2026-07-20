import { Router } from 'express';
import * as controller from './staffRequest.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireStaff } from '../../middleware/rbac.js';
import {
  listRequestsSchema,
  rejectSchema,
  requestInfoSchema,
  approveSchema,
} from './staffRequest.schema.js';

/**
 * Back-office request review. Every route is staff-only; module scoping is
 * re-checked per request in the service layer, never inferred from the UI.
 *
 * Mounted under /api/v1/staff, so the pathless guard below applies to these routes
 * only. Mounting it on the bare /api/v1 would run requireStaff against every API
 * call that reached this router and 403 legitimate citizen traffic.
 */
const router = Router();

router.use(requireAuth, requireStaff);

router.get('/requests', validate(listRequestsSchema, 'query'), controller.list);
router.get('/requests/:id', controller.getOne);
router.get('/requests/:id/attachments/:attachmentId/url', controller.getAttachmentUrl);

router.post('/requests/:id/assign', controller.assign);
router.post('/requests/:id/approve', validate(approveSchema), controller.approve);
router.post('/requests/:id/reject', validate(rejectSchema), controller.reject);
router.post('/requests/:id/request-info', validate(requestInfoSchema), controller.requestInfo);

export default router;
