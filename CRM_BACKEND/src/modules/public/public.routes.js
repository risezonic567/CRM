import { Router } from 'express';
import express from 'express';
import * as publicController from './public.controller.js';
import { publicRateLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

router.use(publicRateLimiter);
router.use(express.urlencoded({ extended: true }));

router.get('/confirm/:inquiryId', publicController.showConfirm);
router.post('/confirm/:inquiryId', publicController.submitConfirm);

export default router;
