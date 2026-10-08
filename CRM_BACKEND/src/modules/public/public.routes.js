import { Router } from 'express';
import express from 'express';
import * as publicController from './public.controller.js';
import { publicRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { optionalSupportDocumentUpload } from '../../middlewares/authorizeUpload.middleware.js';

const router = Router();

router.use(publicRateLimiter);
router.use(express.urlencoded({ extended: true }));

router.get('/confirm/:inquiryId', publicController.showConfirm);
router.post(
  '/confirm/:inquiryId',
  (req, res, next) => {
    optionalSupportDocumentUpload(req, res, (err) => {
      if (err) {
        // Multer / fileFilter errors → friendly HTML via controller helper
        err.statusCode = err.statusCode || err.status || 400;
        err.isOperational = true;
        return publicController.renderConfirmError(req, res, next, err);
      }
      return next();
    });
  },
  publicController.submitConfirm
);

export default router;
