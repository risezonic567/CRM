import { Router } from 'express';
import * as callController from './call.controller.js';
import {
  createCallSchema,
  listCallsQuerySchema,
  addCallNoteSchema,
  recordCallPricingSchema,
} from './call.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize, blockViewerWrites } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.AGENT, ROLES.VIEWER));
router.use(blockViewerWrites);

router.get('/', validate(listCallsQuerySchema, 'query'), callController.list);
router.post('/', validate(createCallSchema), callController.create);
router.post(
  '/:id/notes',
  validate(addCallNoteSchema),
  callController.addNote
);
router.post(
  '/:id/pricing',
  validate(recordCallPricingSchema),
  callController.recordPricing
);
router.get('/:id', callController.getById);

export default router;
