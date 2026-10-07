import { Router } from 'express';
import * as pnrController from './pnr.controller.js';
import { convertPnrSchema } from './pnr.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize, blockViewerWrites } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.AGENT, ROLES.VIEWER));

router.post(
  '/convert',
  blockViewerWrites,
  validate(convertPnrSchema),
  pnrController.convert
);

export default router;
