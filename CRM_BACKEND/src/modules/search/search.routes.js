import { Router } from 'express';
import * as searchController from './search.controller.js';
import { airportSuggestQuerySchema } from './search.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.AGENT, ROLES.VIEWER));

// Airport autocomplete (GET — viewers allowed)
router.get(
  '/airports',
  validate(airportSuggestQuerySchema, 'query'),
  searchController.airports
);

export default router;
