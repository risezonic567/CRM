import { Router } from 'express';
import * as usersController from './users.controller.js';
import { createUserSchema, updateUserSchema } from '../auth/auth.validation.js';
import { updateAgencySchema } from './users.validation.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/', usersController.list);
router.post('/', validate(createUserSchema), usersController.create);
router.get('/company', usersController.getCompany);
router.patch('/company', validate(updateAgencySchema), usersController.updateCompany);
router.get('/:id', usersController.getById);
router.patch('/:id', validate(updateUserSchema), usersController.update);
router.delete('/:id', usersController.remove);

export default router;
