import { Router } from 'express';
import * as dashboardController from './dashboard.controller.js';
import { dashboardSummaryQuerySchema } from './dashboard.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.AGENT, ROLES.VIEWER));

router.get(
  '/summary',
  validate(dashboardSummaryQuerySchema, 'query'),
  dashboardController.summary
);

export default router;
