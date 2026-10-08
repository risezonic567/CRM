import { Router } from 'express';
import * as inquiryController from './inquiry.controller.js';
import {
  sendInquirySchema,
  closeInquirySchema,
  saveDraftSchema,
  listInquiriesQuerySchema,
  lookupQuerySchema,
} from './inquiry.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize, blockViewerWrites } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.AGENT, ROLES.VIEWER));
router.use(blockViewerWrites);

router.get('/', validate(listInquiriesQuerySchema, 'query'), inquiryController.list);
router.get('/lookup', validate(lookupQuerySchema, 'query'), inquiryController.lookup);
router.get('/stats/margin', inquiryController.marginStats);
router.get('/:id/confirmation-receipt', inquiryController.downloadConfirmationReceipt);
router.get('/:id/support-document', inquiryController.downloadSupportDocument);
router.get('/:id', inquiryController.getById);
router.patch('/:id/draft', validate(saveDraftSchema), inquiryController.saveDraft);
router.post('/:id/send', validate(sendInquirySchema), inquiryController.send);
router.post('/:id/close', validate(closeInquirySchema), inquiryController.close);
router.post('/:id/resend-confirmation', inquiryController.resendConfirmation);
router.delete('/:id', inquiryController.remove);

export default router;
