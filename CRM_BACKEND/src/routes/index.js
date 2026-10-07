import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import callRoutes from '../modules/call/call.routes.js';
import inquiryRoutes from '../modules/inquiry/inquiry.routes.js';
import pnrRoutes from '../modules/pnr/pnr.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { service: 'crm-backend' } });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/calls', callRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/pnr', pnrRoutes);

export default router;
