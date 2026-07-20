import { Router } from 'express';
import * as controller from './request.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { createRequestSchema, updateRequestSchema } from './request.schema.js';
import { singleFile } from '../../middleware/upload.js';
import { ROLES } from '../../constants/index.js';

// All request routes are citizen-owned. Ownership is re-checked in the service layer.
const router = Router();

router.use(requireAuth, requireRole(ROLES.CITIZEN));

router.get('/requests', controller.list);
router.post('/requests', validate(createRequestSchema), controller.create);
router.get('/requests/:id', controller.getOne);
router.patch('/requests/:id', validate(updateRequestSchema), controller.update);
router.post('/requests/:id/submit', controller.submit);

router.post('/requests/:id/attachments', singleFile('file'), controller.addAttachment);
router.get('/requests/:id/attachments/:attachmentId/url', controller.getAttachmentUrl);
router.delete('/requests/:id/attachments/:attachmentId', controller.removeAttachment);

export default router;
